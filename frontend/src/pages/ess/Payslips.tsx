import * as React from 'react';
import { Card, PageHeader } from '@/components';
import { api } from '@/lib/api';

export default function ESSPayslips() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getESSPayslips()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading payslips…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Payslips" subtitle="Your salary slips and tax deductions." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p: any) => (
          <Card key={p.id}>
            <p className="text-xs text-ink-muted">{p.period}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">₹{p.net.toLocaleString('en-IN')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-muted">
              <div>Gross: ₹{p.gross.toLocaleString('en-IN')}</div>
              <div>Deductions: ₹{p.deductions.toLocaleString('en-IN')}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
