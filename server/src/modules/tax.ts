import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, requireBody, listResult } from '../core/http.js';
import { requireAuth, requireRole, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const COL = {
  schemes: 'tax_schemes',
  components: 'tax_components',
};

// Built-in tax scheme templates
const DEFAULT_SCHEMES = [
  {
    code: 'INDIA_GST',
    name: 'Indian GST',
    country: 'India',
    type: 'GST',
    description: 'Goods & Services Tax with CGST/SGST/IGST',
    isDefault: true,
    components: [
      { name: 'CGST', rate: 9, applicableTo: 'intrastate', description: 'Central GST (intrastate)' },
      { name: 'SGST', rate: 9, applicableTo: 'intrastate', description: 'State GST (intrastate)' },
      { name: 'IGST', rate: 18, applicableTo: 'interstate', description: 'Integrated GST (interstate/import)' },
    ],
  },
  {
    code: 'GCC_VAT',
    name: 'GCC 5% VAT',
    country: 'UAE/GCC',
    type: 'VAT',
    description: 'Gulf Cooperation Council standard VAT rate',
    isDefault: false,
    components: [
      { name: 'VAT', rate: 5, applicableTo: 'all', description: 'Standard GCC VAT 5%' },
    ],
  },
  {
    code: 'UK_VAT',
    name: 'UK VAT',
    country: 'United Kingdom',
    type: 'VAT',
    description: 'UK standard, reduced, and zero-rated VAT',
    isDefault: false,
    components: [
      { name: 'Standard Rate', rate: 20, applicableTo: 'standard', description: 'UK Standard VAT 20%' },
      { name: 'Reduced Rate', rate: 5, applicableTo: 'reduced', description: 'UK Reduced VAT 5% (fuel, children\'s car seats)' },
      { name: 'Zero Rate', rate: 0, applicableTo: 'zero', description: 'UK Zero-Rated (food, books, children\'s clothing)' },
    ],
  },
  {
    code: 'EU_VAT',
    name: 'EU VAT (Standard)',
    country: 'European Union',
    type: 'VAT',
    description: 'Generic EU VAT configuration',
    isDefault: false,
    components: [
      { name: 'Standard VAT', rate: 20, applicableTo: 'standard', description: 'Standard EU VAT (varies by country; default 20%)' },
      { name: 'Reduced VAT', rate: 10, applicableTo: 'reduced', description: 'Reduced EU VAT on essentials' },
    ],
  },
  {
    code: 'US_SALES_TAX',
    name: 'US Sales Tax',
    country: 'United States',
    type: 'SALES_TAX',
    description: 'US state and county-level sales tax',
    isDefault: false,
    components: [
      { name: 'State Tax', rate: 6.5, applicableTo: 'state', description: 'State-level sales tax (average ~6.5%)' },
      { name: 'County Tax', rate: 1.5, applicableTo: 'county', description: 'County/local surcharge (~1.5%)' },
    ],
  },
  {
    code: 'TAX_EXEMPT',
    name: 'Tax Exempt / Zero-Rated',
    country: 'Global',
    type: 'EXEMPT',
    description: 'Zero tax for exempt transactions (exports, charities, etc.)',
    isDefault: false,
    components: [
      { name: 'Exempt', rate: 0, applicableTo: 'all', description: 'Zero-rated / tax exempt' },
    ],
  },
];

router.use(requireAuth);

// GET /api/tax/schemes — list all tax schemes
router.get('/schemes', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  let schemes = await db.all(tid, COL.schemes);

  // Seed defaults if empty
  if (schemes.length === 0) {
    for (const s of DEFAULT_SCHEMES) {
      const { components, ...schemeData } = s;
      const scheme = await db.insert(tid, COL.schemes, {
        ...schemeData,
        active: true,
        createdAt: new Date().toISOString(),
      });
      for (const comp of components) {
        await db.insert(tid, COL.components, {
          ...comp,
          schemeId: scheme.id,
          schemeCode: scheme.code,
          active: true,
          createdAt: new Date().toISOString(),
        });
      }
    }
    schemes = await db.all(tid, COL.schemes);
  }

  // Attach components to each scheme
  const allComponents = await db.all(tid, COL.components);
  const enriched = schemes.map((s: any) => ({
    ...s,
    components: allComponents.filter((c: any) => c.schemeId === s.id),
    effectiveRate: allComponents
      .filter((c: any) => c.schemeId === s.id)
      .reduce((sum: number, c: any) => sum + (Number(c.rate) || 0), 0),
  }));

  if (req.query.active === 'true') {
    return res.json(enriched.filter((s: any) => s.active));
  }

  res.json(listResult(enriched, enriched.length, 1, enriched.length));
}));

// GET /api/tax/schemes/:id — get single scheme with components
router.get('/schemes/:id', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const scheme = await db.byId(tid, COL.schemes, req.params.id);
  if (!scheme) throw ApiError.notFound('Tax scheme not found');

  const allComponents = await db.all(tid, COL.components);
  const components = allComponents.filter((c: any) => c.schemeId === scheme.id);

  res.json({ ...scheme, components });
}));

// POST /api/tax/schemes — create custom tax scheme
router.post('/schemes', requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['name', 'country', 'type']);

  const { name, country, type, description = '', components = [], isDefault = false } = req.body;

  const VALID_TYPES = ['GST', 'VAT', 'SALES_TAX', 'EXEMPT', 'CUSTOM'];
  if (!VALID_TYPES.includes(type)) throw ApiError.badRequest(`Invalid type. Allowed: ${VALID_TYPES.join(', ')}`);

  const code = `CUSTOM_${name.toUpperCase().replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}`;

  const scheme = await db.insert(tid, COL.schemes, {
    code, name, country, type, description, isDefault: Boolean(isDefault), active: true,
    createdAt: new Date().toISOString(),
  });

  const createdComponents = [];
  for (const comp of components) {
    if (!comp.name || comp.rate === undefined) continue;
    const created = await db.insert(tid, COL.components, {
      name: comp.name,
      rate: Number(comp.rate) || 0,
      applicableTo: comp.applicableTo || 'all',
      description: comp.description || '',
      schemeId: scheme.id,
      schemeCode: code,
      active: true,
      createdAt: new Date().toISOString(),
    });
    createdComponents.push(created);
  }

  const a = actor(req);
  await recordAudit({
    tenantId: tid, actorId: a.id, actorName: a.name, action: 'create', module: 'tax',
    recordRef: code, newState: { name, type, country }, ip: req.ip,
  });

  res.status(201).json({ ...scheme, components: createdComponents });
}));

// PUT /api/tax/schemes/:id/activate — toggle active
router.put('/schemes/:id/activate', requireRole('finance', 'admin', 'owner'), asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const scheme = await db.byId(tid, COL.schemes, req.params.id);
  if (!scheme) throw ApiError.notFound('Tax scheme not found');

  const updated = await db.update(tid, COL.schemes, scheme.id, {
    active: !scheme.active,
    updatedAt: new Date().toISOString(),
  });
  res.json(updated);
}));

// POST /api/tax/calculate — calculate tax for a given amount and scheme
router.post('/calculate', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['amount', 'schemeId']);

  const amount = Number(req.body.amount);
  if (isNaN(amount) || amount < 0) throw ApiError.badRequest('Valid amount required');

  const scheme = await db.byId(tid, COL.schemes, req.body.schemeId);
  if (!scheme) throw ApiError.notFound('Tax scheme not found');

  const allComponents = await db.all(tid, COL.components);
  const components = allComponents.filter((c: any) => c.schemeId === scheme.id && c.active);

  const breakdown = components.map((c: any) => ({
    name: c.name,
    rate: c.rate,
    applicableTo: c.applicableTo,
    taxAmount: Math.round((amount * c.rate / 100) * 100) / 100,
  }));

  const totalTax = breakdown.reduce((sum: number, b: any) => sum + b.taxAmount, 0);
  const totalWithTax = Math.round((amount + totalTax) * 100) / 100;

  res.json({
    scheme: { id: scheme.id, name: scheme.name, type: scheme.type },
    baseAmount: amount,
    breakdown,
    totalTax: Math.round(totalTax * 100) / 100,
    totalWithTax,
  });
}));

export const taxRouter = router;
