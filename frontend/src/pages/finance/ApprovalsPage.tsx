import * as React from 'react';
import { api } from '@/lib/api';
import { Button, Badge, StatCard, DataTable, FormField, Modal, useToast, type Column } from '@/components';
import { TextField } from '@/components';
import { formatINR, formatDate } from '@/lib/utils';

const MODULE_LABELS: Record<string, string> = {
  purchase_order: 'Purchase Order',
  purchase_invoice: 'Purchase Invoice',
  expense_claim: 'Expense Claim',
  journal_entry: 'Journal Entry',
  asset_capitalization: 'Asset Capitalization',
  vendor_payment: 'Vendor Payment',
};

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  draft: 'info',
  cancelled: 'info',
};

export default function ApprovalsPage() {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = React.useState<'requests' | 'rules'>('requests');
  const [requests, setRequests] = React.useState<any[]>([]);
  const [rules, setRules] = React.useState<any[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterModule, setFilterModule] = React.useState('all');
  const [actionModal, setActionModal] = React.useState<{ open: boolean; type: 'approve' | 'reject'; request: any | null }>({ open: false, type: 'approve', request: null });
  const [comments, setComments] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, rulesRes, pendingRes] = await Promise.all([
        api.getApprovalRequests({
          status: filterStatus !== 'all' ? filterStatus : undefined,
          module: filterModule !== 'all' ? filterModule : undefined,
        }),
        api.getApprovalRules(),
        api.getPendingApprovals(),
      ]);
      setRequests(reqRes.rows || reqRes);
      setRules(rulesRes.rows || rulesRes);
      setPendingCount(pendingRes.count || 0);
    } catch (err: any) {
      notify({ title: 'Failed to load approvals', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterModule, notify]);

  React.useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!actionModal.request) return;
    setSaving(true);
    try {
      const res = actionModal.type === 'approve'
        ? await api.approveRequest(actionModal.request.id, comments)
        : await api.rejectRequest(actionModal.request.id, comments);
      notify({ title: res.message, tone: actionModal.type === 'approve' ? 'success' : 'danger' });
      setActionModal({ open: false, type: 'approve', request: null });
      setComments('');
      load();
    } catch (err: any) {
      notify({ title: 'Action failed', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const requestCols: Column<any>[] = [
    {
      key: 'ref',
      header: 'Reference',
      render: (row) => (
        <div>
          <div className="font-mono text-xs font-semibold text-primary">{row.recordRef}</div>
          <div className="text-xs text-ink-muted">{MODULE_LABELS[row.module] || row.module}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="text-xs font-medium">{formatINR(row.amount)}</span>,
    },
    {
      key: 'rule',
      header: 'Applied Rule',
      render: (row) => <span className="text-xs text-ink-muted">{row.ruleName || '—'}</span>,
    },
    {
      key: 'level',
      header: 'Approval Progress',
      render: (row) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: row.totalLevels }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-6 rounded-full ${
                i + 1 < row.currentLevel ? 'bg-success' :
                i + 1 === row.currentLevel && row.status === 'pending' ? 'bg-warning animate-pulse' :
                row.status === 'approved' ? 'bg-success' :
                row.status === 'rejected' ? 'bg-danger' : 'bg-border-strong'
              }`}
            />
          ))}
          <span className="ml-1 text-[11px] text-ink-muted">
            {row.status === 'approved' ? 'Done' : row.status === 'rejected' ? 'Rejected' : `L${row.currentLevel}/${row.totalLevels}`}
          </span>
        </div>
      ),
    },
    {
      key: 'submittedBy',
      header: 'Submitted By',
      render: (row) => (
        <div>
          <div className="text-xs text-ink">{row.submittedBy}</div>
          <div className="text-[11px] text-ink-muted">{row.submittedAt ? formatDate(row.submittedAt.slice(0,10)) : ''}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] || 'info'}>{row.status.toUpperCase()}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => row.status === 'pending' ? (
        <div className="flex items-center gap-1.5">
          <Button variant="primary" size="sm" onClick={() => setActionModal({ open: true, type: 'approve', request: row })}>
            Approve
          </Button>
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10"
            onClick={() => setActionModal({ open: true, type: 'reject', request: row })}>
            Reject
          </Button>
        </div>
      ) : null,
    },
  ];

  const ruleCols: Column<any>[] = [
    {
      key: 'module',
      header: 'Module',
      render: (row) => <span className="text-xs font-medium text-ink">{MODULE_LABELS[row.module] || row.module}</span>,
    },
    {
      key: 'name',
      header: 'Rule Name',
      render: (row) => <span className="text-xs text-ink">{row.name}</span>,
    },
    {
      key: 'threshold',
      header: 'Amount Range',
      render: (row) => (
        <span className="text-xs text-ink-muted">
          {formatINR(row.minAmount)} → {row.maxAmount >= 999999999 ? '∞' : formatINR(row.maxAmount)}
        </span>
      ),
    },
    {
      key: 'levels',
      header: 'Approval Chain',
      render: (row) => (
        <div className="flex items-center gap-1">
          {(row.steps || []).map((s: any, i: number) => (
            <React.Fragment key={i}>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary capitalize">{s.role}</span>
              {i < row.steps.length - 1 && <span className="text-ink-muted text-xs">→</span>}
            </React.Fragment>
          ))}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => <Badge tone={row.active ? 'success' : 'info'}>{row.active ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Approval Workflows</h1>
          <p className="text-sm text-ink-muted">
            Multi-level threshold-based approval chains for POs, invoices, and expense claims.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending My Action" value={String(pendingCount)} delta="Requires your approval" trend={pendingCount > 0 ? 'down' : 'flat'} isLoading={loading} />
        <StatCard label="Total Requests" value={String(requests.length)} delta="All time" trend="flat" isLoading={loading} />
        <StatCard label="Approved" value={String(approvedCount)} delta="Completed approvals" trend="up" isLoading={loading} />
        <StatCard label="Rejected" value={String(rejectedCount)} delta="Declined workflows" trend="down" isLoading={loading} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-strong">
        {(['requests', 'rules'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab === 'requests' ? `Approval Requests (${requests.length})` : `Approval Rules (${rules.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-9 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              className="h-9 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Modules</option>
              {Object.entries(MODULE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <DataTable
            columns={requestCols}
            data={requests}
            getRowId={row => row.id}
            caption="Approval Requests"
            isLoading={loading}
            emptyTitle="No approval requests"
            emptyDescription="Submitted transactions will appear here for review."
          />
        </>
      )}

      {activeTab === 'rules' && (
        <DataTable
          columns={ruleCols}
          data={rules}
          getRowId={row => row.id}
          caption="Approval Rules"
          isLoading={loading}
          emptyTitle="No approval rules configured"
          emptyDescription="Approval rules define thresholds and approval chains."
        />
      )}

      {/* Approve / Reject Modal */}
      <Modal
        open={actionModal.open}
        onClose={() => setActionModal({ open: false, type: 'approve', request: null })}
        title={actionModal.type === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}
        size="md"
      >
        <div className="space-y-4">
          {actionModal.request && (
            <div className="rounded-lg border border-border-strong bg-surface p-3 text-xs space-y-1">
              <div><span className="text-ink-muted">Reference: </span><b className="text-ink">{actionModal.request.recordRef}</b></div>
              <div><span className="text-ink-muted">Amount: </span><b className="text-success">{formatINR(actionModal.request.amount)}</b></div>
              <div><span className="text-ink-muted">Rule: </span><span className="text-ink">{actionModal.request.ruleName}</span></div>
              <div><span className="text-ink-muted">Level: </span><span className="text-primary font-semibold">L{actionModal.request.currentLevel} of {actionModal.request.totalLevels}</span></div>
            </div>
          )}
          <FormField label="Comments (optional)" htmlFor="approval-comments">
            <TextField
              placeholder={actionModal.type === 'reject' ? 'State reason for rejection…' : 'Optional approval notes…'}
              value={comments}
              onChange={e => setComments(e.target.value)}
            />
          </FormField>
          <div className="flex items-center justify-end gap-3 border-t border-border-strong pt-4">
            <Button variant="secondary" onClick={() => setActionModal({ open: false, type: 'approve', request: null })}>Cancel</Button>
            <Button
              variant={actionModal.type === 'approve' ? 'primary' : 'danger'}
              onClick={handleAction}
              isLoading={saving}
            >
              {actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
