import * as React from 'react';
import { Card, EmptyState, PageHeader, SkeletonText } from '@/components';
import { api } from '@/lib/api';
import { RevenueChart, StockByWarehouseChart } from '@/components';

const MODULE_META: Record<string, { title: string; description: string; accent: string }> = {
  sales: {
    title: 'Sales',
    description: 'Invoices, customers, and revenue performance.',
    accent: 'var(--nx-primary)',
  },
  finance: {
    title: 'Finance',
    description: 'Cash position, payables, GST, and bank accounts.',
    accent: 'var(--nx-success)',
  },
  procurement: {
    title: 'Procurement',
    description: 'Vendors, quotes, contracts, and GRNs.',
    accent: 'var(--nx-warning)',
  },
  inventory: {
    title: 'Inventory',
    description: 'Stock levels, warehouses, and low-stock alerts.',
    accent: 'var(--nx-info)',
  },
  crm: {
    title: 'CRM',
    description: 'Leads, customers, quotes, and sales orders.',
    accent: 'var(--nx-ai)',
  },
  hrms: {
    title: 'HRMS',
    description: 'Employees, attendance, leave, and payroll.',
    accent: 'var(--nx-danger)',
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ModuleDashboard({ module }: { module: string }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);

  const meta = MODULE_META[module] ?? { title: module, description: '', accent: 'var(--nx-primary)' };

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getModuleDashboard(module)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [module]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader title={meta.title} subtitle={meta.description} />
        <Card padding="lg"><SkeletonText lines={8} /></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title={meta.title} subtitle={meta.description} />
        <EmptyState variant="error" title="Couldn't load dashboard" description={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title={meta.title} subtitle={meta.description} />
        <EmptyState title="No data" description="There is no data to display for this module." />
      </div>
    );
  }

  const kpis = data.kpis ?? {};
  const charts = data.charts ?? {};
  const tables = data.tables ?? {};

  const kpiEntries = Object.entries(kpis).filter(([key]) => key !== 'message');
  const kpiColumns = kpiEntries.map(([key, value]) => {
    const formatted = typeof value === 'number' ? formatCurrency(value) : String(value);
    return { key, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()), value: formatted };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={meta.title} subtitle={meta.description} />
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.accent }} />
      </div>

      {kpiColumns.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiColumns.map((col) => (
            <Card key={col.key} padding="md">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">{col.label}</div>
              <div className="mt-2 text-2xl font-semibold text-ink tabular-nums">{col.value}</div>
            </Card>
          ))}
        </div>
      )}

      {Object.entries(charts).map(([chartKey, chartData]: [string, any]) => (
        <Card key={chartKey} padding="md">
          <h3 className="font-display text-base font-semibold text-ink capitalize">{chartKey.replace(/([A-Z])/g, ' $1')}</h3>
          {Array.isArray(chartData) && chartData.length > 0 && (
            <div className="mt-4">
              {chartKey.includes('Warehouse') || chartKey.includes('warehouse') ? (
                <StockByWarehouseChart data={chartData} />
              ) : chartKey.includes('Trend') || chartKey.includes('trend') ? (
                <RevenueChart data={chartData} />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {chartData.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.accent }} />
                      <span className="text-sm text-ink-muted">{item.name}:</span>
                      <span className="text-sm font-medium text-ink tabular-nums">{item.value ?? item.qty ?? 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      {Object.entries(tables).map(([tableKey, tableData]: [string, any]) => (
        <Card key={tableKey} padding="md">
          <h3 className="font-display text-base font-semibold text-ink capitalize">{tableKey.replace(/([A-Z])/g, ' $1')}</h3>
          {Array.isArray(tableData) && tableData.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-canvas/60 text-ink-muted">
                    {Object.keys(tableData[0]).map((key) => (
                      <th key={key} className="px-3 py-2 font-medium capitalize">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 10).map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      {Object.entries(row).map(([key, value]: [string, any]) => (
                        <td key={key} className="px-3 py-2 text-ink">
                          {key === 'total' || key === 'amount' || key === 'budget' || key === 'value' ? formatCurrency(Number(value) || 0) : String(value ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
