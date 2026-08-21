import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, requireBody } from '../core/http.js';
import { requireAuth, requireRole, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();

// Supported entity types and their DB collection names & required fields
const ENTITY_CONFIG: Record<string, {
  collection: string;
  required: string[];
  allowedFields: string[];
  displayName: string;
}> = {
  customers: {
    collection: 'crm_customers',
    required: ['name', 'email'],
    allowedFields: ['name', 'email', 'phone', 'address', 'city', 'country', 'gstin', 'currency'],
    displayName: 'Customers',
  },
  vendors: {
    collection: 'proc_vendors',
    required: ['name', 'email'],
    allowedFields: ['name', 'email', 'phone', 'address', 'city', 'country', 'gstin', 'category', 'currency'],
    displayName: 'Vendors',
  },
  items: {
    collection: 'inventory_items',
    required: ['name', 'sku'],
    allowedFields: ['name', 'sku', 'category', 'unitPrice', 'costPrice', 'unit', 'gstRate', 'hsnCode', 'reorderLevel'],
    displayName: 'Inventory Items',
  },
  employees: {
    collection: 'hrms_employees',
    required: ['name', 'employeeCode', 'designation'],
    allowedFields: ['name', 'employeeCode', 'designation', 'department', 'email', 'phone', 'dateOfJoining', 'salary'],
    displayName: 'Employees',
  },
  assets: {
    collection: 'asset_registers',
    required: ['name', 'category', 'purchaseCost', 'usefulLifeMonths'],
    allowedFields: ['name', 'category', 'purchaseDate', 'purchaseCost', 'salvageValue', 'usefulLifeMonths', 'depreciationMethod', 'location', 'serialNumber', 'vendor'],
    displayName: 'Fixed Assets',
  },
};

router.use(requireAuth);

// GET /api/importer/entities — list supported entity types
router.get('/entities', asyncHandler(async (_req, res) => {
  const entities = Object.entries(ENTITY_CONFIG).map(([key, config]) => ({
    key,
    displayName: config.displayName,
    requiredFields: config.required,
    allowedFields: config.allowedFields,
    sampleCsvHeaders: config.allowedFields.join(','),
  }));
  res.json({ entities });
}));

// POST /api/importer/preview — validate CSV rows before committing
router.post('/preview', asyncHandler(async (req, res) => {
  requireBody(req.body, ['entity', 'rows']);

  const { entity, rows } = req.body;
  const config = ENTITY_CONFIG[entity];
  if (!config) throw ApiError.badRequest(`Unsupported entity '${entity}'. Allowed: ${Object.keys(ENTITY_CONFIG).join(', ')}`);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw ApiError.badRequest('rows must be a non-empty array');
  }
  if (rows.length > 2000) {
    throw ApiError.badRequest('Maximum 2000 rows per import batch');
  }

  const validRows: any[] = [];
  const invalidRows: any[] = [];

  rows.forEach((row: any, index: number) => {
    const errors: string[] = [];

    // Check required fields
    for (const field of config.required) {
      const val = row[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        errors.push(`Missing required field: '${field}'`);
      }
    }

    // Filter to only allowed fields
    const cleanedRow: any = {};
    for (const field of config.allowedFields) {
      if (row[field] !== undefined && row[field] !== null && String(row[field]).trim() !== '') {
        cleanedRow[field] = String(row[field]).trim();
      }
    }

    // Type validations for common numeric fields
    const numericFields = ['purchaseCost', 'salvageValue', 'usefulLifeMonths', 'unitPrice', 'costPrice', 'gstRate', 'reorderLevel', 'salary'];
    for (const field of numericFields) {
      if (cleanedRow[field] !== undefined && isNaN(Number(cleanedRow[field]))) {
        errors.push(`'${field}' must be a number, got '${cleanedRow[field]}'`);
      }
    }

    if (errors.length > 0) {
      invalidRows.push({ rowIndex: index + 1, row, errors });
    } else {
      validRows.push({ rowIndex: index + 1, row: cleanedRow });
    }
  });

  res.json({
    entity,
    displayName: config.displayName,
    totalRows: rows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows: validRows.slice(0, 10), // Preview first 10 valid rows
    invalidRows: invalidRows.slice(0, 20), // First 20 error rows for review
    canCommit: invalidRows.length === 0,
    message: invalidRows.length === 0
      ? `✅ All ${validRows.length} rows are valid and ready to import.`
      : `⚠️ ${invalidRows.length} rows have errors. Fix them before committing.`,
  });
}));

// POST /api/importer/commit — commit validated rows to the database
router.post('/commit', requireRole('admin', 'owner', 'finance', 'hr'), asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['entity', 'rows']);

  const { entity, rows, skipDuplicates = true } = req.body;
  const config = ENTITY_CONFIG[entity];
  if (!config) throw ApiError.badRequest(`Unsupported entity '${entity}'`);

  if (!Array.isArray(rows) || rows.length === 0) throw ApiError.badRequest('rows array required');
  if (rows.length > 2000) throw ApiError.badRequest('Maximum 2000 rows per batch');

  const a = actor(req);
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as { rowIndex: number; error: string }[],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Validate required fields
      const missingFields = config.required.filter(f => !row[f] || String(row[f]).trim() === '');
      if (missingFields.length > 0) {
        results.errors.push({ rowIndex: i + 1, error: `Missing: ${missingFields.join(', ')}` });
        continue;
      }

      // Build clean record
      const record: any = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        importedAt: new Date().toISOString(),
        importedBy: a.name,
      };
      for (const field of config.allowedFields) {
        if (row[field] !== undefined && String(row[field]).trim() !== '') {
          const numericFields = ['purchaseCost', 'salvageValue', 'usefulLifeMonths', 'unitPrice', 'costPrice', 'gstRate', 'reorderLevel', 'salary'];
          record[field] = numericFields.includes(field) ? Number(row[field]) : String(row[field]).trim();
        }
      }

      // Assign auto-incremented IDs for specific entities
      if (entity === 'assets') {
        record.assetNumber = await db.nextId('AST', config.collection);
        record.accumulatedDepreciation = 0;
        record.bookValue = Number(record.purchaseCost) || 0;
        record.status = 'active';
        record.depreciationMethod = record.depreciationMethod || 'SLM';
      } else if (entity === 'items') {
        record.status = 'active';
      } else if (entity === 'employees') {
        record.status = 'active';
      } else if (entity === 'customers') {
        record.status = 'active';
        record.currency = record.currency || 'INR';
      } else if (entity === 'vendors') {
        record.status = 'active';
        record.currency = record.currency || 'INR';
      }

      await db.insert(tid, config.collection, record);
      results.imported++;
    } catch (err: any) {
      results.errors.push({ rowIndex: i + 1, error: err.message || 'Unknown error' });
    }
  }

  await recordAudit({
    tenantId: tid, actorId: a.id, actorName: a.name, action: 'create', module: 'importer',
    recordRef: entity, newState: { imported: results.imported, skipped: results.skipped, errors: results.errors.length }, ip: req.ip,
  });

  res.json({
    entity,
    displayName: config.displayName,
    ...results,
    message: results.errors.length === 0
      ? `✅ Successfully imported ${results.imported} ${config.displayName}.`
      : `⚠️ Imported ${results.imported} records. ${results.errors.length} rows had errors.`,
  });
}));

export const importerRouter = router;
