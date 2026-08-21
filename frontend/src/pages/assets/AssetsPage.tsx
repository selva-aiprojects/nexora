import * as React from 'react';
import { api, type Asset, type AssetListResult } from '@/lib/api';
import {
  Button,
  Badge,
  Card,
  StatCard,
  DataTable,
  FormField,
  TextField,
  Modal,
  useToast,
  type Column,
} from '@/components';
import { formatINR, formatDate } from '@/lib/utils';

const CATEGORIES = [
  'All Categories',
  'Machinery & Equipment',
  'IT & Hardware',
  'Vehicles',
  'Furniture & Fixtures',
  'Buildings & Infrastructure',
  'Tools & Fixtures',
];

export default function AssetsPage() {
  const { notify } = useToast();
  const [data, setData] = React.useState<AssetListResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState('All Categories');
  const [status, setStatus] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [batchDepModalOpen, setBatchDepModalOpen] = React.useState(false);
  const [disposeModalOpen, setDisposeModalOpen] = React.useState(false);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form states
  const [formData, setFormData] = React.useState({
    name: '',
    category: 'Machinery & Equipment',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    salvageValue: '0',
    usefulLifeMonths: '60',
    depreciationMethod: 'SLM',
    serialNumber: '',
    location: 'Main Plant',
    costCenter: 'Operations',
    vendor: '',
  });

  const [disposeData, setDisposeData] = React.useState({
    saleProceeds: '0',
    disposalDate: new Date().toISOString().split('T')[0],
    reason: 'End of useful life / Scrapped',
  });

  const [batchPeriod, setBatchPeriod] = React.useState(new Date().toISOString().slice(0, 7));

  const loadAssets = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAssets({
        category: category !== 'All Categories' ? category : undefined,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
        page,
        pageSize: 15,
      });
      setData(res);
    } catch (err: any) {
      notify({ title: 'Failed to load assets', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [category, status, search, page, notify]);

  React.useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.purchaseCost || !formData.usefulLifeMonths) {
      notify({ title: 'Validation Error', description: 'Please fill in all required fields.', tone: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await api.createAsset({
        name: formData.name,
        category: formData.category,
        purchaseDate: formData.purchaseDate,
        purchaseCost: Number(formData.purchaseCost),
        salvageValue: Number(formData.salvageValue) || 0,
        usefulLifeMonths: Number(formData.usefulLifeMonths),
        depreciationMethod: formData.depreciationMethod as 'SLM' | 'WDV',
        serialNumber: formData.serialNumber,
        location: formData.location,
        costCenter: formData.costCenter,
        vendor: formData.vendor,
      });

      notify({ title: 'Asset Capitalized', description: `${formData.name} added to asset register.`, tone: 'success' });
      setCreateModalOpen(false);
      setFormData({
        name: '',
        category: 'Machinery & Equipment',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: '',
        salvageValue: '0',
        usefulLifeMonths: '60',
        depreciationMethod: 'SLM',
        serialNumber: '',
        location: 'Main Plant',
        costCenter: 'Operations',
        vendor: '',
      });
      loadAssets();
    } catch (err: any) {
      notify({ title: 'Error creating asset', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSingleDepreciate = async (asset: Asset) => {
    try {
      const res = await api.depreciateAsset(asset.id);
      notify({ title: 'Depreciation Applied', description: res.message, tone: 'success' });
      loadAssets();
    } catch (err: any) {
      notify({ title: 'Depreciation Failed', description: err.message, tone: 'danger' });
    }
  };

  const handleBatchDepreciate = async () => {
    setSaving(true);
    try {
      const res = await api.batchDepreciateAssets({ periodDate: `${batchPeriod}-01` });
      notify({ title: 'Batch Depreciation Completed', description: res.message, tone: 'success' });
      setBatchDepModalOpen(false);
      loadAssets();
    } catch (err: any) {
      notify({ title: 'Batch Depreciation Failed', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisposeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setSaving(true);
    try {
      const res = await api.disposeAsset(selectedAsset.id, {
        saleProceeds: Number(disposeData.saleProceeds) || 0,
        disposalDate: disposeData.disposalDate,
        reason: disposeData.reason,
      });
      notify({ title: 'Asset Disposed', description: res.message, tone: 'success' });
      setDisposeModalOpen(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (err: any) {
      notify({ title: 'Disposal Failed', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleViewHistory = async (asset: Asset) => {
    try {
      const full = await api.getAsset(asset.id);
      setSelectedAsset(full);
      setHistoryModalOpen(true);
    } catch (err: any) {
      notify({ title: 'Could not fetch history', description: err.message, tone: 'danger' });
    }
  };

  const columns: Column<Asset>[] = [
    {
      key: 'assetNumber',
      header: 'Asset #',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">{row.assetNumber}</span>
      ),
    },
    {
      key: 'name',
      header: 'Asset Details',
      render: (row) => (
        <div>
          <div className="font-medium text-ink">{row.name}</div>
          <div className="text-xs text-ink-muted">{row.category} • {row.location || 'General'}</div>
        </div>
      ),
    },
    {
      key: 'purchaseDate',
      header: 'Acquired',
      render: (row) => (
        <span className="text-xs text-ink">{formatDate(row.purchaseDate)}</span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost (INR)',
      render: (row) => (
        <span className="text-xs font-medium text-ink">{formatINR(row.purchaseCost)}</span>
      ),
    },
    {
      key: 'accumulated',
      header: 'Acc. Dep.',
      render: (row) => (
        <span className="text-xs text-danger">-{formatINR(row.accumulatedDepreciation)}</span>
      ),
    },
    {
      key: 'bookValue',
      header: 'Net Book Value',
      render: (row) => (
        <span className="text-xs font-bold text-success">{formatINR(row.bookValue)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        let tone: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (row.status === 'active') tone = 'success';
        else if (row.status === 'disposed') tone = 'warning';
        else if (row.status === 'written_off') tone = 'danger';
        return <Badge tone={tone}>{row.status.replace('_', ' ').toUpperCase()}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status === 'active' && row.bookValue > row.salvageValue && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSingleDepreciate(row)}
              title="Run Monthly Depreciation"
            >
              Depreciate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewHistory(row)}
            title="View History"
          >
            History
          </Button>
          {row.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedAsset(row); setDisposeModalOpen(true); }}
              title="Dispose or Scrapped"
              className="text-danger hover:bg-danger/10"
            >
              Dispose
            </Button>
          )}
        </div>
      ),
    },
  ];

  const metrics = data?.metrics || {
    totalAssets: 0,
    activeAssets: 0,
    totalCost: 0,
    totalAccumulatedDepreciation: 0,
    totalBookValue: 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Fixed Asset Management</h1>
          <p className="text-sm text-ink-muted">
            Capitalize assets, track Net Book Value, and run automated SLM/WDV monthly depreciation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => setBatchDepModalOpen(true)}>
            ⚡ Run Monthly Depreciation
          </Button>
          <Button variant="primary" size="md" onClick={() => setCreateModalOpen(true)}>
            + Capitalize New Asset
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Capitalized Assets"
          value={formatINR(metrics.totalCost, { compact: true })}
          delta={`${metrics.activeAssets} Active (${metrics.totalAssets} Total)`}
          trend="flat"
          isLoading={loading}
        />
        <StatCard
          label="Accumulated Depreciation"
          value={formatINR(metrics.totalAccumulatedDepreciation, { compact: true })}
          delta={`SLM & WDV Amortized`}
          trend="down"
          isLoading={loading}
        />
        <StatCard
          label="Net Book Value (NBV)"
          value={formatINR(metrics.totalBookValue, { compact: true })}
          delta="Current Balance Sheet Asset"
          trend="up"
          isLoading={loading}
        />
        <StatCard
          label="Depreciation Health"
          value={`${metrics.totalCost > 0 ? Math.round((metrics.totalBookValue / metrics.totalCost) * 100) : 100}%`}
          delta="Asset Remaining Value"
          trend="flat"
          isLoading={loading}
        />
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disposed">Disposed</option>
              <option value="written_off">Written Off</option>
            </select>
          </div>

          <div className="w-full sm:w-64">
            <TextField
              type="search"
              placeholder="Search asset, serial #, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Asset Table */}
      <DataTable
        columns={columns}
        data={data?.rows || []}
        getRowId={(row) => row.id}
        caption="Enterprise Fixed Asset Register"
        isLoading={loading}
        pagination={{
          page,
          pageSize: 15,
          total: data?.total || 0,
          onPageChange: setPage,
        }}
      />

      {/* Capitalize Asset Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Capitalize New Fixed Asset"
        size="lg"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Asset Name" htmlFor="asset-name" required>
              <TextField
                placeholder="e.g. CNC 5-Axis Milling Machine"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Category" htmlFor="asset-category" required>
              <select
                className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.filter(c => c !== 'All Categories').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Purchase Cost (INR)" htmlFor="asset-cost" required>
              <TextField
                type="number"
                placeholder="1000000"
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Salvage / Scrap Value (INR)" htmlFor="asset-salvage">
              <TextField
                type="number"
                placeholder="50000"
                value={formData.salvageValue}
                onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
              />
            </FormField>

            <FormField label="Useful Life (Months)" htmlFor="asset-life" required>
              <TextField
                type="number"
                placeholder="60 (5 years)"
                value={formData.usefulLifeMonths}
                onChange={(e) => setFormData({ ...formData, usefulLifeMonths: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Depreciation Method" htmlFor="asset-method" required>
              <select
                className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.depreciationMethod}
                onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
              >
                <option value="SLM">Straight-Line Method (SLM)</option>
                <option value="WDV">Written-Down Value (WDV / Declining)</option>
              </select>
            </FormField>

            <FormField label="Serial Number" htmlFor="asset-serial">
              <TextField
                placeholder="SN-2026-X88"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </FormField>

            <FormField label="Physical Location" htmlFor="asset-loc">
              <TextField
                placeholder="Plant 1 - Shop Floor B"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </FormField>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-strong pt-4">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Capitalize Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Batch Depreciation Modal */}
      <Modal
        open={batchDepModalOpen}
        onClose={() => setBatchDepModalOpen(false)}
        title="Run Periodic Depreciation Batch"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            This will calculate and post monthly depreciation journal entries across all active enterprise fixed assets according to their assigned SLM or WDV schedules.
          </p>

          <FormField label="Accounting Period (Month)" htmlFor="batch-period" required>
            <TextField
              type="month"
              value={batchPeriod}
              onChange={(e) => setBatchPeriod(e.target.value)}
            />
          </FormField>

          <div className="rounded-lg bg-surface border border-border-strong p-3.5 text-xs text-ink-muted space-y-1">
            <div className="font-semibold text-ink">Automated General Ledger Impact:</div>
            <div>• <b>Debit</b>: Account <code>5800 - Depreciation Expense</code></div>
            <div>• <b>Credit</b>: Account <code>1700 - Accumulated Depreciation</code></div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-strong">
            <Button variant="secondary" onClick={() => setBatchDepModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBatchDepreciate} isLoading={saving}>
              Execute Batch Run
            </Button>
          </div>
        </div>
      </Modal>

      {/* Asset Disposal Modal */}
      <Modal
        open={disposeModalOpen}
        onClose={() => setDisposeModalOpen(false)}
        title={`Dispose / Write-Off Asset: ${selectedAsset?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleDisposeAsset} className="space-y-4">
          <div className="rounded-lg bg-surface border border-border-strong p-3 text-xs space-y-1">
            <div>Current Net Book Value: <b className="text-success">{formatINR(selectedAsset?.bookValue || 0)}</b></div>
            <div>Original Cost: <b>{formatINR(selectedAsset?.purchaseCost || 0)}</b></div>
          </div>

          <FormField label="Sale / Scrap Proceeds (INR)" htmlFor="dispose-proceeds">
            <TextField
              type="number"
              placeholder="0"
              value={disposeData.saleProceeds}
              onChange={(e) => setDisposeData({ ...disposeData, saleProceeds: e.target.value })}
            />
          </FormField>

          <FormField label="Disposal Date" htmlFor="dispose-date" required>
            <TextField
              type="date"
              value={disposeData.disposalDate}
              onChange={(e) => setDisposeData({ ...disposeData, disposalDate: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Reason for Disposal" htmlFor="dispose-reason">
            <TextField
              placeholder="e.g. Scrapped due to wear, or Sold to third party"
              value={disposeData.reason}
              onChange={(e) => setDisposeData({ ...disposeData, reason: e.target.value })}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-strong">
            <Button variant="secondary" onClick={() => setDisposeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={saving}>
              Confirm Disposal
            </Button>
          </div>
        </form>
      </Modal>

      {/* History Slide-over/Modal */}
      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Depreciation History: ${selectedAsset?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface border border-border-strong p-3 text-center text-xs">
            <div>
              <div className="text-ink-muted">Purchase Cost</div>
              <div className="font-bold text-ink">{formatINR(selectedAsset?.purchaseCost || 0)}</div>
            </div>
            <div>
              <div className="text-ink-muted">Total Depreciated</div>
              <div className="font-bold text-danger">-{formatINR(selectedAsset?.accumulatedDepreciation || 0)}</div>
            </div>
            <div>
              <div className="text-ink-muted">Current Book Value</div>
              <div className="font-bold text-success">{formatINR(selectedAsset?.bookValue || 0)}</div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {selectedAsset?.depreciationHistory && selectedAsset.depreciationHistory.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-strong text-ink-muted">
                    <th className="py-2">Period Date</th>
                    <th className="py-2">Depreciation Amount</th>
                    <th className="py-2">Acc. Depreciation</th>
                    <th className="py-2">Ending Book Value</th>
                    <th className="py-2">Journal Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-strong">
                  {selectedAsset.depreciationHistory.map((h) => (
                    <tr key={h.id} className="text-ink">
                      <td className="py-2.5 font-medium">{formatDate(h.periodDate)}</td>
                      <td className="py-2.5 font-semibold text-danger">-{formatINR(h.amount)}</td>
                      <td className="py-2.5">{formatINR(h.accumulatedDepreciation)}</td>
                      <td className="py-2.5 font-bold text-success">{formatINR(h.bookValue)}</td>
                      <td className="py-2.5 font-mono text-[11px] text-ink-muted">{h.journalRef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-ink-muted">
                No depreciation entries recorded yet for this asset.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
