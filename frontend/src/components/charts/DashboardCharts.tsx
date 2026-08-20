import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Card } from '@/components';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const COLORS = ['#4338CA', '#2563EB', '#06B6D4', '#7C3AED', '#059669', '#D97706'];

function formatINR(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        font: { size: 10 },
        boxWidth: 10,
        padding: 8,
      },
    },
    tooltip: {
      backgroundColor: 'rgb(var(--nx-surface))',
      titleColor: 'rgb(var(--nx-ink))',
      bodyColor: 'rgb(var(--nx-ink-muted))',
      borderColor: 'rgb(var(--nx-border))',
      borderWidth: 1,
      padding: 8,
      cornerRadius: 4,
      titleFont: { size: 11 },
      bodyFont: { size: 10 },
    },
  },
  scales: {
    x: {
      ticks: { font: { size: 10 }, color: 'rgb(var(--nx-ink-muted))' },
      grid: { display: false },
      title: {
        display: true,
        text: '',
        color: 'rgb(var(--nx-ink-muted))',
        font: { size: 10 },
      },
    },
    y: {
      ticks: {
        font: { size: 10 },
        color: 'rgb(var(--nx-ink-muted))',
        callback: (value: any) => formatINR(value),
      },
      grid: { color: 'rgb(var(--nx-border))' },
      title: {
        display: true,
        text: '',
        color: 'rgb(var(--nx-ink-muted))',
        font: { size: 10 },
      },
    },
  },
};

export function RevenueChart({ data }: { data: { month: string; revenue: number; receivables: number }[] }) {
  const labels = data.map((d) => d.month);
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, display: true },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, title: { ...baseOptions.scales.x.title, text: 'Month' } },
      y: { ...baseOptions.scales.y, title: { ...baseOptions.scales.y.title, text: 'Amount (₹)' } },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Revenue',
              data: data.map((d) => d.revenue),
              borderColor: 'rgb(var(--nx-primary))',
              backgroundColor: 'rgba(var(--nx-primary), 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 2,
              pointHoverRadius: 4,
            },
            {
              label: 'Receivables',
              data: data.map((d) => d.receivables),
              borderColor: 'rgb(var(--nx-ai-cyan))',
              backgroundColor: 'rgba(var(--nx-ai-cyan), 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 2,
              pointHoverRadius: 4,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function StockByWarehouseChart({ data }: { data: { name: string; qty: number }[] }) {
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, title: { ...baseOptions.scales.x.title, text: 'Warehouse' } },
      y: { ...baseOptions.scales.y, title: { ...baseOptions.scales.y.title, text: 'Stock Qty' } },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Bar
        data={{
          labels: data.map((d) => d.name),
          datasets: [
            {
              label: 'Stock Qty',
              data: data.map((d) => d.qty),
              backgroundColor: 'rgb(var(--nx-ai-blue))',
              borderRadius: [4, 4, 0, 0],
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function LowStockPieChart({ data }: { data: { name: string; qty: number; reorder: number }[] }) {
  const chartData = data.map((item) => ({
    name: item.name,
    value: Math.max(1, item.reorder - item.qty),
  }));

  if (chartData.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-muted">No low-stock items</div>;
  }

  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, display: true, position: 'bottom' as const },
    },
    scales: undefined as any,
  };

  return (
    <div style={{ height: 220 }}>
      <Pie
        data={{
          labels: chartData.map((d) => d.name),
          datasets: [
            {
              data: chartData.map((d) => d.value),
              backgroundColor: COLORS.slice(0, chartData.length),
              borderWidth: 0,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function ARAgingChart({ data }: { data: { name: string; value: number }[] }) {
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, title: { ...baseOptions.scales.x.title, text: 'Age Bucket' } },
      y: {
        ...baseOptions.scales.y,
        title: { ...baseOptions.scales.y.title, text: 'Amount (₹)' },
        ticks: {
          ...baseOptions.scales.y.ticks,
          callback: (value: any) => `₹${(value / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Bar
        data={{
          labels: data.map((d) => d.name),
          datasets: [
            {
              label: 'AR Outstanding',
              data: data.map((d) => d.value),
              backgroundColor: 'rgb(var(--nx-primary))',
              borderRadius: [4, 4, 0, 0],
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function StatusBreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, display: true, position: 'bottom' as const },
    },
    scales: undefined as any,
  };

  return (
    <div style={{ height: 220 }}>
      <Doughnut
        data={{
          labels: data.map((d) => d.name),
          datasets: [
            {
              data: data.map((d) => d.value),
              backgroundColor: COLORS.slice(0, data.length),
              borderWidth: 0,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function LineChart({ data, dataKey, name, color, xAxisLabel, yAxisLabel }: { data: { name: string; [key: string]: number | string }[]; dataKey: string; name: string; color?: string; xAxisLabel?: string; yAxisLabel?: string }) {
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, title: { ...baseOptions.scales.x.title, text: xAxisLabel || 'Period' } },
      y: { ...baseOptions.scales.y, title: { ...baseOptions.scales.y.title, text: yAxisLabel || 'Amount (₹)' } },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels: data.map((d) => d.name),
          datasets: [
            {
              label: name,
              data: data.map((d) => d[dataKey] as number),
              borderColor: color || 'rgb(var(--nx-primary))',
              backgroundColor: color ? `${color}20` : 'rgba(var(--nx-primary), 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 2,
              pointHoverRadius: 4,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function BarChartGeneric({ data, dataKey, name, color, xAxisLabel, yAxisLabel }: { data: { name: string; [key: string]: number | string }[]; dataKey: string; name: string; color?: string; xAxisLabel?: string; yAxisLabel?: string }) {
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, title: { ...baseOptions.scales.x.title, text: xAxisLabel || 'Category' } },
      y: { ...baseOptions.scales.y, title: { ...baseOptions.scales.y.title, text: yAxisLabel || 'Amount (₹)' } },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Bar
        data={{
          labels: data.map((d) => d.name),
          datasets: [
            {
              label: name,
              data: data.map((d) => d[dataKey] as number),
              backgroundColor: color || 'rgb(var(--nx-ai-blue))',
              borderRadius: [4, 4, 0, 0],
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function DonutChart({ data, dataKey: _dataKey, nameKey: _nameKey, centerLabel: _centerLabel, centerValue: _centerValue, metricLabel: _metricLabel }: { data: { name: string; value: number }[]; dataKey?: string; nameKey?: string; centerLabel?: string; centerValue?: string; metricLabel?: string }) {
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, display: true, position: 'bottom' as const },
    },
    scales: undefined as any,
    cutout: '60%',
  };

  return (
    <div style={{ height: 220 }}>
      <Doughnut
        data={{
          labels: data.map((d) => d.name),
          datasets: [
            {
              data: data.map((d) => d.value),
              backgroundColor: COLORS.slice(0, data.length),
              borderWidth: 0,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function MultiLineChart({ data, lines, xAxisLabel, yAxisLabel }: { data: { name: string; [key: string]: number | string }[]; lines: { dataKey: string; name: string; color: string }[]; xAxisLabel?: string; yAxisLabel?: string }) {
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, display: true, position: 'bottom' as const },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, title: { ...baseOptions.scales.x.title, text: xAxisLabel || 'Period' } },
      y: { ...baseOptions.scales.y, title: { ...baseOptions.scales.y.title, text: yAxisLabel || 'Amount (₹)' } },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels: data.map((d) => d.name),
          datasets: lines.map((line) => ({
            label: line.name,
            data: data.map((d) => d[line.dataKey] as number),
            borderColor: line.color,
            backgroundColor: line.color + '20',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 4,
          })),
        }}
        options={options}
      />
    </div>
  );
}

export function MetricsTable({ title, columns, data, format, metricLabel }: { title: string; columns: { key: string; label: string; format?: string }[]; data: any[]; format?: (value: any, key: string) => string; metricLabel?: string }) {
  if (!data || data.length === 0) return null;
  return (
    <Card padding="sm">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas/60 text-ink-muted">
              {columns.map((col) => (
                <th key={col.key} className="px-2 py-1 font-medium">{col.label}{metricLabel && col.format === 'currency' ? ` (${metricLabel})` : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 8).map((row: any, idx: number) => (
              <tr key={idx} className="border-b border-border last:border-0 hover:bg-canvas/40">
                {columns.map((col) => (
                  <td key={col.key} className="px-2 py-1 text-ink">
                    {format ? format(row[col.key], col.key) : (col.format === 'currency' ? formatCurrency(Number(row[col.key]) || 0) : col.format === 'percent' ? `${Number(row[col.key])?.toFixed(1)}%` : String(row[col.key] ?? '—'))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
