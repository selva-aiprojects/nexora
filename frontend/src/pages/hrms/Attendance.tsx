import * as React from 'react';
import { Badge, Button, Card, DataTable, type Column, PageHeader, useToast } from '@/components';
import { api, type HRMSEmployee, type HRMSAttendance } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
};

function Attendance() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<HRMSAttendance[]>([]);
  const [employees, setEmployees] = React.useState<HRMSEmployee[]>([]);

  const nameMap = React.useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e.name])),
    [employees]
  );

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getHRMSAttendance(), api.getHRMSEmployees({ pageSize: 100 })])
      .then(([attendance, empRes]) => {
        if (cancelled) return;
        setRows(attendance.rows ?? []);
        setEmployees(empRes.rows ?? []);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => load(), [load]);

  async function handleCheckIn() {
    setActing(true);
    try {
      await api.checkInHRMS();
      notify({ title: 'Checked in', description: 'Your attendance is recorded for today.', tone: 'success' });
      load();
    } catch (err: any) {
      notify({ title: 'Check-in failed', description: err.message, tone: 'danger' });
    } finally {
      setActing(false);
    }
  }

  async function handleCheckOut() {
    setActing(true);
    try {
      await api.checkOutHRMS();
      notify({ title: 'Checked out', description: 'Your attendance is updated for today.', tone: 'success' });
      load();
    } catch (err: any) {
      notify({ title: 'Check-out failed', description: err.message, tone: 'danger' });
    } finally {
      setActing(false);
    }
  }

  const columns: Column<HRMSAttendance>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (row) => formatDate(row.date) },
    {
      key: 'employeeId',
      header: 'Employee',
      render: (row) => nameMap[row.employeeId] ?? row.employeeId,
    },
    {
      key: 'checkIn',
      header: 'Check in',
      render: (row) => row.checkIn ?? '—',
    },
    {
      key: 'checkOut',
      header: 'Check out',
      render: (row) => row.checkOut ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Attendance"
        description="Daily attendance tracking with check-in and check-out."
        actions={
          <>
            <Button variant="secondary" onClick={handleCheckIn} isLoading={acting}>Check in</Button>
            <Button onClick={handleCheckOut} isLoading={acting}>Check out</Button>
          </>
        }
      />

      <Card>
        <DataTable
          caption="Attendance"
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          isLoading={loading}
          error={error ?? undefined}
          onRetry={load}
          emptyTitle="No attendance records"
          emptyDescription="Check-ins for the day will appear here."
        />
      </Card>
    </div>
  );
}

export default Attendance;
