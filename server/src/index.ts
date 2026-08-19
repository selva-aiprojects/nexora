import express from 'express';
import cors from 'cors';
import { ApiError } from './core/errors.js';
import authRoutes from './platform/auth.routes.js';
import auditRoutes from './platform/audit.routes.js';
import notificationRoutes from './platform/notifications.routes.js';
import searchRoutes from './platform/search.routes.js';
import dashboardRoutes from './platform/dashboard.routes.js';
import accountingRoutes from './modules/accounting.js';
import hrmsRoutes from './modules/hrms.js';
import manufacturingRoutes from './modules/manufacturing.js';
import complianceRoutes from './modules/compliance.js';
import essRoutes from './modules/ess.js';
import dmsRoutes from './modules/dms.js';
import aiRoutes from './modules/ai.js';
import inventoryRoutes from './modules/inventory.js';
import crmRoutes from './modules/crm.js';
import procurementRoutes from './modules/procurement.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nexora-server', time: new Date().toISOString() }));

// ---- Platform (cross-cutting) ----
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ---- Business modules ----
app.use('/api/accounting', accountingRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/ess', essRoutes);
app.use('/api/dms', dmsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/procurement', procurementRoutes);

// 404 for unknown API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'No such endpoint' });
});

// Central error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: 'api_error', message: err.message, details: err.details });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  return res.status(500).json({ error: 'internal_error', message });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Nexora server listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log('Modules mounted: accounting, hrms, manufacturing, inventory, compliance, ess, dms, ai + platform (auth/audit/notifications/search/dashboard)');
});
