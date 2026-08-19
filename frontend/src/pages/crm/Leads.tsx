import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextArea, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'social', label: 'Social Media' },
];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  new: 'info',
  contacted: 'warning',
  qualified: 'success',
  proposal: 'info',
  negotiation: 'warning',
  won: 'success',
  lost: 'danger',
};

function CRMLeads() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getCRMLeads()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { api.getCRMCustomers().then((data) => setCustomers(data.rows ?? [])); }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createCRMLead({
        customerId: String(fd.get('customerId')),
        source: String(fd.get('source')),
        estimatedValue: Number(fd.get('estimatedValue')),
        expectedCloseDate: String(fd.get('expectedCloseDate')),
        assignedTo: String(fd.get('assignedTo') || ''),
        notes: String(fd.get('notes') || ''),
      });
      notify({ title: 'Lead created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'customerId', header: 'Customer', render: (row) => customers.find((c) => c.id === row.customerId)?.name ?? row.customerId },
    { key: 'source', header: 'Source' },
    {
      key: 'probability',
      header: 'Probability',
      align: 'right',
      render: (row) => `${row.probability}%`,
    },
    {
      key: 'estimatedValue',
      header: 'Est. Value',
      align: 'right',
      render: (row) => <span className="tabular-nums">₹{row.estimatedValue.toLocaleString('en-IN')}</span>,
    },
    { key: 'expectedCloseDate', header: 'Expected Close', hideBelow: 'md' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading leads…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Leads" subtitle="Track prospects and opportunities." actions={<Button onClick={() => setOpen(true)}>New Lead</Button>} />
      <DataTable
        caption="Leads"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No leads"
        emptyDescription="Create your first lead to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Lead" description="Add a new sales lead." footer={<Button type="submit" form="lead-form" isLoading={busy}>Create</Button>}>
        <form id="lead-form" onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Customer" htmlFor="lead-cust" required>
              <Select id="lead-cust" name="customerId" options={customers.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select customer" required />
            </FormField>
            <FormField label="Source" htmlFor="lead-src" required>
              <Select id="lead-src" name="source" options={SOURCES} required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Estimated Value" htmlFor="lead-val" required>
              <TextField id="lead-val" name="estimatedValue" type="number" min={0} required />
            </FormField>
            <FormField label="Expected Close Date" htmlFor="lead-close" required>
              <TextField id="lead-close" name="expectedCloseDate" type="date" required />
            </FormField>
          </div>
          <FormField label="Assigned To" htmlFor="lead-assign">
            <TextField id="lead-assign" name="assignedTo" placeholder="Sales Team A" />
          </FormField>
          <FormField label="Notes" htmlFor="lead-notes">
            <TextArea id="lead-notes" name="notes" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default CRMLeads;
