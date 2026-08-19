import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextArea, TextField, useToast } from '@/components';
import { api } from '@/lib/api';

const LEAVE_TYPES = [
  { value: 'lv_cl', label: 'Casual Leave' },
  { value: 'lv_sl', label: 'Sick Leave' },
  { value: 'lv_pl', label: 'Privilege Leave' },
];

export default function ESSLeave() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getESSLeave()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createESSLeave({
        leaveTypeId: String(fd.get('leaveTypeId')),
        from: String(fd.get('from')),
        to: String(fd.get('to')),
        days: Number(fd.get('days')),
        reason: String(fd.get('reason') || ''),
      });
      notify({ title: 'Leave applied', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading leave…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Leave" subtitle="Apply and track leave requests." actions={<Button onClick={() => setOpen(true)}>Apply Leave</Button>} />
      <DataTable
        caption="Leave applications"
        columns={[
          { key: 'from', header: 'From', sortable: true },
          { key: 'to', header: 'To' },
          { key: 'days', header: 'Days', align: 'right' },
          { key: 'reason', header: 'Reason', hideBelow: 'md' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge tone={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'} withDot>{row.status}</Badge>,
          },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No leave applications"
        emptyDescription="Apply for leave to see it here."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Apply leave" description="Submit a new leave request." footer={<Button type="submit" form="ess-leave-form" isLoading={busy}>Submit</Button>}>
        <form id="ess-leave-form" onSubmit={submit} className="mt-4 grid gap-4">
          <FormField label="Leave type" htmlFor="ess-leave-type" required>
            <Select id="ess-leave-type" name="leaveTypeId" options={LEAVE_TYPES} placeholder="Select type" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="From" htmlFor="ess-from" required>
              <TextField id="ess-from" name="from" type="date" required />
            </FormField>
            <FormField label="To" htmlFor="ess-to" required>
              <TextField id="ess-to" name="to" type="date" required />
            </FormField>
          </div>
          <FormField label="Days" htmlFor="ess-days" required>
            <TextField id="ess-days" name="days" type="number" min={1} required />
          </FormField>
          <FormField label="Reason" htmlFor="ess-reason">
            <TextArea id="ess-reason" name="reason" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
