import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  type Column,
  EmptyState,
  FormField,
  PageHeader,
  Select,
  SkeletonText,
  useToast,
  formatINR,
} from '@/components';
import { api, type GSTReturn } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  filed: 'success',
  pending: 'warning',
  draft: 'neutral',
};

export default function GSTReturns() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [returns, setReturns] = React.useState<GSTReturn[]>([]);
  const [statusFilter, setStatusFilter] = React.useState('');

  const [fileTarget, setFileTarget] = React.useState<GSTReturn | null>(null);
  const [filing, setFiling] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getGSTReturns(statusFilter ? { status: statusFilter } : undefined)
      .then((res) => { if (!cancelled) setReturns(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [statusFilter]);

  async function confirmFile() {
    if (!fileTarget) return;
    setFiling(true);
    try {
      const updated = await api.fileGSTReturn(fileTarget.id);
      notify({ title: 'Return filed', description: `${updated.type} ${updated.period} marked filed.`, tone: 'success' });
      setFileTarget(null);
      setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      notify({ title: 'Could not file', description: err.message, tone: 'danger' });
    } finally {
      setFiling(false);
    }
  }

  const columns: Column<GSTReturn>[] = [
    { key: 'type', header: 'Type', width: '120px', sortable: true },
    { key: 'period', header: 'Period', sortable: true },
    {
      key: 'totalTax',
      header: 'Tax payable',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.totalTax)}</span>,
    },
    { key: 'filedOn', header: 'Filed on', width: '130px', hideBelow: 'md', render: (row) => row.filedOn ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status !== 'filed' ? (
          <Button size="sm" onClick={() => setFileTarget(row)}>File</Button>
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="GST returns"
        subtitle="Periodic returns and the tax liability they carry."
      />

      <Card padding="sm" className="flex flex-wrap items-end gap-4">
        <FormField label="Filter by status" htmlFor="gst-status" className="min-w-[200px]">
          <Select
            id="gst-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All statuses"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'filed', label: 'Filed' },
            ]}
          />
        </FormField>
      </Card>

      {loading ? (
        <Card padding="lg"><SkeletonText lines={5} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load GST returns" description={error} />
      ) : (
        <DataTable
          caption="GST returns"
          columns={columns}
          data={returns}
          getRowId={(row) => row.id}
          emptyTitle="No GST returns"
          emptyDescription="Returns for this entity will appear here when generated."
        />
      )}

      <ConfirmDialog
        open={!!fileTarget}
        onClose={() => setFileTarget(null)}
        onConfirm={confirmFile}
        title="File GST return?"
        description={fileTarget ? `${fileTarget.type} for ${fileTarget.period} will be marked as filed.` : undefined}
        confirmLabel="File return"
        loading={filing}
      />
    </div>
  );
}
