import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  confirmed: 'success',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

function CRMSalesOrders() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getCRMSalesOrders()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    api.getCRMCustomers().then((data) => setCustomers(data.rows ?? []));
    api.getCRMQuotes().then((data) => setQuotes(data.rows ?? []));
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createCRMSalesOrder({
        customerId: String(fd.get('customerId')),
        quoteId: String(fd.get('quoteId')),
        number: String(fd.get('number')),
        date: String(fd.get('date')),
        deliveryDate: String(fd.get('deliveryDate')),
        total: Number(fd.get('total')),
        currency: 'INR',
      });
      notify({ title: 'Sales order created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const acceptedQuotes = quotes.filter((q: any) => q.status === 'accepted');

  const columns: Column<any>[] = [
    { key: 'number', header: 'SO #', sortable: true },
    { key: 'customerId', header: 'Customer', render: (row) => customers.find((c) => c.id === row.customerId)?.name ?? row.customerId },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'deliveryDate', header: 'Delivery Date', hideBelow: 'md' },
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

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading sales orders…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Sales Orders" subtitle="Customer orders and fulfillment tracking." actions={<Button onClick={() => setOpen(true)}>New Sales Order</Button>} />
      <DataTable
        caption="Sales Orders"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No sales orders"
        emptyDescription="Create your first sales order to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Sales Order" description="Create a new sales order." footer={<Button type="submit" form="so-form" isLoading={busy}>Create</Button>}>
        <form id="so-form" onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Customer" htmlFor="so-cust" required>
              <Select id="so-cust" name="customerId" options={customers.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select customer" required />
            </FormField>
            <FormField label="Quote (optional)" htmlFor="so-quote">
              <Select id="so-quote" name="quoteId" options={acceptedQuotes.map((q: any) => ({ value: q.id, label: `${q.number} — ₹${q.total}` }))} placeholder="Select quote" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="SO Number" htmlFor="so-num" required>
              <TextField id="so-num" name="number" placeholder="SO-2026-002" required />
            </FormField>
            <FormField label="Date" htmlFor="so-date" required>
              <TextField id="so-date" name="date" type="date" required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Delivery Date" htmlFor="so-deliv" required>
              <TextField id="so-deliv" name="deliveryDate" type="date" required />
            </FormField>
            <FormField label="Total" htmlFor="so-total" required>
              <TextField id="so-total" name="total" type="number" min={0} step="0.01" required />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CRMSalesOrders;
