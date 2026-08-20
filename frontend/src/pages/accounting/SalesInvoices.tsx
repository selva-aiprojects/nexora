import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  type Column,
  EmptyState,
  FormField,
  Modal,
  Select,
  SkeletonText,
  TextField,
  useToast,
  formatINR,
} from '@/components';
import { api, type Customer, type SalesInvoice } from '@/lib/api';
import { exportTableToCSV } from '@/lib/export';
import { TableToolbar } from '@/components/toolbar/TableToolbar';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  approved: 'info',
  cancelled: 'neutral',
  draft: 'neutral',
};

interface LineItem {
  item: string;
  qty: number;
  rate: number;
  gstRate: number;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function lineAmount(l: LineItem) {
  return (Number(l.qty) || 0) * (Number(l.rate) || 0);
}

function emptyLine(): LineItem {
  return { item: '', qty: 1, rate: 0, gstRate: 18 };
}

export default function SalesInvoices() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [invoices, setInvoices] = React.useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [filters, setFilters] = React.useState<{ search?: string; status?: string }>({});

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ customerId: '', date: today(), dueDate: today(), lines: [] as LineItem[] });

  const [detail, setDetail] = React.useState<SalesInvoice | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [receipt, setReceipt] = React.useState({ amount: '', date: today() });
  const [receipting, setReceipting] = React.useState(false);

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([api.getSalesInvoices({ pageSize: 100 }), api.getCustomers()])
      .then(([inv, cus]) => {
        let rows = inv.rows ?? [];
        if (filters.status) rows = rows.filter((r) => r.status === filters.status);
        if (filters.search) {
          const q = filters.search.toLowerCase();
          rows = rows.filter((r) => r.number.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q));
        }
        setInvoices(rows);
        setCustomers(cus.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, [filters]);

  function openCreate() {
    setForm({ customerId: customers[0]?.id ?? '', date: today(), dueDate: today(), lines: [emptyLine()] });
    setCreateOpen(true);
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  }

  function removeLine(idx: number) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }

  const subtotal = form.lines.reduce((s, l) => s + lineAmount(l), 0);
  const gstTotal = form.lines.reduce((s, l) => s + (lineAmount(l) * (Number(l.gstRate) || 0)) / 100, 0);
  const grandTotal = Math.round(subtotal + gstTotal);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || form.lines.length === 0 || form.lines.some((l) => !l.item.trim() || (Number(l.qty) || 0) <= 0)) {
      notify({ title: 'Incomplete invoice', description: 'Pick a customer and add at least one valid line.', tone: 'danger' });
      return;
    }
    setSaving(true);
    try {
      const lineItems = form.lines.map((l) => ({
        item: l.item.trim(),
        qty: Number(l.qty) || 0,
        rate: Number(l.rate) || 0,
        amount: lineAmount(l),
        gstRate: Number(l.gstRate) || 0,
      }));
      await api.createSalesInvoice({ customerId: form.customerId, date: form.date, dueDate: form.dueDate, lineItems });
      notify({ title: 'Sales invoice raised', description: 'Customer has been billed.', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not raise invoice', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  function openReceipt(inv: SalesInvoice) {
    setDetail(inv);
    setReceipt({ amount: String(Math.max(0, inv.total - (inv.paid ?? 0))), date: today() });
    setReceiptOpen(true);
  }

  async function submitReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const amount = Number(receipt.amount);
    if (!amount || amount <= 0) {
      notify({ title: 'Enter an amount', description: 'Receipt amount must be greater than zero.', tone: 'danger' });
      return;
    }
    setReceipting(true);
    try {
      const updated = await api.addReceipt(detail.id, { amount, date: receipt.date });
      notify({ title: 'Receipt recorded', description: `${formatINR(amount)} received.`, tone: 'success' });
      setReceiptOpen(false);
      const refreshed = invoices.map((i) => (i.id === updated.id ? updated : i));
      setInvoices(refreshed);
      setDetail(updated);
    } catch (err: any) {
      notify({ title: 'Could not record receipt', description: err.message, tone: 'danger' });
    } finally {
      setReceipting(false);
    }
  }

  const columns: Column<SalesInvoice>[] = [
    { key: 'number', header: 'Invoice #', width: '120px' },
    { key: 'customerName', header: 'Customer', sortable: true },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.total)}</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      hideBelow: 'md',
      render: (row) => <span className="tabular-nums text-ink-muted">{formatINR(row.paid)}</span>,
    },
    { key: 'dueDate', header: 'Due', width: '120px', hideBelow: 'md', render: (row) => row.dueDate },
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
          <Button size="sm" variant="ghost" onClick={() => setDetail(row)}>View</Button>
          {row.status !== 'paid' && row.status !== 'cancelled' && (
            <Button size="sm" variant="secondary" onClick={() => openReceipt(row)}>Receipt</Button>
          )}
        </div>
      ),
    },
  ];

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));
  const outstanding = detail ? Math.max(0, detail.total - (detail.paid ?? 0)) : 0;

  return (
    <TableToolbar
      title="Sales invoices"
      subtitle="Raise customer invoices and record the payments you receive."
      data={invoices}
      columns={columns}
      filename="sales-invoices"
      filters={filters}
      onFiltersChange={setFilters}
      onReset={() => setFilters({})}
      showFilterBar
      filterProps={{
        searchPlaceholder: 'Search invoices...',
        showStatus: true,
        statusOptions: [
          { value: 'draft', label: 'Draft' },
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      }}
      selectedIds={selectedIds}
      onSelectionClear={() => setSelectedIds(new Set())}
      bulkActions={[
        { label: 'Export selected', onClick: () => { const selected = invoices.filter((i) => selectedIds.has(i.id)); exportTableToCSV(columns, selected, 'sales-invoices-selected'); } },
      ]}
      extraActions={<Button onClick={openCreate}>+ New invoice</Button>}
    >
      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load invoices" description={error} />
      ) : (
        <DataTable
          caption="Sales invoices"
          columns={columns}
          data={invoices}
          getRowId={(row) => row.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyTitle="No invoices yet"
          emptyDescription="Raise your first sales invoice to bill a customer."
          emptyAction={<Button onClick={openCreate}>+ New invoice</Button>}
        />
      )}
      <>
        <DataTable
          caption="Sales invoices"
          columns={columns}
          data={invoices}
          getRowId={(row) => row.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyTitle="No invoices yet"
          emptyDescription="Raise your first sales invoice to bill a customer."
          emptyAction={<Button onClick={openCreate}>+ New invoice</Button>}
        />

        <Modal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="New sales invoice"
          description="Bill a customer for goods or services."
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" form="si-form" isLoading={saving} loadingLabel="Raising">{grandTotal > 0 ? `Raise · ${formatINR(grandTotal)}` : 'Raise'}</Button>
            </>
          }
        >
          <form id="si-form" className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Customer" htmlFor="si-customer" required>
                <Select
                  id="si-customer"
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                  placeholder="Select customer"
                  options={customerOptions}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Date" htmlFor="si-date" required>
                  <TextField id="si-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </FormField>
                <FormField label="Due" htmlFor="si-due" required>
                  <TextField id="si-due" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </FormField>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">Line items</span>
                <Button type="button" size="sm" variant="ghost" onClick={addLine}>+ Add line</Button>
              </div>
              {form.lines.map((line, idx) => (
                <div key={idx} className="grid gap-2 rounded border border-border p-3 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-4">
                    <FormField label="Item" htmlFor={`si-item-${idx}`} required>
                      <TextField id={`si-item-${idx}`} value={line.item} onChange={(e) => updateLine(idx, { item: e.target.value })} placeholder="Item / service" />
                    </FormField>
                  </div>
                  <div className="sm:col-span-2">
                    <FormField label="Qty" htmlFor={`si-qty-${idx}`}>
                      <TextField id={`si-qty-${idx}`} type="number" min={0} value={line.qty} onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })} />
                    </FormField>
                  </div>
                  <div className="sm:col-span-2">
                    <FormField label="Rate" htmlFor={`si-rate-${idx}`}>
                      <TextField id={`si-rate-${idx}`} type="number" min={0} value={line.rate} onChange={(e) => updateLine(idx, { rate: Number(e.target.value) })} />
                    </FormField>
                  </div>
                  <div className="sm:col-span-2">
                    <FormField label="GST %" htmlFor={`si-gst-${idx}`}>
                      <TextField id={`si-gst-${idx}`} type="number" min={0} value={line.gstRate} onChange={(e) => updateLine(idx, { gstRate: Number(e.target.value) })} />
                    </FormField>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between gap-1">
                    <span className="text-sm tabular-nums text-ink-muted">{formatINR(lineAmount(line))}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(idx)} disabled={form.lines.length <= 1}>✕</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-6 rounded bg-canvas px-3 py-2 text-sm">
              <span className="text-ink-muted">Subtotal {formatINR(subtotal)}</span>
              <span className="text-ink-muted">GST {formatINR(Math.round(gstTotal))}</span>
              <span className="font-semibold text-ink">Total {formatINR(grandTotal)}</span>
            </div>
          </form>
        </Modal>

        <Modal
          open={!!detail}
          onClose={() => setDetail(null)}
          title={detail ? `Invoice ${detail.number}` : ''}
          description={detail?.customerName}
          size="lg"
          footer={
            <>
              {detail && detail.status !== 'paid' && detail.status !== 'cancelled' && (
                <Button onClick={() => openReceipt(detail)}>Record receipt</Button>
              )}
              <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            </>
          }
        >
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-ink-muted">Date</div>
                  <div className="font-medium text-ink">{detail.date}</div>
                </div>
                <div>
                  <div className="text-ink-muted">Due</div>
                  <div className="font-medium text-ink">{detail.dueDate}</div>
                </div>
                <div>
                  <div className="text-ink-muted">Total</div>
                  <div className="font-medium text-ink tabular-nums">{formatINR(detail.total)}</div>
                </div>
                <div>
                  <div className="text-ink-muted">Outstanding</div>
                  <div className="font-medium text-ink tabular-nums">{formatINR(outstanding)}</div>
                </div>
              </div>
              <div className="overflow-hidden rounded border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-canvas/60 text-ink-muted">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Rate</th>
                      <th className="px-3 py-2 text-right font-medium">GST%</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.lineItems ?? []).map((l: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-ink">{l.item}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{l.qty}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{l.rate}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{l.gstRate}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{formatINR(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-6 text-sm">
                <span className="text-ink-muted">GST {formatINR(detail.gstTotal)}</span>
                <span className="font-semibold text-ink">Total {formatINR(detail.total)}</span>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          title="Record receipt"
          description={detail ? `Invoice ${detail.number} · ${detail.customerName}` : ''}
          footer={
            <>
              <Button variant="secondary" onClick={() => setReceiptOpen(false)} disabled={receipting}>Cancel</Button>
              <Button type="submit" form="receipt-form" isLoading={receipting} loadingLabel="Saving">Record receipt</Button>
            </>
          }
        >
          <form id="receipt-form" className="space-y-4" onSubmit={submitReceipt}>
            <div className="rounded bg-canvas px-3 py-2 text-sm text-ink-muted">
              Outstanding: <span className="font-medium text-ink tabular-nums">{formatINR(outstanding)}</span>
            </div>
            <FormField label="Amount received" htmlFor="rcpt-amount" required>
              <TextField
                id="rcpt-amount"
                type="number"
                min={0}
                max={outstanding}
                value={receipt.amount}
                onChange={(e) => setReceipt((r) => ({ ...r, amount: e.target.value }))}
                placeholder="0"
              />
            </FormField>
            <FormField label="Date" htmlFor="rcpt-date" required>
              <TextField id="rcpt-date" type="date" value={receipt.date} onChange={(e) => setReceipt((r) => ({ ...r, date: e.target.value }))} />
            </FormField>
          </form>
        </Modal>
      </>
    </TableToolbar>
  );
}
