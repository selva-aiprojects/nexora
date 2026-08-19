import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextArea, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  partially_accepted: 'info',
};

function ProcurementGRNs() {
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
    api.getProcurementGRNs()
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
      await api.createProcurementGRN({
        poId: String(fd.get('poId')),
        vendorId: String(fd.get('vendorId')),
        number: String(fd.get('number')),
        date: String(fd.get('date')),
        qty: Number(fd.get('qty')),
        acceptedQty: Number(fd.get('acceptedQty')),
        rejectedQty: Number(fd.get('rejectedQty')),
        remarks: String(fd.get('remarks') || ''),
      });
      notify({ title: 'GRN created', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'number', header: 'GRN #', sortable: true },
    { key: 'poId', header: 'PO Ref', hideBelow: 'md' },
    { key: 'vendorId', header: 'Vendor', render: (row) => vendors.find((v) => v.id === row.vendorId)?.name ?? row.vendorId },
    { key: 'date', header: 'Date', sortable: true },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">
          {row.acceptedQty}/{row.qty}
          {row.rejectedQty > 0 && <span className="text-danger"> (-{row.rejectedQty})</span>}
        </span>
      ),
    },
    { key: 'remarks', header: 'Remarks', hideBelow: 'md' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading GRNs…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Goods Receipt Notes" subtitle="Inward goods inspection and acceptance records." actions={<Button onClick={() => setOpen(true)}>New GRN</Button>} />
      <DataTable
        caption="GRNs"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No GRNs"
        emptyDescription="Create your first GRN to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New GRN" description="Record goods receipt with inspection details." footer={<Button type="submit" form="grn-form" isLoading={busy}>Create</Button>}>
        <form id="grn-form" onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="PO Ref" htmlFor="grn-po" required>
              <TextField id="grn-po" name="poId" placeholder="po_0001" required />
            </FormField>
            <FormField label="Vendor" htmlFor="grn-ven" required>
              <Select id="grn-ven" name="vendorId" options={vendors.map((v) => ({ value: v.id, label: v.name }))} placeholder="Select vendor" required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="GRN Number" htmlFor="grn-num" required>
              <TextField id="grn-num" name="number" placeholder="GRN-2026-002" required />
            </FormField>
            <FormField label="Date" htmlFor="grn-date" required>
              <TextField id="grn-date" name="date" type="date" required />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Total Qty" htmlFor="grn-qty" required>
              <TextField id="grn-qty" name="qty" type="number" min={0} required />
            </FormField>
            <FormField label="Accepted Qty" htmlFor="grn-accepted" required>
              <TextField id="grn-accepted" name="acceptedQty" type="number" min={0} required />
            </FormField>
            <FormField label="Rejected Qty" htmlFor="grn-rejected" required>
              <TextField id="grn-rejected" name="rejectedQty" type="number" min={0} required />
            </FormField>
          </div>
          <FormField label="Remarks" htmlFor="grn-remarks">
            <TextArea id="grn-remarks" name="remarks" placeholder="Inspection remarks, damage notes" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default ProcurementGRNs;
