import * as React from 'react';
import { Card, EmptyState, PageHeader, SkeletonText } from '@/components';
import { api } from '@/lib/api';
import { ARAgingChart, BarChartGeneric, DonutChart, MetricsTable, MultiLineChart, StockByWarehouseChart } from '@/components';

const CHART_COLORS = {
  primary: '#4338CA',
  cyan: '#06B6D4',
  success: '#059669',
  blue: '#2563EB',
  danger: '#DC2626',
};

const MODULE_META: Record<string, { title: string; description: string; accent: string }> = {
  sales: {
    title: 'Sales & Order Management',
    description: 'Pipeline strength, revenue trends, and customer acquisition.',
    accent: 'var(--nx-primary)',
  },
  finance: {
    title: 'Finance',
    description: 'Cash flow, profit margins, AP/AR aging, and budget variance.',
    accent: 'var(--nx-success)',
  },
  procurement: {
    title: 'Procurement',
    description: 'Vendor performance, spend analysis, and contract compliance.',
    accent: 'var(--nx-warning)',
  },
  inventory: {
    title: 'Inventory & Supply Chain',
    description: 'Stock levels, turnover, fulfillment cycle, and warehouse efficiency.',
    accent: 'var(--nx-info)',
  },
  crm: {
    title: 'CRM',
    description: 'Leads, conversion rate, customer churn, and sales pipeline.',
    accent: 'var(--nx-ai)',
  },
  hrms: {
    title: 'Human Resources',
    description: 'Workforce stability, hiring metrics, attendance, and training.',
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

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function TrendIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isPositive = value >= 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const arrow = isPositive ? '↑' : '↓';
  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow} {Math.abs(value)}{suffix}
    </span>
  );
}

function KpiCard({ label, value, trend, suffix = '' }: { label: string; value: string; trend?: number; suffix?: string }) {
  return (
    <Card padding="sm">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-lg font-semibold text-ink tabular-nums">{value}</div>
        {trend !== undefined && <TrendIndicator value={trend} suffix={suffix} />}
      </div>
    </Card>
  );
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

  const renderKpis = () => {
    switch (module) {
      case 'sales':
        return (
          <>
            <KpiCard label="Total Revenue" value={formatCurrency(kpis.totalRevenue ?? 0)} trend={12} />
            <KpiCard label="Avg Order Value" value={formatCurrency(kpis.aov ?? 0)} trend={5} />
            <KpiCard label="Conversion Rate" value={formatPercent(kpis.conversionRate ?? 0)} trend={2} suffix="%" />
            <KpiCard label="Open Opportunities" value={formatCurrency(kpis.openOpportunities ?? 0)} />
            <KpiCard label="Customer Churn" value={formatPercent(kpis.churnRate ?? 0)} trend={-1} suffix="%" />
            <KpiCard label="Total Customers" value={String(kpis.customerCount ?? 0)} />
            <KpiCard label="Overdue Invoices" value={String(kpis.overdueCount ?? 0)} trend={-5} suffix="" />
            <KpiCard label="Outstanding" value={formatCurrency(kpis.outstanding ?? 0)} />
          </>
        );
      case 'finance':
        return (
          <>
            <KpiCard label="Revenue" value={formatCurrency(kpis.revenue ?? 0)} trend={8} />
            <KpiCard label="Gross Margin" value={formatPercent(kpis.grossMargin ?? 0)} trend={2} suffix="%" />
            <KpiCard label="Net Margin" value={formatPercent(kpis.netMargin ?? 0)} trend={1.5} suffix="%" />
            <KpiCard label="Working Capital" value={formatCurrency(kpis.workingCapital ?? 0)} />
            <KpiCard label="Cash Position" value={formatCurrency(kpis.cash ?? 0)} />
            <KpiCard label="Payables" value={formatCurrency(kpis.payables ?? 0)} trend={-3} suffix="" />
            <KpiCard label="AR Current" value={formatCurrency(kpis.arCurrent ?? 0)} />
            <KpiCard label="AR 90+ Days" value={formatCurrency(kpis.arDays90Plus ?? 0)} trend={-2} suffix="" />
          </>
        );
      case 'procurement':
        return (
          <>
            <KpiCard label="Active Vendors" value={String(kpis.vendorCount ?? 0)} />
            <KpiCard label="Active Contracts" value={String(kpis.activeContracts ?? 0)} />
            <KpiCard label="Pending Quotes" value={String(kpis.pendingQuotes ?? 0)} />
            <KpiCard label="Spend Under Contract" value={formatCurrency(kpis.spendUnderContract ?? 0)} />
            <KpiCard label="PRs Without Contract" value={String(kpis.prsWithoutContract ?? 0)} />
            <KpiCard label="Avg Vendor Rating" value={String(kpis.avgVendorRating ?? 0)} suffix="/5" />
          </>
        );
      case 'inventory':
        return (
          <>
            <KpiCard label="Total Stock" value={String(kpis.totalStock ?? 0)} />
            <KpiCard label="Turnover Rate" value={String(kpis.turnoverRate ?? 0) + 'x'} suffix="" />
            <KpiCard label="Low Stock Items" value={String(kpis.lowStockCount ?? 0)} trend={-3} suffix="" />
            <KpiCard label="Overstock Items" value={String(kpis.overstockCount ?? 0)} />
            <KpiCard label="Stockout Rate" value={formatPercent(kpis.stockoutRate ?? 0)} />
            <KpiCard label="Warehouses" value={String(kpis.warehouseCount ?? 0)} />
          </>
        );
      case 'crm':
        return (
          <>
            <KpiCard label="Total Customers" value={String(kpis.customerCount ?? 0)} />
            <KpiCard label="Open Leads" value={String(kpis.openLeads ?? 0)} />
            <KpiCard label="Conversion Rate" value={formatPercent(kpis.conversionRate ?? 0)} trend={5} suffix="%" />
            <KpiCard label="Churn Rate" value={formatPercent(kpis.churnRate ?? 0)} trend={-2} suffix="%" />
            <KpiCard label="Avg Order Value" value={formatCurrency(kpis.aov ?? 0)} />
            <KpiCard label="Open Opportunities" value={formatCurrency(kpis.openOpportunities ?? 0)} />
          </>
        );
      case 'hrms':
        return (
          <>
            <KpiCard label="Total Employees" value={String(kpis.employeeCount ?? 0)} />
            <KpiCard label="Active Employees" value={String(kpis.activeEmployees ?? 0)} />
            <KpiCard label="Turnover Rate" value={formatPercent(kpis.turnoverRate ?? 0)} trend={-1} suffix="%" />
            <KpiCard label="Absenteeism" value={formatPercent(kpis.absenteeismRate ?? 0)} />
            <KpiCard label="Revenue/Employee" value={formatCurrency(kpis.revenuePerEmployee ?? 0)} />
            <KpiCard label="Pending Leaves" value={String(kpis.pendingLeaves ?? 0)} />
            <KpiCard label="Training Completion" value={formatPercent(kpis.trainingCompletionRate ?? 0)} trend={8} suffix="%" />
          </>
        );
      default:
        return null;
    }
  };

  const renderCharts = () => {
    const chartEntries = Object.entries(charts);
    if (chartEntries.length === 0) return null;

    return chartEntries.map(([chartKey, chartData]: [string, any]) => {
      if (!Array.isArray(chartData) || chartData.length === 0) return null;

      let chartComponent: React.ReactNode = null;
      const numericData = chartData.map((item: any) => ({
        ...item,
        value: Number(item.value || item.qty || 0),
      }));

      if (chartKey.includes('Aging') || chartKey.includes('aging')) {
        chartComponent = <ARAgingChart data={numericData} />;
      } else if (chartKey.includes('Breakdown') || chartKey.includes('breakdown') || chartKey.includes('Status')) {
        const metricLabel = chartKey.includes('invoice') || chartKey.includes('Invoice') ? 'Invoices' : chartKey.includes('lead') || chartKey.includes('Lead') ? 'Leads' : chartKey.includes('vendor') || chartKey.includes('Vendor') ? 'Vendors' : chartKey.includes('gst') || chartKey.includes('GST') ? 'Returns' : 'Count';
        chartComponent = <DonutChart data={numericData} centerLabel="Total" centerValue={String(numericData.reduce((s, d) => s + d.value, 0))} metricLabel={metricLabel} />;
      } else if (chartKey.includes('Warehouse') || chartKey.includes('warehouse')) {
        chartComponent = <StockByWarehouseChart data={numericData} />;
      } else if (chartKey.includes('Trend') || chartKey.includes('trend')) {
        const keys = Object.keys(chartData[0]).filter((k) => k !== 'name');
        const isFinancial = keys.some((k) => k === 'revenue' || k === 'receivables' || k === 'inflow' || k === 'outflow');
        const isAttendance = keys.some((k) => k === 'present' || k === 'absent');
        const isProduction = keys.some((k) => k === 'units' || k === 'oee' || k === 'scrap');
        chartComponent = (
          <MultiLineChart
            data={chartData}
            lines={keys.map((k) => ({
              dataKey: k,
              name: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
               color: k === 'revenue' || k === 'inflow' || k === 'won' ? CHART_COLORS.primary : k === 'receivables' || k === 'outflow' || k === 'absent' || k === 'scrap' ? CHART_COLORS.cyan : k === 'units' || k === 'spend' ? CHART_COLORS.success : CHART_COLORS.blue,
            }))}
            xAxisLabel="Period"
            yAxisLabel={isFinancial ? 'Amount (₹)' : isAttendance ? 'Employees' : isProduction ? 'Units / %' : 'Count'}
          />
        );
      } else if (chartKey.includes('department') || chartKey.includes('Department')) {
        chartComponent = <BarChartGeneric data={numericData} dataKey="value" name="Employees" color={CHART_COLORS.primary} xAxisLabel="Department" yAxisLabel="Employees" />;
      } else if (chartKey.includes('attendance') || chartKey.includes('Attendance')) {
        const keys = Object.keys(chartData[0]).filter((k) => k !== 'name');
        chartComponent = (
          <MultiLineChart
            data={chartData}
            lines={keys.map((k) => ({
              dataKey: k,
              name: k.charAt(0).toUpperCase() + k.slice(1),
                color: k === 'present' ? CHART_COLORS.success : CHART_COLORS.danger,
            }))}
            xAxisLabel="Day"
            yAxisLabel="Employees"
          />
        );
      } else if (chartKey.includes('Volume') || chartKey.includes('volume')) {
        chartComponent = <BarChartGeneric data={numericData} dataKey="units" name="Units" color={CHART_COLORS.primary} xAxisLabel="Month" yAxisLabel="Units" />;
      } else {
        chartComponent = <BarChartGeneric data={numericData} dataKey="value" name="Count" color={CHART_COLORS.blue} xAxisLabel="Category" yAxisLabel="Count" />;
      }

      return (
        <Card key={chartKey} padding="sm">
          <h3 className="font-display text-sm font-semibold text-ink capitalize">{chartKey.replace(/([A-Z])/g, ' $1')}</h3>
          <div className="mt-2">{chartComponent}</div>
        </Card>
      );
    });
  };

  const renderInlineMetricsTable = () => {
    const tableEntries = Object.entries(tables);
    if (tableEntries.length === 0) return null;

    return tableEntries.map(([tableKey, tableData]: [string, any]) => {
      if (!Array.isArray(tableData) || tableData.length === 0) return null;

      const columns = Object.keys(tableData[0]).map((key) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        format: ['total', 'amount', 'budget', 'value', 'outstanding', 'revenue', 'payables', 'cash', 'grossProfit', 'netProfit', 'workingCapital', 'operatingCashFlow', 'spendUnderContract', 'openOpportunities', 'revenuePerEmployee', 'avgOrderValue', 'qty', 'units'].includes(key)
          ? 'currency'
          : ['conversionRate', 'churnRate', 'grossMargin', 'netMargin', 'turnoverRate', 'stockoutRate', 'absenteeismRate', 'trainingCompletionRate', 'rating'].includes(key)
          ? 'percent'
          : 'number',
      }));

      const currencyColumns = columns.filter((c) => c.format === 'currency');
      const metricLabel = currencyColumns.length > 0 ? 'INR' : undefined;

      return (
        <MetricsTable
          key={tableKey}
          title={tableKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
          columns={columns}
          data={tableData.slice(0, 8)}
          metricLabel={metricLabel}
        />
      );
    });
  };

  const renderTables = () => {
    return renderInlineMetricsTable();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title={meta.title} subtitle={meta.description} />
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.accent }} />
      </div>

      {Object.keys(kpis).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {renderKpis()}
        </div>
      )}

      {Object.keys(charts).length > 0 && Object.keys(tables).length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {renderCharts()}
          {renderTables()}
        </div>
      ) : (
        <>
          {renderCharts()}
          {renderTables()}
        </>
      )}
    </div>
  );
}
