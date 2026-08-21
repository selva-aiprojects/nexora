import { Router } from 'express';
import { db } from '../core/db.js';
import { ApiError } from '../core/errors.js';
import { asyncHandler, requireBody, listResult, parseQueryInt } from '../core/http.js';
import { requireAuth, requireRole, actor, tenantId } from '../core/auth.js';
import { recordAudit } from '../core/audit.js';

const router = Router();
const COL = {
  rules: 'approval_rules',
  requests: 'approval_requests',
  steps: 'approval_steps',
};

// Approval modules that support workflow
const SUPPORTED_MODULES = ['purchase_order', 'purchase_invoice', 'expense_claim', 'journal_entry', 'asset_capitalization', 'vendor_payment'];
const STEP_STATUSES = ['pending', 'approved', 'rejected', 'skipped'];
const REQUEST_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled'];

router.use(requireAuth);

// ─── APPROVAL RULES ─────────────────────────────────────────────────────────

// GET /api/approvals/rules — list approval rules
router.get('/rules', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  let rules = await db.all(tid, COL.rules);

  if (rules.length === 0) {
    // Seed default rules for purchase orders
    const defaults = [
      {
        module: 'purchase_order',
        name: 'PO < ₹50,000 — Manager Approval',
        minAmount: 0,
        maxAmount: 50000,
        steps: JSON.stringify([
          { level: 1, role: 'manager', label: 'Operations Manager', timeoutHours: 24 },
        ]),
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        module: 'purchase_order',
        name: 'PO ₹50K–₹5L — Finance + Manager',
        minAmount: 50001,
        maxAmount: 500000,
        steps: JSON.stringify([
          { level: 1, role: 'manager', label: 'Operations Manager', timeoutHours: 24 },
          { level: 2, role: 'finance', label: 'Finance Controller', timeoutHours: 24 },
        ]),
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        module: 'purchase_order',
        name: 'PO > ₹5L — MD/Owner Final Approval',
        minAmount: 500001,
        maxAmount: 999999999,
        steps: JSON.stringify([
          { level: 1, role: 'manager', label: 'Operations Manager', timeoutHours: 12 },
          { level: 2, role: 'finance', label: 'Finance Controller', timeoutHours: 12 },
          { level: 3, role: 'owner', label: 'Managing Director', timeoutHours: 12 },
        ]),
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        module: 'expense_claim',
        name: 'Expense < ₹10,000 — Manager Only',
        minAmount: 0,
        maxAmount: 10000,
        steps: JSON.stringify([
          { level: 1, role: 'manager', label: 'Line Manager', timeoutHours: 48 },
        ]),
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        module: 'expense_claim',
        name: 'Expense > ₹10,000 — Manager + Finance',
        minAmount: 10001,
        maxAmount: 999999999,
        steps: JSON.stringify([
          { level: 1, role: 'manager', label: 'Line Manager', timeoutHours: 24 },
          { level: 2, role: 'finance', label: 'Finance Head', timeoutHours: 24 },
        ]),
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const d of defaults) {
      await db.insert(tid, COL.rules, d);
    }
    rules = await db.all(tid, COL.rules);
  }

  // Parse steps JSON for each rule
  const enriched = rules.map((r: any) => ({
    ...r,
    steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
  }));

  if (req.query.module) {
    return res.json(enriched.filter((r: any) => r.module === req.query.module));
  }

  res.json(listResult(enriched, enriched.length, 1, enriched.length));
}));

// POST /api/approvals/rules — create custom approval rule
router.post('/rules', requireRole('admin', 'owner'), asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['module', 'name', 'steps']);

  const { module, name, minAmount = 0, maxAmount = 999999999, steps } = req.body;
  if (!SUPPORTED_MODULES.includes(module)) {
    throw ApiError.badRequest(`Unsupported module. Allowed: ${SUPPORTED_MODULES.join(', ')}`);
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    throw ApiError.badRequest('At least one approval step is required');
  }

  const rule = await db.insert(tid, COL.rules, {
    module,
    name,
    minAmount: Number(minAmount) || 0,
    maxAmount: Number(maxAmount) || 999999999,
    steps: JSON.stringify(steps),
    active: true,
    createdAt: new Date().toISOString(),
  });

  const a = actor(req);
  await recordAudit({
    tenantId: tid, actorId: a.id, actorName: a.name, action: 'create', module: 'approvals',
    recordRef: rule.id, newState: { module, name, steps }, ip: req.ip,
  });

  res.status(201).json({ ...rule, steps });
}));

// ─── APPROVAL REQUESTS ───────────────────────────────────────────────────────

// GET /api/approvals/requests — list requests
router.get('/requests', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const page = parseQueryInt(req.query.page, 1);
  const pageSize = parseQueryInt(req.query.pageSize, 20);

  let requests = await db.all(tid, COL.requests);
  const allSteps = await db.all(tid, COL.steps);

  if (req.query.status) requests = requests.filter((r: any) => r.status === req.query.status);
  if (req.query.module) requests = requests.filter((r: any) => r.module === req.query.module);
  if (req.query.pendingFor) {
    // Filter requests where the current level's required role matches
    requests = requests.filter((r: any) => {
      if (r.status !== 'pending') return false;
      const steps = typeof r.approvalSteps === 'string' ? JSON.parse(r.approvalSteps) : r.approvalSteps;
      const currentStep = steps?.find((s: any) => s.level === r.currentLevel);
      return currentStep?.role === req.query.pendingFor;
    });
  }

  const enriched = requests.map((r: any) => ({
    ...r,
    approvalSteps: typeof r.approvalSteps === 'string' ? JSON.parse(r.approvalSteps) : r.approvalSteps,
    stepHistory: allSteps.filter((s: any) => s.requestId === r.id),
  }));

  const total = enriched.length;
  const start = (page - 1) * pageSize;
  res.json(listResult(enriched.slice(start, start + pageSize), total, page, pageSize));
}));

// POST /api/approvals/submit — submit a record for approval
router.post('/submit', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  requireBody(req.body, ['module', 'recordId', 'recordRef', 'amount']);

  const { module, recordId, recordRef, amount, description = '', metadata = {} } = req.body;
  if (!SUPPORTED_MODULES.includes(module)) throw ApiError.badRequest('Unsupported module');

  const numericAmount = Number(amount) || 0;

  // Find the matching rule based on amount range
  const allRules = await db.all(tid, COL.rules);
  const matchingRule = allRules
    .filter((r: any) => r.module === module && r.active)
    .find((r: any) => numericAmount >= r.minAmount && numericAmount <= r.maxAmount);

  if (!matchingRule) {
    // Auto-approve if no rule matches
    return res.json({
      status: 'auto_approved',
      message: 'No approval rule matched for this amount. Record auto-approved.',
    });
  }

  const steps = typeof matchingRule.steps === 'string' ? JSON.parse(matchingRule.steps) : matchingRule.steps;
  const a = actor(req);

  const request = await db.insert(tid, COL.requests, {
    module,
    recordId,
    recordRef,
    amount: numericAmount,
    description,
    metadata: JSON.stringify(metadata),
    ruleId: matchingRule.id,
    ruleName: matchingRule.name,
    approvalSteps: JSON.stringify(steps),
    currentLevel: 1,
    totalLevels: steps.length,
    status: 'pending',
    submittedBy: a.name,
    submittedById: a.id,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  await recordAudit({
    tenantId: tid, actorId: a.id, actorName: a.name, action: 'create', module: 'approvals',
    recordRef: recordRef, newState: { module, amount: numericAmount, ruleName: matchingRule.name }, ip: req.ip,
  });

  res.status(201).json({
    ...request,
    approvalSteps: steps,
    message: `Submitted for approval: ${matchingRule.name} (${steps.length} level${steps.length > 1 ? 's' : ''})`,
  });
}));

// POST /api/approvals/requests/:id/approve — approve current level
router.post('/requests/:id/approve', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const request = await db.byId(tid, COL.requests, req.params.id);
  if (!request) throw ApiError.notFound('Approval request not found');
  if (request.status !== 'pending') throw ApiError.badRequest(`Request is already ${request.status}`);

  const a = actor(req);
  const steps = typeof request.approvalSteps === 'string' ? JSON.parse(request.approvalSteps) : request.approvalSteps;
  const currentStep = steps.find((s: any) => s.level === request.currentLevel);

  if (!currentStep) throw ApiError.badRequest('Invalid approval level');

  // Record this step's decision
  await db.insert(tid, COL.steps, {
    requestId: request.id,
    level: request.currentLevel,
    role: currentStep.role,
    label: currentStep.label,
    action: 'approved',
    actorId: a.id,
    actorName: a.name,
    comments: req.body.comments || '',
    decidedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const isLastLevel = request.currentLevel >= request.totalLevels;
  const newStatus = isLastLevel ? 'approved' : 'pending';
  const nextLevel = isLastLevel ? request.currentLevel : request.currentLevel + 1;

  const updated = await db.update(tid, COL.requests, request.id, {
    status: newStatus,
    currentLevel: nextLevel,
    lastActionAt: new Date().toISOString(),
    lastActionBy: a.name,
    ...(isLastLevel ? { completedAt: new Date().toISOString() } : {}),
  });

  await recordAudit({
    tenantId: tid, actorId: a.id, actorName: a.name, action: 'approve', module: 'approvals',
    recordRef: request.recordRef, newState: { level: request.currentLevel, finalStatus: newStatus }, ip: req.ip,
  });

  const nextStep = isLastLevel ? null : steps.find((s: any) => s.level === nextLevel);
  res.json({
    request: { ...updated, approvalSteps: steps },
    message: isLastLevel
      ? `✅ Final approval granted. ${request.recordRef} is fully approved.`
      : `✅ Level ${request.currentLevel} approved. Awaiting ${nextStep?.label} (Level ${nextLevel}).`,
  });
}));

// POST /api/approvals/requests/:id/reject — reject and halt
router.post('/requests/:id/reject', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const request = await db.byId(tid, COL.requests, req.params.id);
  if (!request) throw ApiError.notFound('Approval request not found');
  if (request.status !== 'pending') throw ApiError.badRequest(`Request is already ${request.status}`);

  const a = actor(req);
  const steps = typeof request.approvalSteps === 'string' ? JSON.parse(request.approvalSteps) : request.approvalSteps;
  const currentStep = steps.find((s: any) => s.level === request.currentLevel);

  await db.insert(tid, COL.steps, {
    requestId: request.id,
    level: request.currentLevel,
    role: currentStep?.role || 'unknown',
    label: currentStep?.label || 'Unknown',
    action: 'rejected',
    actorId: a.id,
    actorName: a.name,
    comments: req.body.comments || 'No reason provided',
    decidedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const updated = await db.update(tid, COL.requests, request.id, {
    status: 'rejected',
    rejectionReason: req.body.comments || 'Rejected without comment',
    lastActionAt: new Date().toISOString(),
    lastActionBy: a.name,
    completedAt: new Date().toISOString(),
  });

  await recordAudit({
    tenantId: tid, actorId: a.id, actorName: a.name, action: 'reject', module: 'approvals',
    recordRef: request.recordRef, newState: { level: request.currentLevel, reason: req.body.comments }, ip: req.ip,
  });

  res.json({
    request: { ...updated, approvalSteps: steps },
    message: `❌ ${request.recordRef} rejected at Level ${request.currentLevel} by ${a.name}.`,
  });
}));

// GET /api/approvals/pending — get requests pending for the current user's role
router.get('/pending', asyncHandler(async (req, res) => {
  const tid = tenantId(req);
  const a = actor(req);
  const userRole = (req as any).user?.role || 'employee';

  const allRequests = await db.all(tid, COL.requests);
  const allSteps = await db.all(tid, COL.steps);

  const pending = allRequests
    .filter((r: any) => r.status === 'pending')
    .filter((r: any) => {
      const steps = typeof r.approvalSteps === 'string' ? JSON.parse(r.approvalSteps) : r.approvalSteps;
      const currentStep = steps?.find((s: any) => s.level === r.currentLevel);
      return currentStep?.role === userRole || userRole === 'owner' || userRole === 'admin';
    })
    .map((r: any) => ({
      ...r,
      approvalSteps: typeof r.approvalSteps === 'string' ? JSON.parse(r.approvalSteps) : r.approvalSteps,
      stepHistory: allSteps.filter((s: any) => s.requestId === r.id),
    }));

  res.json({
    count: pending.length,
    requests: pending,
  });
}));

export const approvalsRouter = router;
