import * as React from 'react';
import { Badge, Button, DataTable, Modal, FormField, Select, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';
import { TableToolbar } from '@/components/toolbar/TableToolbar';

const CATEGORIES = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'it_services', label: 'IT Services' },
  { value: 'consulting', label: 'Consulting' },
];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'danger',
};

function ProcurementVendors() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [filters, setFilters] = React.useState<{ search?: string; status?: string }>({});
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getProcurementVendors()
      .then((res) => {
        if (!cancelled) {
          let data = res.rows ?? [];
          if (filters.status) data = data.filter((r) => r.status === filters.status);
          if (filters.search) {
            const q = filters.search.toLowerCase();
            data = data.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
          }
          setRows(data);
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  React.useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createProcurementVendor({
        name: String(fd.get('name')),
        category: String(fd.get('category')),
        gstin: String(fd.get('gstin') || ''),
        rating: Number(fd.get('rating')) || 0,
        paymentTerms: String(fd.get('paymentTerms') || 'Net 30'),
      });
      notify({ title: 'Vendor created', tone: 'success' });
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
    { key: 'category', header: 'Category' },
    { key: 'gstin', header: 'GSTIN', hideBelow: 'md' },
    { key: 'rating', header: 'Rating', align: 'right', render: (row) => row.rating?.toFixed(1) },
    { key: 'paymentTerms', header: 'Payment Terms', hideBelow: 'md' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading vendors…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <TableToolbar
      title="Vendors"
      subtitle="Vendor master with ratings, categories and payment terms."
      data={rows}
      columns={columns}
      filename="vendors"
      filters={filters}
      onFiltersChange={setFilters}
      onReset={() => setFilters({})}
      showFilterBar
      filterProps={{
        searchPlaceholder: 'Search vendors...',
        showStatus: true,
        statusOptions: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'suspended', label: 'Suspended' },
        ],
      }}
      selectedIds={selectedIds}
      onSelectionClear={() => setSelectedIds(new Set())}
      bulkActions={[
        { label: 'Export selected', onClick: () => { /* export selectedIds */ } },
      ]}
      extraActions={<Button onClick={() => setOpen(true)}>Add Vendor</Button>}
    >
      <DataTable
        caption="Vendors"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyTitle="No vendors"
        emptyDescription="Add your first vendor to get started."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New Vendor" description="Create a new vendor record." footer={<Button type="submit" form="ven-form" isLoading={busy}>Create</Button>}>
        <form id="ven-form" onSubmit={submit} className="mt-4 grid gap-4">
          <FormField label="Name" htmlFor="ven-name" required>
            <TextField id="ven-name" name="name" placeholder="Steel Corp" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="ven-cat" required>
              <Select id="ven-cat" name="category" options={CATEGORIES} required />
            </FormField>
            <FormField label="GSTIN" htmlFor="ven-gstin">
              <TextField id="ven-gstin" name="gstin" placeholder="29ABCDE1234F1Z5" maxLength={15} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Rating" htmlFor="ven-rating">
              <TextField id="ven-rating" name="rating" type="number" min={0} max={5} step="0.1" />
            </FormField>
            <FormField label="Payment Terms" htmlFor="ven-pt">
              <TextField id="ven-pt" name="paymentTerms" placeholder="Net 30" />
            </FormField>
          </div>
        </form>
      </Modal>
    </TableToolbar>
  );
}

export default ProcurementVendors;
