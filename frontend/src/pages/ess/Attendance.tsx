import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, useToast } from '@/components';
import { api } from '@/lib/api';

export default function ESSAttendance() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getHRMSAttendance()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await api.checkInESS();
      notify({ title: 'Checked in', tone: 'success' });
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      await api.checkOutESS();
      notify({ title: 'Checked out', tone: 'success' });
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading attendance…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  const today = rows[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Attendance" subtitle="Check in and out for daily attendance." actions={
        <div className="flex gap-2">
          <Button onClick={handleCheckIn} isLoading={submitting} disabled={today?.checkIn}>Check In</Button>
          <Button variant="secondary" onClick={handleCheckOut} isLoading={submitting} disabled={!today?.checkIn || today?.checkOut}>Check Out</Button>
        </div>
      } />
      <DataTable
        caption="Attendance records"
        columns={[
          { key: 'date', header: 'Date', sortable: true },
          { key: 'checkIn', header: 'Check In' },
          { key: 'checkOut', header: 'Check Out', render: (row) => row.checkOut ?? '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge tone={row.status === 'present' ? 'success' : row.status === 'late' ? 'warning' : 'neutral'} withDot>{row.status}</Badge>,
          },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No attendance records"
        emptyDescription="Check in to create your first record."
      />
    </div>
  );
}
