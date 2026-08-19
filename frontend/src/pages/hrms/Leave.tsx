import * as React from 'react';
import { Badge, Button, Card, ConfirmDialog, DataTable, type Column, FormField, Modal, PageHeader, Select, TextArea, TextField, useToast } from '@/components';
import { api, type HRMSEmployee, type HRMSLeaveApplication, type HRMSLeaveType } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

function diffDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000) + 1);
}

function Leave() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [apps, setApps] = React.useState<HRMSLeaveApplication[]>([]);
  const [leaveTypes, setLeaveTypes] = React.useState<HRMSLeaveType[]>([]);
  const [employees, setEmployees] = React.useState<HRMSEmployee[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({ employeeId: '', leaveTypeId: '', from: '', to: '', reason: '' });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const [confirm, setConfirm] = React.useState<{ id: string; action: 'approve' | 'reject' } | null>(null);

  const nameMap = React.useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e.name])),
    [employees]
  );
  const leaveTypeMap = React.useMemo(
    () => Object.fromEntries(leaveTypes.map((l) => [l.id, l.name])),
    [leaveTypes]
  );

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getHRMSLeaveApplications(),
      api.getHRMSLeaveTypes(),
      api.getHRMSEmployees({ pageSize: 100 }),
    ])
      .then(([appRes, types, empRes]) => {
        if (cancelled) return;
        setApps(appRes.rows ?? []);
        setLeaveTypes(types);
        setEmployees(empRes.rows ?? []);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => load(), [load]);

  function openCreate() {
    setForm({ employeeId: '', leaveTypeId: '', from: '', to: '', reason: '' });
    setFormErrors({});
    setCreateOpen(true);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.leaveTypeId) errs.leaveTypeId = 'Select a leave type';
    if (!form.from) errs.from = 'Select a start date';
    if (!form.to) errs.to = 'Select an end date';
    if (form.from && form.to && form.to < form.from) errs.to = 'End date can’t be before start';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitApply() {
    if (!validate()) return;
    setActing(true);
    try {
      await api.applyHRMSLeave({
        employeeId: form.employeeId || undefined,
        leaveTypeId: form.leaveTypeId,
        from: form.from,
        to: form.to,
        days: diffDays(form.from, form.to),
        reason: form.reason,
      });
      notify({ title: 'Leave applied', description: 'Application submitted for approval.', tone: 'success' });
      setCreateOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Could not apply', description: err.message, tone: 'danger' });
    } finally {
      setActing(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setActing(true);
    try {
      if (confirm.action === 'approve') await api.approveHRMSLeave(confirm.id);
      else await api.rejectHRMSLeave(confirm.id);
      notify({
        title: confirm.action === 'approve' ? 'Leave approved' : 'Leave rejected',
        tone: confirm.action === 'approve' ? 'success' : 'info',
      });
      setConfirm(null);
      load();
    } catch (err: any) {
      notify({ title: 'Action failed', description: err.message, tone: 'danger' });
    } finally {
      setActing(false);
    }
  }

  const columns: Column<HRMSLeaveApplication>[] = [
    {
      key: 'employeeId',
      header: 'Employee',
      render: (row) => nameMap[row.employeeId] ?? row.employeeId,
    },
    {
      key: 'leaveTypeId',
      header: 'Type',
      render: (row) => leaveTypeMap[row.leaveTypeId] ?? row.leaveTypeId,
    },
    { key: 'from', header: 'From', render: (row) => formatDate(row.from) },
    { key: 'to', header: 'To', render: (row) => formatDate(row.to) },
    { key: 'days', header: 'Days', align: 'right' },
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
        row.status === 'pending' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirm({ id: row.id, action: 'reject' })}>Reject</Button>
            <Button size="sm" onClick={() => setConfirm({ id: row.id, action: 'approve' })}>Approve</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Leave"
        description="Leave applications, balances and approvals."
        actions={<Button onClick={openCreate}>Apply leave</Button>}
      />

      <Card>
        <DataTable
          caption="Leave applications"
          columns={columns}
          data={apps}
          getRowId={(row) => row.id}
          isLoading={loading}
          error={error ?? undefined}
          onRetry={load}
          emptyTitle="No leave applications"
          emptyDescription="Apply for leave or wait for team requests."
          emptyAction={<Button onClick={openCreate}>Apply leave</Button>}
        />
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Apply for leave"
        description="Submit a new leave application."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={acting}>Cancel</Button>
            <Button onClick={submitApply} isLoading={acting}>Submit application</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Employee" htmlFor="employee" help="Defaults to you if left blank">
            <Select
              id="employee"
              placeholder="Select employee"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              options={employees.map((e) => ({ value: e.id, label: e.name }))}
            />
          </FormField>
          <FormField label="Leave type" htmlFor="leaveType" required error={formErrors.leaveTypeId}>
            <Select
              id="leaveType"
              placeholder="Select leave type"
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              options={leaveTypes.map((l) => ({ value: l.id, label: l.name }))}
            />
          </FormField>
          <FormField label="From" htmlFor="from" required error={formErrors.from}>
            <TextField id="from" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </FormField>
          <FormField label="To" htmlFor="to" required error={formErrors.to}>
            <TextField id="to" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Reason" htmlFor="reason">
              <TextArea id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional reason" />
            </FormField>
          </div>
          <div className="sm:col-span-2 text-sm text-ink-muted">
            {form.from && form.to
              ? `Duration: ${diffDays(form.from, form.to)} day(s)`
              : 'Pick a start and end date to see the duration.'}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={acting}
        title={confirm?.action === 'approve' ? 'Approve leave?' : 'Reject leave?'}
        message={confirm?.action === 'approve'
          ? 'The application will be marked approved and the balance adjusted.'
          : 'The application will be marked rejected.'}
        confirmLabel={confirm?.action === 'approve' ? 'Approve' : 'Reject'}
        variant={confirm?.action === 'approve' ? 'primary' : 'danger'}
      />
    </div>
  );
}

export default Leave;
