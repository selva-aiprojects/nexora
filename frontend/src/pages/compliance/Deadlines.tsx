import * as React from 'react';
import { Badge, DataTable, PageHeader, type Column } from '@/components';
import { api } from '@/lib/api';

const LEVEL_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ok: 'success',
  warning: 'warning',
  critical: 'danger',
  overdue: 'danger',
  due_soon: 'warning',
  upcoming: 'info',
};

function ComplianceDeadlines() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getComplianceDeadlines()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const columns: Column<any>[] = [
    { key: 'dueDate', header: 'Due Date', sortable: true },
    {
      key: 'alertLevel',
      header: 'Level',
      render: (row) => <Badge tone={LEVEL_TONE[row.alertLevel] ?? 'neutral'} withDot>{row.alertLevel}</Badge>,
    },
    { key: 'status', header: 'Status', render: (row) => row.status },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading deadlines…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Compliance deadlines" subtitle="Upcoming statutory obligations and filing due dates." />
      <DataTable
        caption="Deadlines"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No deadlines"
        emptyDescription="Compliance deadlines will appear here."
      />
    </div>
  );
}

export default ComplianceDeadlines;
