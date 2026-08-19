import * as React from 'react';
import { Badge, Button, Card, DataTable, PageHeader, type Column } from '@/components';
import { api } from '@/lib/api';

type ReportTab = 'valuation' | 'movement' | 'aging';

function InventoryReports() {
  const [tab, setTab] = React.useState<ReportTab>('valuation');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [valuation, setValuation] = React.useState<{ rows: any[]; totalValue: number } | null>(null);
  const [movement, setMovement] = React.useState<any[]>([]);
  const [aging, setAging] = React.useState<any[]>([]);

  const loadValuation = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getInventoryValuation()
      .then((res) => { if (!cancelled) setValuation(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadMovement = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getInventoryMovement()
      .then((res) => { if (!cancelled) setMovement(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadAging = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getInventoryAging()
      .then((res) => { if (!cancelled) setAging(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (tab === 'valuation') loadValuation();
    else if (tab === 'movement') loadMovement();
    else loadAging();
  }, [tab, loadValuation, loadMovement, loadAging]);

  const valuationColumns: Column<any>[] = [
    { key: 'itemId', header: 'Item' },
    { key: 'warehouseId', header: 'Warehouse' },
    { key: 'binId', header: 'Bin' },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.quantity.toLocaleString()}</span>,
    },
    {
      key: 'unitCost',
      header: 'Unit Cost',
      align: 'right',
      render: (row) => <span className="tabular-nums">₹{row.unitCost.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (row) => <span className="tabular-nums">₹{row.value.toLocaleString('en-IN')}</span>,
    },
  ];

  const movementColumns: Column<any>[] = [
    { key: 'type', header: 'Type', render: (row) => <Badge tone={row.type === 'transfer' ? 'info' : 'warning'} withDot>{row.type}</Badge> },
    { key: 'itemId', header: 'Item' },
    { key: 'warehouseId', header: 'Warehouse', hideBelow: 'md' },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'qty', header: 'Qty', align: 'right', render: (row) => <span className="tabular-nums">{row.qty?.toLocaleString()}</span> },
  ];

  const agingColumns: Column<any>[] = [
    { key: 'itemId', header: 'Item' },
    { key: 'warehouseId', header: 'Warehouse' },
    { key: 'binId', header: 'Bin', hideBelow: 'md' },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.quantity.toLocaleString()}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (row) => <span className="tabular-nums">₹{row.value.toLocaleString('en-IN')}</span>,
    },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading reports…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Inventory Reports" subtitle="Valuation, movement, and aging analysis." />
      <div className="flex gap-2">
        {([
          { key: 'valuation', label: 'Valuation' },
          { key: 'movement', label: 'Movement' },
          { key: 'aging', label: 'Aging' },
        ] as const).map((t) => (
          <Button key={t.key} variant={tab === t.key ? 'primary' : 'secondary'} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>
        ))}
      </div>
      {tab === 'valuation' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-muted">Total Inventory Value</span>
              <span className="text-lg font-semibold text-ink">₹{valuation?.totalValue.toLocaleString('en-IN')}</span>
            </div>
          </Card>
          <DataTable
            caption="Valuation"
            columns={valuationColumns}
            data={valuation?.rows ?? []}
            getRowId={(row) => `${row.itemId}-${row.warehouseId}-${row.binId}`}
            emptyTitle="No valuation data"
            emptyDescription="Stock records will appear here."
          />
        </div>
      )}
      {tab === 'movement' && (
        <DataTable
          caption="Movement"
          columns={movementColumns}
          data={movement}
          getRowId={(row) => `${row.type}-${row.id}`}
          emptyTitle="No movement records"
          emptyDescription="Transfers and adjustments will appear here."
        />
      )}
      {tab === 'aging' && (
        <DataTable
          caption="Aging"
          columns={agingColumns}
          data={aging}
          getRowId={(row) => `${row.itemId}-${row.warehouseId}-${row.binId}`}
          emptyTitle="No aging data"
          emptyDescription="Stock records will appear here."
        />
      )}
    </div>
  );
}

export default InventoryReports;
