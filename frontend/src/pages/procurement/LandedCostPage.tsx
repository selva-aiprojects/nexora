import * as React from 'react';
import { api } from '@/lib/api';
import { Button, Badge, Card, StatCard, DataTable, FormField, Modal, useToast, type Column } from '@/components';
import { TextField } from '@/components';
import { formatINR, formatDate } from '@/lib/utils';

export default function LandedCostPage() {
  const { notify } = useToast();
  const [vouchers, setVouchers] = React.useState<any[]>([]);
  const [grns, setGrns] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedVoucher, setSelectedVoucher] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [selectedGrnId, setSelectedGrnId] = React.useState('');
  const [allocationBasis, setAllocationBasis] = React.useState<'value' | 'quantity'>('value');
  const [charges, setCharges] = React.useState([
    { type: 'Freight & Transportation', amount: '12000', vendorName: 'LogiTrans Pvt Ltd' },
    { type: 'Customs Duty & Surcharge', amount: '6500', vendorName: 'Customs Authority' },
  ]);
  const [items] = React.useState([
    { itemId: 'itm_001', itemName: 'Steel Sheets (Grade A)', receivedQty: 400, purchaseRate: 850 },
    { itemId: 'itm_002', itemName: 'Copper Wiring (50m roll)', receivedQty: 100, purchaseRate: 1000 },
  ]);
  const [calculatedPreview, setCalculatedPreview] = React.useState<any>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, gRes] = await Promise.all([
        api.request<any>('/procurement/landed-costs'),
        api.getProcurementGRNs ? api.getProcurementGRNs() : api.request<any>('/procurement/grns'),
      ]);
      setVouchers(vRes.rows || vRes);
      setGrns(gRes.rows || gRes);
    } catch (err: any) {
      notify({ title: 'Failed to load landed costs', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleCalculatePreview = async () => {
    try {
      const validCharges = charges.filter(c => Number(c.amount) > 0);
      const res = await api.request<any>('/procurement/landed-costs/calculate', {
        method: 'POST',
        body: JSON.stringify({
          allocationBasis,
          charges: validCharges.map(c => ({ ...c, amount: Number(c.amount) })),
          items: items.map(i => ({ ...i, receivedQty: Number(i.receivedQty), purchaseRate: Number(i.purchaseRate) })),
        }),
      });
      setCalculatedPreview(res);
    } catch (err: any) {
      notify({ title: 'Calculation error', description: err.message, tone: 'danger' });
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrnId) {
      notify({ title: 'Please select a GRN', tone: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const validCharges = charges.filter(c => Number(c.amount) > 0);
      await api.request<any>('/procurement/landed-costs', {
        method: 'POST',
        body: JSON.stringify({
          grnId: selectedGrnId,
          allocationBasis,
          charges: validCharges.map(c => ({ ...c, amount: Number(c.amount) })),
          items: items.map(i => ({ ...i, receivedQty: Number(i.receivedQty), purchaseRate: Number(i.purchaseRate) })),
        }),
      });
      notify({ title: 'Landed Cost Voucher Created', tone: 'success' });
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      notify({ title: 'Error creating voucher', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handlePostVoucher = async (id: string) => {
    try {
      const res = await api.request<any>(`/procurement/landed-costs/${id}/post`, { method: 'POST' });
      notify({ title: 'Posted to Inventory', description: res.message, tone: 'success' });
      loadData();
      if (selectedVoucher?.id === id) setDetailModalOpen(false);
    } catch (err: any) {
      notify({ title: 'Post failed', description: err.message, tone: 'danger' });
    }
  };

  const addCharge = () => {
    setCharges([...charges, { type: 'Handling & Storage', amount: '0', vendorName: '' }]);
  };

  const totalCharges = vouchers.reduce((sum, v) => sum + (Number(v.totalCharges) || 0), 0);
  const postedCount = vouchers.filter(v => v.status === 'posted').length;

  const columns: Column<any>[] = [
    {
      key: 'voucherNumber',
      header: 'Voucher #',
      render: (row) => <span className="font-mono text-xs font-semibold text-primary">{row.voucherNumber}</span>,
    },
    {
      key: 'grn',
      header: 'GRN Ref',
      render: (row) => <span className="text-xs text-ink font-medium">{row.grnNumber || row.grnId}</span>,
    },
    {
      key: 'basis',
      header: 'Allocation Basis',
      render: (row) => (
        <Badge tone="info">By {String(row.allocationBasis).toUpperCase()}</Badge>
      ),
    },
    {
      key: 'charges',
      header: 'Total Landed Charges',
      render: (row) => <span className="text-xs font-bold text-ink">{formatINR(row.totalCharges)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'posted' ? 'success' : 'warning'}>
          {row.status ? row.status.toUpperCase() : 'DRAFT'}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Created Date',
      render: (row) => <span className="text-xs text-ink-muted">{formatDate(row.createdAt?.slice(0, 10) || '')}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedVoucher(row); setDetailModalOpen(true); }}>
            View Allocations
          </Button>
          {row.status !== 'posted' && (
            <Button variant="primary" size="sm" onClick={() => handlePostVoucher(row.id)}>
              Post to Stock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Landed Cost Allocation</h1>
          <p className="text-sm text-ink-muted">
            Capitalize freight, customs duties, and port handling directly onto received inventory line items.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => { setCreateModalOpen(true); handleCalculatePreview(); }}>
          + New Landed Cost Voucher
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Landed Vouchers" value={String(vouchers.length)} delta="All shipments" trend="flat" isLoading={loading} />
        <StatCard label="Total Capitalized Charges" value={formatINR(totalCharges, { compact: true })} delta="Freight, duties & insurance" trend="up" isLoading={loading} />
        <StatCard label="Valuation Posted" value={`${postedCount} of ${vouchers.length} Vouchers`} delta="Integrated with stock" trend="up" isLoading={loading} />
      </div>

      {/* Vouchers Table */}
      <DataTable
        columns={columns}
        data={vouchers}
        getRowId={row => row.id}
        caption="Landed Cost Vouchers"
        isLoading={loading}
        emptyTitle="No landed cost vouchers yet"
        emptyDescription="Create a voucher to allocate shipping and duty expenses to received goods."
      />

      {/* Create Voucher Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Landed Cost Voucher" size="lg">
        <form onSubmit={handleCreateVoucher} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Goods Receipt Note (GRN)" htmlFor="lc-grn" required>
              <select
                className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedGrnId}
                onChange={e => setSelectedGrnId(e.target.value)}
                required
              >
                <option value="">Select a GRN…</option>
                {grns.map(g => (
                  <option key={g.id} value={g.id}>{g.number || g.id} ({g.date || 'Recent'})</option>
                ))}
              </select>
            </FormField>

            <FormField label="Allocation Basis" htmlFor="lc-basis">
              <select
                className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                value={allocationBasis}
                onChange={e => { setAllocationBasis(e.target.value as any); setTimeout(handleCalculatePreview, 50); }}
              >
                <option value="value">By Purchase Value (Proportional to Cost)</option>
                <option value="quantity">By Received Quantity</option>
              </select>
            </FormField>
          </div>

          {/* Charges Section */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-ink">Landed Cost Charges (Freight / Duty / Port)</span>
              <Button type="button" variant="ghost" size="sm" onClick={addCharge}>+ Add Charge</Button>
            </div>
            {charges.map((charge, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <TextField
                  placeholder="Charge Type"
                  value={charge.type}
                  onChange={e => {
                    const next = [...charges]; next[i].type = e.target.value; setCharges(next);
                  }}
                />
                <TextField
                  type="number"
                  placeholder="Amount (INR)"
                  value={charge.amount}
                  onChange={e => {
                    const next = [...charges]; next[i].amount = e.target.value; setCharges(next);
                  }}
                />
                <TextField
                  placeholder="Vendor / Authority"
                  value={charge.vendorName}
                  onChange={e => {
                    const next = [...charges]; next[i].vendorName = e.target.value; setCharges(next);
                  }}
                />
              </div>
            ))}
            <div className="text-right font-bold text-xs text-primary pt-2 border-t border-border-strong">
              Total Additional Charges: {formatINR(charges.reduce((s, c) => s + (Number(c.amount) || 0), 0))}
            </div>
          </Card>

          <Button type="button" variant="secondary" size="sm" onClick={handleCalculatePreview} className="w-full">
            ⚡ Calculate Landed Cost Allocation Preview
          </Button>

          {/* Preview Table */}
          {calculatedPreview && (
            <div className="rounded-lg border border-border-strong bg-surface p-3 space-y-2">
              <div className="text-xs font-semibold text-ink">Item Landed Cost Preview</div>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-strong text-ink-muted">
                    <th className="py-1.5">Item</th>
                    <th className="py-1.5">Qty</th>
                    <th className="py-1.5">Base Rate</th>
                    <th className="py-1.5">Allocated Cost</th>
                    <th className="py-1.5">New Unit Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-strong">
                  {calculatedPreview.allocatedItems.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-1.5 font-medium">{item.itemName}</td>
                      <td className="py-1.5">{item.receivedQty}</td>
                      <td className="py-1.5">{formatINR(item.purchaseRate)}</td>
                      <td className="py-1.5 text-warning font-semibold">+{formatINR(item.allocatedCost)}</td>
                      <td className="py-1.5 text-success font-bold">{formatINR(item.landedCostPerUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-strong">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={saving}>Save Voucher</Button>
          </div>
        </form>
      </Modal>

      {/* View Detail Modal */}
      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Landed Cost Voucher: ${selectedVoucher?.voucherNumber || ''}`} size="lg">
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface border border-border-strong p-3 text-xs">
              <div><span className="text-ink-muted">GRN: </span><b>{selectedVoucher.grnNumber}</b></div>
              <div><span className="text-ink-muted">Basis: </span><b>By {selectedVoucher.allocationBasis}</b></div>
              <div><span className="text-ink-muted">Total Charges: </span><b className="text-success">{formatINR(selectedVoucher.totalCharges)}</b></div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-ink">Capitalized Item Valuations:</div>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-strong text-ink-muted">
                    <th className="py-2">Item Name</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Base Cost</th>
                    <th className="py-2">Allocated Freight/Duty</th>
                    <th className="py-2">Final Landed Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-strong">
                  {(selectedVoucher.items || []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">{item.itemName}</td>
                      <td className="py-2">{item.receivedQty}</td>
                      <td className="py-2">{formatINR(item.purchaseRate)}</td>
                      <td className="py-2 text-warning font-semibold">+{formatINR(item.allocatedCost)}</td>
                      <td className="py-2 text-success font-bold">{formatINR(item.landedCostPerUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedVoucher.status !== 'posted' && (
              <div className="pt-3 border-t border-border-strong flex justify-end">
                <Button variant="primary" onClick={() => handlePostVoucher(selectedVoucher.id)}>
                  Post Landed Cost to Stock Valuation
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
