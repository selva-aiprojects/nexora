import * as React from 'react';
import {
  Badge,
  DataTable,
  FormField,
  PageHeader,
  Select,
  StatCard,
  type Column,
} from '@/components';
import {
  api,
  type ManufacturingItem,
  type ManufacturingShortageItem,
  type ManufacturingStockLedgerEntry,
  type ManufacturingValuationRow,
  type ManufacturingWarehouse,
} from '@/lib/api';

type Tab = 'ledger' | 'valuation' | 'shortage';

const TABS: { id: Tab; label: string }[] = [
  { id: 'ledger', label: 'Stock Ledger' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'shortage', label: 'Material Shortage' },
];

const LEDGER_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  in: 'success',
  out: 'warning',
  adjust: 'info',
};

function ManufacturingReportsPage() {
  const [tab, setTab] = React.useState<Tab>('ledger');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [items, setItems] = React.useState<ManufacturingItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<ManufacturingWarehouse[]>([]);
  const [ledger, setLedger] = React.useState<ManufacturingStockLedgerEntry[]>([]);
  const [valuation, setValuation] = React.useState<ManufacturingValuationRow[]>([]);
  const [totalValue, setTotalValue] = React.useState(0);
  const [shortages, setShortages] = React.useState<ManufacturingShortageItem[]>([]);

  const [ledgerItem, setLedgerItem] = React.useState('');

  const itemName = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const warehouseName = React.useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  const loadLedger = React.useCallback(() => {
    return api
      .getManufacturingStockLedger(ledgerItem ? { itemId: ledgerItem } : undefined)
      .then((res) => setLedger(res.rows ?? []));
  }, [ledgerItem]);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getManufacturingItems(),
      api.getManufacturingWarehouses(),
      loadLedger(),
      api.getManufacturingValuation(),
      api.getManufacturingMaterialShortage(),
    ])
      .then(([i, w, , v, s]) => {
        setItems(i.rows ?? []);
        setWarehouses(w);
        setValuation(v.rows);
        setTotalValue(v.totalValue);
        setShortages(s.shortages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadLedger]);

  const ledgerColumns: Column<ManufacturingStockLedgerEntry>[] = [
    { key: 'date', header: 'Date', sortable: true },
    {
      key: 'itemId',
      header: 'Item',
      render: (row) => {
        const it = itemName.get(row.itemId);
        return <span>{it?.name ?? row.itemId}</span>;
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge tone={LEDGER_TONE[row.type] ?? 'neutral'} withDot>{row.type}</Badge>,
    },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.qty.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.balance.toLocaleString('en-IN')}</span>,
    },
    { key: 'reference', header: 'Reference', hideBelow: 'md' },
  ];

  const valuationColumns: Column<ManufacturingValuationRow>[] = [
    {
      key: 'itemId',
      header: 'Item',
      render: (row) => {
        const it = itemName.get(row.itemId);
        return (
          <div>
            <div className="font-medium text-ink">{it?.name ?? row.itemId}</div>
            <div className="text-xs text-ink-muted">{it?.sku ?? ''}</div>
          </div>
        );
      },
    },
    {
      key: 'warehouseId',
      header: 'Warehouse',
      hideBelow: 'md',
      render: (row) => warehouseName.get(row.warehouseId) ?? row.warehouseId,
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.quantity.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'unitCost',
      header: 'Unit cost',
      align: 'right',
      hideBelow: 'md',
      render: (row) => <span className="tabular-nums">₹{row.unitCost.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (row) => <span className="tabular-nums">₹{row.value.toLocaleString('en-IN')}</span>,
    },
  ];

  const shortageColumns: Column<ManufacturingShortageItem>[] = [
    { key: 'bomName', header: 'BOM', sortable: true },
    {
      key: 'itemName',
      header: 'Component',
      render: (row) => <span>{row.itemName ?? row.itemId}</span>,
    },
    {
      key: 'requiredPerUnit',
      header: 'Per unit',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.requiredPerUnit.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.available.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'short',
      header: 'Short',
      align: 'right',
      render: (row) =>
        row.short > 0 ? (
          <Badge tone="danger" withDot>{row.short.toLocaleString('en-IN')}</Badge>
        ) : (
          <Badge tone="success" withDot>OK</Badge>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Reports" subtitle="Stock ledger, inventory valuation and material shortages." />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
              (tab === t.id
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-muted hover:text-ink')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ledger' && (
        <div className="space-y-4">
          <div className="max-w-xs">
            <FormField label="Filter by item" htmlFor="ledger-item">
              <Select
                id="ledger-item"
                placeholder="All items"
                options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
                value={ledgerItem}
                onChange={(e) => setLedgerItem(e.target.value)}
              />
            </FormField>
          </div>
          <DataTable
            caption="Stock ledger"
            columns={ledgerColumns}
            data={ledger}
            getRowId={(row) => row.id}
            isLoading={loading}
            error={error ?? undefined}
            onRetry={loadLedger}
            emptyTitle="No ledger entries"
            emptyDescription="Stock movements will be recorded here."
          />
        </div>
      )}

      {tab === 'valuation' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total inventory value"
              value={`₹${totalValue.toLocaleString('en-IN')}`}
              delta={`${valuation.length} stock rows`}
              trend="flat"
              isLoading={loading}
            />
          </div>
          <DataTable
            caption="Inventory valuation"
            columns={valuationColumns}
            data={valuation}
            getRowId={(row) => `${row.itemId}-${row.warehouseId}`}
            isLoading={loading}
            error={error ?? undefined}
            emptyTitle="No valuation data"
            emptyDescription="Stock rows will be valued here."
          />
        </div>
      )}

      {tab === 'shortage' && (
        <DataTable
          caption="Material shortage"
          columns={shortageColumns}
          data={shortages}
          getRowId={(row) => `${row.bomId}-${row.itemId}`}
          isLoading={loading}
          error={error ?? undefined}
          emptyTitle="No shortages"
          emptyDescription="Every BOM component is sufficiently stocked."
        />
      )}
    </div>
  );
}

export default ManufacturingReportsPage;

