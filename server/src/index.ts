import express from 'express';
import cors from 'cors';
import { ApiError } from './core/errors.js';
import authRoutes from './platform/auth.routes.js';
import usersRoutes from './platform/users.routes.js';
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
import projectsRoutes from './modules/projects.js';
import qualityRoutes from './modules/quality.js';
import { assetsRouter as assetsRoutes } from './modules/assets.js';
import { currenciesRouter as currenciesRoutes } from './modules/currencies.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

export const app = express();
export let server: ReturnType<typeof app.listen> | undefined;
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'nexora-server',
  dbImpl: process.env.DB_IMPL ?? (process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL ? 'postgres' : 'memory'),
  hasPgUrl: Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL),
  time: new Date().toISOString(),
}));

// ---- Platform (cross-cutting) ----
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
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
app.use('/api/projects', projectsRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/currencies', currenciesRoutes);

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

// Serve frontend static files in production (Vercel serverless)
const frontendDist = path.resolve(process.cwd(), 'public');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'vercel') {
  server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Nexora server listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log('Modules mounted: accounting, hrms, manufacturing, inventory, compliance, ess, dms, ai + platform (auth/audit/notifications/search/dashboard)');
  });
}
