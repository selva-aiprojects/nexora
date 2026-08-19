import * as React from 'react';
import { Card, PageHeader, Skeleton, StatCard } from '@/components';
import { api, type HRMSStatutory } from '@/lib/api';
import { formatINR } from '@/lib/utils';

const BREAKDOWN: { key: keyof HRMSStatutory; label: string; note: string }[] = [
  { key: 'epf', label: 'EPF (Employer 12%)', note: 'Employee Provident Fund contribution' },
  { key: 'esic', label: 'ESIC (0.75%)', note: 'Employee State Insurance contribution' },
  { key: 'tds', label: 'TDS (5% over ₹50k)', note: 'Tax deducted at source on salary' },
  { key: 'totalStatutory', label: 'Total statutory', note: 'Combined monthly outgo' },
];

function Statutory() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<HRMSStatutory | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getHRMSStatutory()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function retry() {
    setError(null);
    setLoading(true);
    api.getHRMSStatutory()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader title="Statutory" description="EPF, ESIC, PT and TDS contributions." />
        <Card>
          <p className="text-sm text-danger">{error}</p>
          <button type="button" className="mt-3 text-sm font-medium text-primary" onClick={retry}>
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Statutory"
        description="Monthly statutory contributions across the workforce."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </Card>
          ))
        ) : (
          <>
            <StatCard label="EPF" value={formatINR(data?.epf ?? 0, { compact: true })} delta="Per month" trend="flat" />
            <StatCard label="ESIC" value={formatINR(data?.esic ?? 0, { compact: true })} delta="Per month" trend="flat" />
            <StatCard label="TDS" value={formatINR(data?.tds ?? 0, { compact: true })} delta="Per month" trend="flat" />
            <StatCard label="Total" value={formatINR(data?.totalStatutory ?? 0, { compact: true })} delta={`${data?.employeeCount ?? 0} employees`} trend="up" />
          </>
        )}
      </div>

      <Card>
        <h2 className="font-display text-base font-semibold text-ink">Breakdown</h2>
        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <dl className="mt-4 divide-y divide-border">
            {BREAKDOWN.map((row) => (
              <div key={row.key} className="flex items-center justify-between py-3">
                <div>
                  <dt className="text-sm font-medium text-ink">{row.label}</dt>
                  <dd className="text-xs text-ink-muted">{row.note}</dd>
                </div>
                <dd className="text-sm font-semibold tabular-nums text-ink">
                  {formatINR(Number(data?.[row.key] ?? 0), { compact: true })}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}

export default Statutory;
