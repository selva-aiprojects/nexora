import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, listResult, requireBody, notFoundIfUndefined } from '../core/http.js';
import { requireAuth, actor } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const TID = 'tnt_acme';
const COL = { folders: 'dms_folders', documents: 'dms_documents', versions: 'dms_versions', shares: 'dms_shares' };



// ----------------------------- Seed data -----------------------------

const docs = [
  { id: 'doc_002', tenantId: TID, name: 'Vendor Agreement - Steel Mart.pdf', category: 'vendor', folderId: 'fol_vend', ownerId: 'usr_finance', tags: ['contract'], mimeType: 'application/pdf', size: 512000, currentVersion: 2 },
  { id: 'doc_003', tenantId: TID, name: 'GSTR-3B Jul 2026.pdf', category: 'gst', folderId: 'fol_gst', ownerId: 'usr_finance', tags: ['gst', 'return'], mimeType: 'application/pdf', size: 98000, currentVersion: 1 },
  { id: 'doc_004', tenantId: TID, name: 'Code of Conduct.pdf', category: 'policy', folderId: 'fol_pol', ownerId: 'usr_hr', tags: ['policy', 'hr'], mimeType: 'application/pdf', size: 320000, currentVersion: 3 },
  { id: 'doc_005', tenantId: TID, name: 'Purchase Invoice PUR-1042.pdf', category: 'purchase_invoice', folderId: 'fol_vend', ownerId: 'usr_finance', tags: ['invoice'], mimeType: 'application/pdf', size: 120000, currentVersion: 1 },
];



// ----------------------------- Routes -----------------------------
router.get('/folders', requireAuth, asyncHandler(async (_req, res) => res.json(await db.all(TID, COL.folders))));
router.get('/documents', requireAuth, asyncHandler(async (req, res) => {
  let rows = await db.all(TID, COL.documents);
  if (req.query.category) rows = rows.filter((d) => d.category === req.query.category);
  if (req.query.folderId) rows = rows.filter((d) => d.folderId === req.query.folderId);
  if (req.query.q) {
    const q = String(req.query.q).toLowerCase();
    rows = rows.filter((d) => d.name.toLowerCase().includes(q) || (d.tags ?? []).join(' ').toLowerCase().includes(q));
  }
  res.json(listResult(rows, rows.length, 1, rows.length));
}));
router.post('/documents', requireAuth, asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'category', 'folderId']);
  const row = await db.insert(TID, COL.documents, { ownerId: req.user!.id, tags: req.body.tags ?? [], mimeType: req.body.mimeType ?? 'application/pdf', size: req.body.size ?? 0, currentVersion: 1, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10), ...req.body });
  await db.insert(TID, COL.versions, { documentId: row.id, version: 1, uploadedOn: row.createdAt, note: 'Initial upload' });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'dms', recordRef: row.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));
router.get('/documents/:id', requireAuth, asyncHandler(async (req, res) => {
  const doc = notFoundIfUndefined(await db.byId(TID, COL.documents, req.params.id), 'Document not found');
  // In production this streams from object storage (S3/MinIO); we return metadata.
  res.json({ ...doc, _note: 'Binary stored in object storage; metadata served here.' });
}));
router.get('/documents/:id/versions', requireAuth, asyncHandler(async (req, res) => {
  const versions = await db.query(TID, COL.versions, (v) => v.documentId === req.params.id);
  res.json(versions.sort((a, b) => b.version - a.version));
}));
router.post('/documents/:id/versions', requireAuth, asyncHandler(async (req, res) => {
  const doc = notFoundIfUndefined(await db.byId(TID, COL.documents, req.params.id), 'Document not found');
  const next = doc.currentVersion + 1;
  const ver = await db.insert(TID, COL.versions, { documentId: doc.id, version: next, uploadedOn: new Date().toISOString().slice(0, 10), note: req.body?.note ?? 'New version' });
  await db.update(TID, COL.documents, doc.id, { currentVersion: next, updatedAt: ver.uploadedOn });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'update', module: 'dms', recordRef: doc.id, newState: { version: next }, ip: req.ip });
  res.status(201).json(ver);
}));
router.post('/documents/:id/share', requireAuth, asyncHandler(async (req, res) => {
  requireBody(req.body, ['sharedWith']);
  const doc = notFoundIfUndefined(await db.byId(TID, COL.documents, req.params.id), 'Document not found');
  const row = await db.insert(TID, COL.shares, { documentId: doc.id, expiresOn: req.body.expiresOn ?? null, ...req.body });
  const a = actor(req); await recordAudit({ tenantId: TID, actorId: a.id, actorName: a.name, action: 'create', module: 'dms', recordRef: doc.id, newState: row, ip: req.ip });
  res.status(201).json(row);
}));

async function init() {
  await db.seed(COL.documents, docs.map((d) => ({ ...d, createdAt: '2026-08-01', updatedAt: '2026-08-10' })));
  await db.seed(COL.folders, [
  { id: 'fol_root', tenantId: TID, name: 'Company', parentId: null },
  { id: 'fol_emp', tenantId: TID, name: 'Employee Documents', parentId: 'fol_root' },
  { id: 'fol_vend', tenantId: TID, name: 'Vendor Documents', parentId: 'fol_root' },
  { id: 'fol_gst', tenantId: TID, name: 'GST & Compliance', parentId: 'fol_root' },
  { id: 'fol_pol', tenantId: TID, name: 'Policies', parentId: 'fol_root' },
]);
  await db.seed(COL.versions, [
  { id: 'ver_001', tenantId: TID, documentId: 'doc_002', version: 1, uploadedOn: '2026-06-01', note: 'Initial' },
  { id: 'ver_002', tenantId: TID, documentId: 'doc_002', version: 2, uploadedOn: '2026-08-10', note: 'Renewal terms updated' },
  { id: 'ver_003', tenantId: TID, documentId: 'doc_004', version: 3, uploadedOn: '2026-07-20', note: 'Annual refresh' },
]);
  await db.seed(COL.shares, [
  { id: 'shr_001', tenantId: TID, documentId: 'doc_003', sharedWith: 'auditor@ext.in', expiresOn: '2026-09-30' },
]);
}
init().catch(console.error);

export default router;
