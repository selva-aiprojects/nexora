import * as React from 'react';
import { Badge, Card, PageHeader } from '@/components';
import { api } from '@/lib/api';

export default function AIRecommendations() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getAIRecommendations()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading recommendations…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="AI Recommendations" subtitle="Actionable next steps." />
      <div className="space-y-3">
        {rows.map((r: any) => (
          <Card key={r.id}>
            <div className="flex items-start gap-3">
              <Badge tone={r.priority === 'high' ? 'danger' : r.priority === 'medium' ? 'warning' : 'info'}>{r.priority}</Badge>
              <p className="text-sm text-ink">{r.text}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
