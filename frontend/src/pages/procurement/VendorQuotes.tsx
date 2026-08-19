import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  sent: 'info',
  viewed: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
};

function ProcurementVendorQuotes() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getProcurementVendorQuotes()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { api.getProcurementVendors().then((data) => setVendors(data.rows ?? [])); }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createProcurementVendorQuote({
        vendorId: String(fd.get('vendorId')),
        number: String(fd.get('number')),
        date: String(fd.get('date')),
        validUntil: String(fd.get('validUntil')),
        total: Number(fd.get('total')),
        currency: 'INR',
      });
      notify({ title: 'Vendor quote created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'number', header: 'Quote #', sortable: true },
    { key: 'vendorId', header: 'Vendor', render: (row) => vendors.find((v) => v.id === row.vendorId)?.name ?? row.vendorId },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'validUntil', header: 'Valid Until', hideBelow: 'md' },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => <span className="tabular-nums">₹{row.total.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading vendor quotes…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Vendor Quotes" subtitle="RFQ responses and pricing from vendors." actions={<Button onClick={() => setOpen(true)}>New Quote</Button>} />
      <DataTable
        caption="Vendor Quotes"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No vendor quotes"
        emptyDescription="Create your first vendor quote to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Vendor Quote" description="Record a new vendor quote response." footer={<Button type="submit" form="vq-form" isLoading={busy}>Create</Button>}>
        <form id="vq-form" onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Vendor" htmlFor="vq-ven" required>
              <Select id="vq-ven" name="vendorId" options={vendors.map((v) => ({ value: v.id, label: v.name }))} placeholder="Select vendor" required />
            </FormField>
            <FormField label="Quote Number" htmlFor="vq-num" required>
              <TextField id="vq-num" name="number" placeholder="VQ-2026-003" required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" htmlFor="vq-date" required>
              <TextField id="vq-date" name="date" type="date" required />
            </FormField>
            <FormField label="Valid Until" htmlFor="vq-valid" required>
              <TextField id="vq-valid" name="validUntil" type="date" required />
            </FormField>
          </div>
          <FormField label="Total" htmlFor="vq-total" required>
            <TextField id="vq-total" name="total" type="number" min={0} step="0.01" required />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default ProcurementVendorQuotes;
