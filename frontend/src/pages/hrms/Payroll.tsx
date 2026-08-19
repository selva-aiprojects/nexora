import * as React from 'react';
import { Badge, Button, Card, ConfirmDialog, DataTable, type Column, FormField, Modal, PageHeader, TextField, useToast } from '@/components';
import { api, type HRMSPayrollRun, type HRMSPayslip } from '@/lib/api';
import { formatINR } from '@/lib/utils';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  paid: 'success',
  approved: 'success',
};

function Payroll() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [runs, setRuns] = React.useState<HRMSPayrollRun[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({ periodStart: '', periodEnd: '' });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const [approve, setApprove] = React.useState<HRMSPayrollRun | null>(null);
  const [payslipsFor, setPayslipsFor] = React.useState<HRMSPayrollRun | null>(null);
  const [payslips, setPayslips] = React.useState<HRMSPayslip[]>([]);
  const [payslipsLoading, setPayslipsLoading] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getHRMSPayrollRuns()
      .then((res) => { if (!cancelled) setRuns(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => load(), [load]);

  function openCreate() {
    setForm({ periodStart: '', periodEnd: '' });
    setFormErrors({});
    setCreateOpen(true);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.periodStart) errs.periodStart = 'Select a start date';
    if (!form.periodEnd) errs.periodEnd = 'Select an end date';
    if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart)
      errs.periodEnd = 'End must be after start';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitCreate() {
    if (!validate()) return;
    setActing(true);
    try {
      await api.createHRMSPayrollRun(form);
      notify({ title: 'Payroll run created', description: 'Payslips generated for active employees.', tone: 'success' });
      setCreateOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Could not create run', description: err.message, tone: 'danger' });
    } finally {
      setActing(false);
    }
  }

  async function runApprove() {
    if (!approve) return;
    setActing(true);
    try {
      await api.approveHRMSPayrollRun(approve.id);
      notify({ title: 'Payroll approved', description: 'The run is marked approved.', tone: 'success' });
      setApprove(null);
      load();
    } catch (err: any) {
      notify({ title: 'Approval failed', description: err.message, tone: 'danger' });
    } finally {
      setActing(false);
    }
  }

  async function openPayslips(run: HRMSPayrollRun) {
    setPayslipsFor(run);
    setPayslipsLoading(true);
    setPayslips([]);
    try {
      const res = await api.getHRMSPayslips(run.id);
      setPayslips(res);
    } catch (err: any) {
      notify({ title: 'Could not load payslips', description: err.message, tone: 'danger' });
    } finally {
      setPayslipsLoading(false);
    }
  }

  const columns: Column<HRMSPayrollRun>[] = [
    {
      key: 'period',
      header: 'Period',
      sortable: true,
      render: (row) => `${row.periodStart} → ${row.periodEnd}`,
    },
    { key: 'employeeCount', header: 'Employees', align: 'right' },
    {
      key: 'totalGross',
      header: 'Gross',
      align: 'right',
      render: (row) => formatINR(row.totalGross, { compact: true }),
    },
    {
      key: 'totalNet',
      header: 'Net',
      align: 'right',
      render: (row) => formatINR(row.totalNet, { compact: true }),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => openPayslips(row)}>Payslips</Button>
          {row.status === 'draft' && (
            <Button size="sm" onClick={() => setApprove(row)}>Approve</Button>
          )}
        </div>
      ),
    },
  ];

  const payslipColumns: Column<HRMSPayslip>[] = [
    { key: 'employeeName', header: 'Employee', sortable: true },
    { key: 'gross', header: 'Gross', align: 'right', render: (row) => formatINR(row.gross, { compact: true }) },
    { key: 'deductions', header: 'Deductions', align: 'right', render: (row) => formatINR(row.deductions, { compact: true }) },
    { key: 'net', header: 'Net', align: 'right', render: (row) => formatINR(row.net, { compact: true }) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Payroll"
        description="Run payroll, review payslips and approve disbursements."
        actions={<Button onClick={openCreate}>New payroll run</Button>}
      />

      <Card>
        <DataTable
          caption="Payroll runs"
          columns={columns}
          data={runs}
          getRowId={(row) => row.id}
          isLoading={loading}
          error={error ?? undefined}
          onRetry={load}
          emptyTitle="No payroll runs"
          emptyDescription="Create a payroll run to compute payslips."
          emptyAction={<Button onClick={openCreate}>New payroll run</Button>}
        />
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New payroll run"
        description="Computes payslips for all active employees."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={acting}>Cancel</Button>
            <Button onClick={submitCreate} isLoading={acting}>Generate run</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Period start" htmlFor="periodStart" required error={formErrors.periodStart}>
            <TextField id="periodStart" type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
          </FormField>
          <FormField label="Period end" htmlFor="periodEnd" required error={formErrors.periodEnd}>
            <TextField id="periodEnd" type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!payslipsFor}
        onClose={() => setPayslipsFor(null)}
        title="Payslips"
        description={payslipsFor ? `${payslipsFor.periodStart} → ${payslipsFor.periodEnd}` : undefined}
        size="lg"
      >
        <DataTable
          caption="Payslips"
          columns={payslipColumns}
          data={payslips}
          getRowId={(row) => row.id}
          isLoading={payslipsLoading}
          emptyTitle="No payslips"
          emptyDescription="This run has no generated payslips."
        />
      </Modal>

      <ConfirmDialog
        open={!!approve}
        onClose={() => setApprove(null)}
        onConfirm={runApprove}
        loading={acting}
        title="Approve payroll run?"
        message="Approved runs are locked for disbursement."
        confirmLabel="Approve"
        variant="primary"
      />
    </div>
  );
}

export default Payroll;
