import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, requireBody } from '../core/http.js';
import { requireAuth, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const COL = {
  rates: 'currency_exchange_rates',
};

const DEFAULT_RATES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 1.00, isBase: true, updatedAt: new Date().toISOString() },
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 83.50, isBase: false, updatedAt: new Date().toISOString() },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 90.75, isBase: false, updatedAt: new Date().toISOString() },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 106.20, isBase: false, updatedAt: new Date().toISOString() },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 22.75, isBase: false, updatedAt: new Date().toISOString() },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 62.40, isBase: false, updatedAt: new Date().toISOString() },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 0.55, isBase: false, updatedAt: new Date().toISOString() },
];

router.use(requireAuth);

// GET /api/currencies — list all supported currencies & active exchange rates
router.get('/', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  let rows = await db.all(tid, COL.rates);

  if (rows.length === 0) {
    // Seed default rates
    for (const r of DEFAULT_RATES) {
      await db.insert(tid, COL.rates, { ...r, tenantId: tid });
    }
    rows = await db.all(tid, COL.rates);
  }

  res.json({
    baseCurrency: 'INR',
    currencies: rows.sort((a: any, b: any) => (a.code === 'INR' ? -1 : a.code.localeCompare(b.code))),
  });
}));

// POST /api/currencies/rates — update or set exchange rate
router.post('/rates', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['code', 'rate']);

  const { code, rate, name, symbol } = req.body;
  const currencyCode = String(code).toUpperCase().trim();
  const numericRate = Number(rate);

  if (numericRate <= 0) throw ApiError.badRequest('Exchange rate must be greater than zero');

  let rows = await db.all(tid, COL.rates);
  const existing = rows.find((r: any) => r.code === currencyCode);

  let result;
  if (existing) {
    result = await db.update(tid, COL.rates, existing.id, {
      rate: numericRate,
      name: name || existing.name,
      symbol: symbol || existing.symbol,
      updatedAt: new Date().toISOString(),
    });
  } else {
    result = await db.insert(tid, COL.rates, {
      code: currencyCode,
      name: name || currencyCode,
      symbol: symbol || currencyCode,
      rate: numericRate,
      isBase: currencyCode === 'INR',
      updatedAt: new Date().toISOString(),
    });
  }

  const a = actor(req);
  await recordAudit({
    tenantId: tid,
    actorId: a.id,
    actorName: a.name,
    action: 'update',
    module: 'currencies',
    recordRef: currencyCode,
    newState: { code: currencyCode, rate: numericRate },
    ip: req.ip,
  });

  res.json({
    currency: result,
    message: `Exchange rate for ${currencyCode} updated to ${numericRate}.`,
  });
}));

// POST /api/currencies/convert — convert amount between two currencies
router.post('/convert', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['from', 'to', 'amount']);

  const fromCode = String(req.body.from).toUpperCase().trim();
  const toCode = String(req.body.to).toUpperCase().trim();
  const amount = Number(req.body.amount);

  if (isNaN(amount) || amount < 0) throw ApiError.badRequest('Valid amount is required');

  const rows = await db.all(tid, COL.rates);
  const fromCurr = rows.find((r: any) => r.code === fromCode) || DEFAULT_RATES.find(r => r.code === fromCode);
  const toCurr = rows.find((r: any) => r.code === toCode) || DEFAULT_RATES.find(r => r.code === toCode);

  if (!fromCurr) throw ApiError.badRequest(`Unsupported currency '${fromCode}'`);
  if (!toCurr) throw ApiError.badRequest(`Unsupported currency '${toCode}'`);

  // Convert to base currency (INR) then to target currency
  const inBaseCurrency = amount * fromCurr.rate;
  const convertedAmount = Math.round((inBaseCurrency / toCurr.rate) * 100) / 100;
  const effectiveRate = Math.round((fromCurr.rate / toCurr.rate) * 10000) / 10000;

  res.json({
    from: fromCode,
    to: toCode,
    originalAmount: amount,
    convertedAmount,
    effectiveRate,
    baseCurrencyAmount: Math.round(inBaseCurrency * 100) / 100,
  });
}));

export const currenciesRouter = router;
