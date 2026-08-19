import * as React from 'react';
import { Badge, Card, PageHeader } from '@/components';
import { api } from '@/lib/api';

export default function AIInsights() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getAIInsights()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading insights…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="AI Insights" subtitle="Financial intelligence signals." />
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r: any) => (
          <Card key={r.id}>
            <div className="flex items-center gap-2">
              <Badge tone={r.trend === 'up' ? 'success' : r.trend === 'down' ? 'danger' : 'info'} withDot>{r.trend}</Badge>
              <h3 className="font-display text-base font-semibold text-ink">{r.title}</h3>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{r.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
