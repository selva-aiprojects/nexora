import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card } from '@/components';

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

function PieLabel({ name, percent, ...rest }: any) {
  const { x, y } = rest;
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="rgb(var(--nx-ink))" fontSize="10" fontWeight="500">
      {name} {((percent ?? 0) * 100).toFixed(0)}%
    </text>
  );
}

export function RevenueChart({ data }: { data: { month: string; revenue: number; receivables: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
        <defs>
          <linearGradient id="nx-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="rgb(var(--nx-primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="rgb(var(--nx-primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="nx-receivables" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="rgb(var(--nx-ai-cyan))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="rgb(var(--nx-ai-cyan))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--nx-border))" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: 'Month', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <YAxis tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <Tooltip
          formatter={(value: any, name: any) => [formatINR(value as number), name]}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
        <Area type="monotone" dataKey="revenue" stroke="rgb(var(--nx-primary))" fill="url(#nx-revenue)" strokeWidth={2} name="Revenue" />
        <Area type="monotone" dataKey="receivables" stroke="rgb(var(--nx-ai-cyan))" fill="url(#nx-receivables)" strokeWidth={2} name="Receivables" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StockByWarehouseChart({ data }: { data: { name: string; qty: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--nx-border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: 'Warehouse', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: 'Stock Qty', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <Tooltip
          formatter={(value: any) => [`${(value as number).toLocaleString()} units`, 'Stock Qty']}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
        <Bar dataKey="qty" fill="rgb(var(--nx-ai-blue))" radius={[4, 4, 0, 0]} name="Stock Qty" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LowStockPieChart({ data }: { data: { name: string; qty: number; reorder: number }[] }) {
  const chartData = data.map((item) => ({
    name: item.name,
    value: Math.max(1, item.reorder - item.qty),
  }));
  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-muted">No low-stock items</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          stroke="none"
          label={<PieLabel />}
        >
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any, name: any) => [`${value} units below reorder`, name]}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ARAgingChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--nx-border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: 'Age Bucket', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <Tooltip
          formatter={(value: any) => [formatINR(value as number), 'Outstanding']}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
        <Bar dataKey="value" fill="rgb(var(--nx-primary))" radius={[4, 4, 0, 0]} name="AR Outstanding" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusBreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          stroke="none"
          label={<PieLabel />}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => [`${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`, '']}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LineChart({ data, dataKey, name, color, xAxisLabel, yAxisLabel }: { data: { name: string; [key: string]: number | string }[]; dataKey: string; name: string; color?: string; xAxisLabel?: string; yAxisLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
        <defs>
          <linearGradient id={`nx-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color || 'rgb(var(--nx-primary))'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color || 'rgb(var(--nx-primary))'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--nx-border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: xAxisLabel || 'Period', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <YAxis tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: yAxisLabel || 'Amount (₹)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <Tooltip
          formatter={(value: any) => [formatINR(value as number), name]}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color || 'rgb(var(--nx-primary))'} fill={`url(#nx-${dataKey})`} strokeWidth={2} name={name} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarChartGeneric({ data, dataKey, name, color, xAxisLabel, yAxisLabel }: { data: { name: string; [key: string]: number | string }[]; dataKey: string; name: string; color?: string; xAxisLabel?: string; yAxisLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--nx-border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: xAxisLabel || 'Category', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <YAxis tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: yAxisLabel || 'Amount (₹)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <Tooltip
          formatter={(value: any) => [formatINR(value as number), name]}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
        <Bar dataKey={dataKey} fill={color || 'rgb(var(--nx-ai-blue))'} radius={[4, 4, 0, 0]} name={name} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, dataKey, nameKey, centerLabel, centerValue, metricLabel }: { data: { name: string; value: number }[]; dataKey?: string; nameKey?: string; centerLabel?: string; centerValue?: string; metricLabel?: string }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey={dataKey || 'value'}
          nameKey={nameKey || 'name'}
          stroke="none"
          label={<PieLabel />}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any, name: any) => [`${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`, name]}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
          labelFormatter={(label) => `${metricLabel || 'Metric'}: ${label}`}
        />
        {centerLabel && (
          <text x="50%" y="50%" textAnchor="middle" dy="-0.2em" fill="rgb(var(--nx-ink))" fontSize="11" fontWeight="500">
            {centerLabel}
          </text>
        )}
        {centerValue && (
          <text x="50%" y="50%" textAnchor="middle" dy="1em" fill="rgb(var(--nx-ink-muted))" fontSize="16" fontWeight="600">
            {centerValue}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MultiLineChart({ data, lines, xAxisLabel, yAxisLabel }: { data: { name: string; [key: string]: number | string }[]; lines: { dataKey: string; name: string; color: string }[]; xAxisLabel?: string; yAxisLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient key={line.dataKey} id={`nx-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--nx-border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: xAxisLabel || 'Period', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <YAxis tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} label={{ value: yAxisLabel || 'Amount (₹)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: 'rgb(var(--nx-ink-muted))' }} />
        <Tooltip
          formatter={(value: any, name: any) => [formatINR(value as number), name]}
          contentStyle={{ background: 'rgb(var(--nx-surface))', border: '1px solid rgb(var(--nx-border))', borderRadius: 'var(--nx-radius-md)', boxShadow: 'var(--nx-shadow-md)' }}
        />
        <Legend />
        {lines.map((line) => (
          <Area key={line.dataKey} type="monotone" dataKey={line.dataKey} stroke={line.color} fill={`url(#nx-${line.dataKey})`} strokeWidth={2} name={line.name} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
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

