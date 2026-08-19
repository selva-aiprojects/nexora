import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, TextField, TextArea, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  new: 'info',
  qualified: 'success',
  proposal: 'warning',
  won: 'success',
  lost: 'danger',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
  confirmed: 'success',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

function CRMCustomers() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getCRMCustomers()
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
      await api.createCRMCustomer({
        name: String(fd.get('name')),
        billingAddress: String(fd.get('billingAddress')),
        gstin: String(fd.get('gstin') || ''),
        shippingAddress: String(fd.get('shippingAddress') || ''),
        creditLimit: Number(fd.get('creditLimit')) || 0,
        paymentTerms: String(fd.get('paymentTerms') || 'Net 30'),
      });
      notify({ title: 'Customer created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'gstin', header: 'GSTIN', hideBelow: 'md' },
    { key: 'billingAddress', header: 'Billing Address', hideBelow: 'md' },
    { key: 'creditLimit', header: 'Credit Limit', align: 'right', render: (row) => <span className="tabular-nums">₹{row.creditLimit.toLocaleString('en-IN')}</span> },
    { key: 'paymentTerms', header: 'Payment Terms' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading customers…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Customers" subtitle="Customer master with contacts, credit limits and payment terms." actions={<Button onClick={() => setOpen(true)}>Add Customer</Button>} />
      <DataTable
        caption="Customers"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No customers"
        emptyDescription="Add your first customer to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Customer" description="Create a new customer record." footer={<Button type="submit" form="cust-form" isLoading={busy}>Create</Button>}>
        <form id="cust-form" onSubmit={submit} className="mt-4 grid gap-4">
          <FormField label="Name" htmlFor="cust-name" required>
            <TextField id="cust-name" name="name" placeholder="Acme Corp" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="GSTIN" htmlFor="cust-gstin">
              <TextField id="cust-gstin" name="gstin" placeholder="29ABCDE1234F1Z5" maxLength={15} />
            </FormField>
            <FormField label="Payment Terms" htmlFor="cust-pt">
              <TextField id="cust-pt" name="paymentTerms" placeholder="Net 30" />
            </FormField>
          </div>
          <FormField label="Billing Address" htmlFor="cust-ba" required>
            <TextArea id="cust-ba" name="billingAddress" placeholder="Full billing address" required />
          </FormField>
          <FormField label="Shipping Address" htmlFor="cust-sa">
            <TextArea id="cust-sa" name="shippingAddress" placeholder="Full shipping address" />
          </FormField>
          <FormField label="Credit Limit" htmlFor="cust-cl" required>
            <TextField id="cust-cl" name="creditLimit" type="number" min={0} required />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default CRMCustomers;
