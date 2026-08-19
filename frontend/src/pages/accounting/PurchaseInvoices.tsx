import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  type Column,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  SkeletonText,
  TextField,
  useToast,
  formatINR,
} from '@/components';
import { api, type PurchaseInvoice } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  approved: 'info',
  overdue: 'danger',
  cancelled: 'neutral',
  draft: 'neutral',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PurchaseInvoices() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [invoices, setInvoices] = React.useState<PurchaseInvoice[]>([]);

  const [approveTarget, setApproveTarget] = React.useState<PurchaseInvoice | null>(null);
  const [approving, setApproving] = React.useState(false);

  const [detail, setDetail] = React.useState<PurchaseInvoice | null>(null);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payment, setPayment] = React.useState({ amount: '', date: today() });
  const [paying, setPaying] = React.useState(false);

  function load() {
    setLoading(true);
    setError(null);
    return api.getPurchaseInvoices({ pageSize: 100 })
      .then((res) => setInvoices(res.rows ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  async function confirmApprove() {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const updated = await api.approvePurchaseInvoice(approveTarget.id);
      notify({ title: 'Invoice approved', description: `${updated.number} is ready for payment.`, tone: 'success' });
      setApproveTarget(null);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err: any) {
      notify({ title: 'Could not approve', description: err.message, tone: 'danger' });
    } finally {
      setApproving(false);
    }
  }

  function openPayment(inv: PurchaseInvoice) {
    setDetail(inv);
    setPayment({ amount: String(Math.max(0, inv.total - (inv.paid ?? 0))), date: today() });
    setPayOpen(true);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const amount = Number(payment.amount);
    if (!amount || amount <= 0) {
      notify({ title: 'Enter an amount', description: 'Payment amount must be greater than zero.', tone: 'danger' });
      return;
    }
    setPaying(true);
    try {
      const updated = await api.addPurchasePayment(detail.id, { amount, date: payment.date });
      notify({ title: 'Payment recorded', description: `${formatINR(amount)} paid.`, tone: 'success' });
      setPayOpen(false);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setDetail(updated);
    } catch (err: any) {
      notify({ title: 'Could not record payment', description: err.message, tone: 'danger' });
    } finally {
      setPaying(false);
    }
  }

  const columns: Column<PurchaseInvoice>[] = [
    { key: 'number', header: 'Bill #', width: '120px' },
    { key: 'vendorName', header: 'Vendor', sortable: true },
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
          {row.status === 'pending' && (
            <Button size="sm" variant="secondary" onClick={() => setApproveTarget(row)}>Approve</Button>
          )}
          {row.status !== 'paid' && row.status !== 'pending' && row.status !== 'cancelled' && (
            <Button size="sm" onClick={() => openPayment(row)}>Pay</Button>
          )}
        </div>
      ),
    },
  ];

  const outstanding = detail ? Math.max(0, detail.total - (detail.paid ?? 0)) : 0;
  const canPay = detail && detail.status !== 'pending' && detail.status !== 'cancelled';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Purchase invoices"
        subtitle="Approve vendor bills and record the payments you make."
      />

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load purchase invoices" description={error} />
      ) : (
        <DataTable
          caption="Purchase invoices"
          columns={columns}
          data={invoices}
          getRowId={(row) => row.id}
          emptyTitle="No purchase invoices yet"
          emptyDescription="Vendor bills will appear here once recorded."
        />
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Bill ${detail.number}` : ''}
        description={detail?.vendorName}
        size="lg"
        footer={
          <>
            {detail?.status === 'pending' && (
              <Button variant="secondary" onClick={() => { setApproveTarget(detail); setDetail(null); }}>Approve</Button>
            )}
            {canPay && (
              <Button onClick={() => openPayment(detail!)}>Record payment</Button>
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
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record payment"
        description={detail ? `Bill ${detail.number} · ${detail.vendorName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)} disabled={paying}>Cancel</Button>
            <Button type="submit" form="pay-form" isLoading={paying} loadingLabel="Saving">Record payment</Button>
          </>
        }
      >
        <form id="pay-form" className="space-y-4" onSubmit={submitPayment}>
          <div className="rounded bg-canvas px-3 py-2 text-sm text-ink-muted">
            Outstanding: <span className="font-medium text-ink tabular-nums">{formatINR(outstanding)}</span>
          </div>
          <FormField label="Amount paid" htmlFor="pay-amount" required>
            <TextField
              id="pay-amount"
              type="number"
              min={0}
              max={outstanding}
              value={payment.amount}
              onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
              placeholder="0"
            />
          </FormField>
          <FormField label="Date" htmlFor="pay-date" required>
            <TextField id="pay-date" type="date" value={payment.date} onChange={(e) => setPayment((p) => ({ ...p, date: e.target.value }))} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={confirmApprove}
        title="Approve purchase invoice?"
        description={approveTarget ? `${approveTarget.number} from ${approveTarget.vendorName} will be marked approved.` : undefined}
        confirmLabel="Approve"
        loading={approving}
      />
    </div>
  );
}
