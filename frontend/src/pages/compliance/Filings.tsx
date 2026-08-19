import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, ConfirmDialog, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  submitted: 'success',
  pending: 'warning',
  verified: 'success',
  due_soon: 'warning',
  upcoming: 'info',
  overdue: 'danger',
  critical: 'danger',
  ok: 'success',
};

function ComplianceFilings() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [confirm, setConfirm] = React.useState<{ open: boolean; id: string; action: 'submit' | 'verify' }>({ open: false, id: '', action: 'submit' });
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getComplianceFilings()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    setBusy(true);
    try {
      if (confirm.action === 'submit') await api.submitComplianceFiling(confirm.id);
      else await api.verifyComplianceFiling(confirm.id);
      notify({ title: 'Updated', description: 'Filing status updated.', tone: 'success' });
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
      setConfirm((c) => ({ ...c, open: false }));
    }
  };

  const columns: Column<any>[] = [
    { key: 'period', header: 'Period', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
    { key: 'filedOn', header: 'Filed On', render: (row) => row.filedOn ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.status === 'pending' && (
            <Button size="sm" variant="primary" onClick={() => setConfirm({ open: true, id: row.id, action: 'submit' })}>Submit</Button>
          )}
          {row.status === 'submitted' && (
            <Button size="sm" variant="secondary" onClick={() => setConfirm({ open: true, id: row.id, action: 'verify' })}>Verify</Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading filings…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Compliance filings" subtitle="Track and manage statutory return filings." />
      <DataTable
        caption="Filings"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No filings"
        emptyDescription="Filed returns will appear here."
      />
      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={handleAction}
        title={confirm.action === 'submit' ? 'Submit filing?' : 'Verify filing?'}
        description={`This will mark the filing as ${confirm.action === 'submit' ? 'submitted' : 'verified'}.`}
        confirmLabel={confirm.action === 'submit' ? 'Submit' : 'Verify'}
        confirmTone="primary"
        loading={busy}
      />
    </div>
  );
}

export default ComplianceFilings;
