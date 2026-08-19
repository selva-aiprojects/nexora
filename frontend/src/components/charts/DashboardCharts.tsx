import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4338CA', '#2563EB', '#06B6D4', '#7C3AED', '#059669', '#D97706'];

function formatINR(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value}`;
}

export function RevenueChart({ data }: { data: { month: string; revenue: number; receivables: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatINR(v)} tick={{ fontSize: 12, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: any) => [formatINR(value as number), '']}
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
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--nx-border))" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: 'rgb(var(--nx-ink-muted))' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: any) => [(value as number).toLocaleString(), 'Qty']}
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
