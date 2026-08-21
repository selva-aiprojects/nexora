import * as React from 'react';
import { api } from '@/lib/api';
import { Button, Badge, Card, StatCard, DataTable, Modal, useToast, type Column } from '@/components';
import { formatINR } from '@/lib/utils';

interface ReorderItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  avgDailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  leadTimeDemand: number;
  rop: number;
  eoq: number;
  shortfall: number;
  suggestedOrderQty: number;
  unitCost: number;
  estimatedOrderValue: number;
  status: 'critical_stockout' | 'reorder_needed' | 'healthy';
  daysOfInventory: number;
  preferredVendor: string;
  vendorId: string;
}

export default function ReorderPlanningPage() {
  const { notify } = useToast();
  const [data, setData] = React.useState<{ metrics: any; items: ReorderItem[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [prsModalOpen, setPrsModalOpen] = React.useState(false);
  const [generatedPrs, setGeneratedPrs] = React.useState<any[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const loadAnalysis = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<any>('/inventory/reorder/analysis');
      setData(res);
    } catch (err: any) {
      notify({ title: 'Failed to load reorder analysis', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  React.useEffect(() => { loadAnalysis(); }, [loadAnalysis]);

  const handleGeneratePrs = async () => {
    setGenerating(true);
    try {
      const res = await api.request<any>('/inventory/reorder/generate-prs', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setGeneratedPrs(res.prs || []);
      setPrsModalOpen(true);
      notify({ title: 'Purchase Requisitions Created', description: res.message, tone: 'success' });
      loadAnalysis();
    } catch (err: any) {
      notify({ title: 'Failed to generate PRs', description: err.message, tone: 'danger' });
    } finally {
      setGenerating(false);
    }
  };

  const filteredItems = (data?.items || []).filter(i => {
    if (statusFilter === 'all') return true;
    return i.status === statusFilter;
  });

  const columns: Column<ReorderItem>[] = [
    {
      key: 'item',
      header: 'Item & SKU',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink text-xs">{row.name}</div>
          <div className="font-mono text-[11px] text-ink-muted">{row.sku} • {row.category}</div>
        </div>
      ),
    },
    {
      key: 'stockVsRop',
      header: 'Stock vs. ROP',
      render: (row) => {
        const pct = row.rop > 0 ? Math.min(100, Math.round((row.currentStock / row.rop) * 100)) : 100;
        return (
          <div className="space-y-1 w-32">
            <div className="flex justify-between text-xs font-semibold">
              <span className={row.currentStock <= row.rop ? 'text-danger' : 'text-success'}>
                {row.currentStock} Units
              </span>
              <span className="text-ink-muted text-[11px]">ROP: {row.rop}</span>
            </div>
            <div className="h-1.5 w-full bg-border-strong rounded-full overflow-hidden">
              <div
                className={`h-full ${pct <= 50 ? 'bg-danger' : pct <= 100 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'daysOfInventory',
      header: 'Runout Runway',
      render: (row) => (
        <span className="text-xs font-medium">
          {row.daysOfInventory <= 3 ? (
            <span className="text-danger font-bold">⚠️ {row.daysOfInventory} Days</span>
          ) : (
            <span>{row.daysOfInventory} Days</span>
          )}
        </span>
      ),
    },
    {
      key: 'suggestedOrderQty',
      header: 'Suggested Order (EOQ)',
      render: (row) => (
        <div>
          <div className="text-xs font-bold text-primary">{row.suggestedOrderQty} Units</div>
          <div className="text-[11px] text-ink-muted">{formatINR(row.estimatedOrderValue)}</div>
        </div>
      ),
    },
    {
      key: 'vendor',
      header: 'Preferred Vendor',
      render: (row) => <span className="text-xs text-ink">{row.preferredVendor}</span>,
    },
    {
      key: 'status',
      header: 'Health Status',
      render: (row) => {
        if (row.status === 'critical_stockout') return <Badge tone="danger">OUT OF STOCK</Badge>;
        if (row.status === 'reorder_needed') return <Badge tone="warning">REORDER NEEDED</Badge>;
        return <Badge tone="success">HEALTHY</Badge>;
      },
    },
  ];

  const metrics = data?.metrics || {
    totalItems: 0,
    reorderNeeded: 0,
    criticalStockout: 0,
    healthy: 0,
    totalSuggestedOrderValue: 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Dynamic Reorder Point (ROP) Planning</h1>
          <p className="text-sm text-ink-muted">
            Automated supply chain buffer calculations: ROP = (Daily Demand × Lead Time) + Safety Stock.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleGeneratePrs}
            isLoading={generating}
            disabled={metrics.reorderNeeded + metrics.criticalStockout === 0}
          >
            ⚡ Auto-Generate Purchase Requisitions
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Critical Stockouts"
          value={String(metrics.criticalStockout)}
          delta="Immediate action needed"
          trend={metrics.criticalStockout > 0 ? 'down' : 'flat'}
          isLoading={loading}
        />
        <StatCard
          label="Below Reorder Point"
          value={String(metrics.reorderNeeded)}
          delta={`${metrics.reorderNeeded} items need purchase`}
          trend={metrics.reorderNeeded > 0 ? 'down' : 'flat'}
          isLoading={loading}
        />
        <StatCard
          label="Healthy Inventory"
          value={String(metrics.healthy)}
          delta="Sufficient buffer stock"
          trend="up"
          isLoading={loading}
        />
        <StatCard
          label="Suggested Replenishment"
          value={formatINR(metrics.totalSuggestedOrderValue, { compact: true })}
          delta="Optimized EOQ replenishment"
          trend="flat"
          isLoading={loading}
        />
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Inventory Items ({data?.items.length || 0})</option>
            <option value="reorder_needed">Below Reorder Point Only ({metrics.reorderNeeded})</option>
            <option value="critical_stockout">Critical Stockouts Only ({metrics.criticalStockout})</option>
            <option value="healthy">Healthy Stock ({metrics.healthy})</option>
          </select>
        </div>
        <div className="text-xs text-ink-muted">
          Showing <b>{filteredItems.length}</b> items
        </div>
      </Card>

      {/* Items Table */}
      <DataTable
        columns={columns}
        data={filteredItems}
        getRowId={row => row.id}
        caption="Inventory Reorder Analysis"
        isLoading={loading}
      />

      {/* Generated PRs Modal */}
      <Modal open={prsModalOpen} onClose={() => setPrsModalOpen(false)} title="🎉 Auto-Generated Purchase Requisitions" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            The system automatically created draft Purchase Requisitions with recommended Economic Order Quantities (EOQ) assigned to preferred vendors:
          </p>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-border-strong">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-raised">
                <tr className="border-b border-border-strong text-ink-muted">
                  <th className="py-2 px-3">PR #</th>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">Ordered Qty</th>
                  <th className="py-2 px-3">Estimated Cost</th>
                  <th className="py-2 px-3">Vendor</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-strong">
                {generatedPrs.map((pr, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-mono font-bold text-primary">{pr.prNumber}</td>
                    <td className="py-2 px-3 font-medium text-ink">{pr.itemName}</td>
                    <td className="py-2 px-3 font-bold">{pr.requiredQty} Units</td>
                    <td className="py-2 px-3 text-success font-semibold">{formatINR(pr.estimatedTotal)}</td>
                    <td className="py-2 px-3">{pr.vendorName}</td>
                    <td className="py-2 px-3"><Badge tone="info">PENDING APPROVAL</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3 border-t border-border-strong">
            <Button variant="primary" onClick={() => setPrsModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
