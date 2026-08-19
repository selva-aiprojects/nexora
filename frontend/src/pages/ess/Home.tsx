import * as React from 'react';
import { Card, PageHeader } from '@/components';
import { api } from '@/lib/api';

export default function ESSHome() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [home, setHome] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getESSHome()
      .then((res) => { if (!cancelled) setHome(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading ESS home…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;
  if (!home) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={`Welcome, ${home.employee.name}`} subtitle={`${home.employee.code} · ${home.employee.department}`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-ink-muted">Attendance today</p>
          <p className="mt-1 text-sm font-medium text-ink">{home.attendanceStatus.checkedIn ? `Checked in at ${home.attendanceStatus.checkIn}` : 'Not checked in'}</p>
          <p className="text-xs text-ink-muted">{home.attendanceStatus.status}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-muted">Pending leave</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{home.pendingActions.leave}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-muted">Pending expenses</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{home.pendingActions.expenses}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-muted">Latest payslip</p>
          <p className="mt-1 text-sm font-medium text-ink">{home.latestPayslip ? home.latestPayslip.period : '—'}</p>
        </Card>
      </div>
      <Card>
        <h2 className="font-display text-base font-semibold text-ink">Announcements</h2>
        <div className="mt-4 space-y-3">
          {home.announcements.map((a: any) => (
            <div key={a.id} className="rounded border border-border px-4 py-3">
              <p className="text-sm font-medium text-ink">{a.title}</p>
              <p className="text-xs text-ink-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
