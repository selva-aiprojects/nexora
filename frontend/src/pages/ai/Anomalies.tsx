import * as React from 'react';
import { Badge, DataTable, PageHeader } from '@/components';
import { api } from '@/lib/api';

const SEVERITY_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

export default function AIAnomalies() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getAIAnomalies()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading anomalies…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="AI Anomalies" subtitle="Detected issues across modules." />
      <DataTable
        caption="Anomalies"
        columns={[
          { key: 'type', header: 'Type' },
          {
            key: 'severity',
            header: 'Severity',
            render: (row) => <Badge tone={SEVERITY_TONE[row.severity] ?? 'neutral'} withDot>{row.severity}</Badge>,
          },
          { key: 'message', header: 'Message', hideBelow: 'md' },
          { key: 'ref', header: 'Reference' },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No anomalies"
        emptyDescription="Great — no issues detected."
      />
    </div>
  );
}
