import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextField, type Column, useToast, ConfirmDialog } from '@/components';
import { api } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  sent: 'info',
  viewed: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
  converted: 'success',
};

function CRMQuotes() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [convertId, setConvertId] = React.useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = React.useState('');

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getCRMQuotes()
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
      await api.createCRMQuote({
        customerId: String(fd.get('customerId')),
        number: String(fd.get('number')),
        date: String(fd.get('date')),
        validUntil: String(fd.get('validUntil')),
        total: Number(fd.get('total')),
        currency: 'INR',
      });
      notify({ title: 'Quote created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const handleConvert = async () => {
    if (!convertId) return;
    setBusy(true);
    try {
      await api.convertCRMQuote(convertId, { deliveryDate: deliveryDate || undefined });
      notify({ title: 'Converted to Sales Order', tone: 'success' });
      setConvertId(null);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'number', header: 'Quote #', sortable: true },
    { key: 'customerId', header: 'Customer', render: (row) => customers.find((c) => c.id === row.customerId)?.name ?? row.customerId },
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
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.status === 'accepted' && (
            <Button size="sm" variant="primary" onClick={() => { setConvertId(row.id); setDeliveryDate(''); }}>Convert</Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading quotes…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Quotes" subtitle="Sales quotes and proposals." actions={<Button onClick={() => setOpen(true)}>New Quote</Button>} />
      <DataTable
        caption="Quotes"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No quotes"
        emptyDescription="Create your first quote to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Quote" description="Create a new sales quote." footer={<Button type="submit" form="quote-form" isLoading={busy}>Create</Button>}>
        <form id="quote-form" onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Customer" htmlFor="quo-cust" required>
              <Select id="quo-cust" name="customerId" options={customers.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select customer" required />
            </FormField>
            <FormField label="Quote Number" htmlFor="quo-num" required>
              <TextField id="quo-num" name="number" placeholder="QT-2026-003" required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" htmlFor="quo-date" required>
              <TextField id="quo-date" name="date" type="date" required />
            </FormField>
            <FormField label="Valid Until" htmlFor="quo-valid" required>
              <TextField id="quo-valid" name="validUntil" type="date" required />
            </FormField>
          </div>
          <FormField label="Total" htmlFor="quo-total" required>
            <TextField id="quo-total" name="total" type="number" min={0} step="0.01" required />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!convertId}
        onClose={() => setConvertId(null)}
        onConfirm={handleConvert}
        title="Convert to Sales Order?"
        description="This will create a sales order from this quote with a default delivery date of 7 days."
        confirmLabel="Convert"
        confirmTone="primary"
        loading={busy}
      />
    </div>
  );
}

export default CRMQuotes;
