import * as React from 'react';
import {
  Badge,
  Card,
  DataTable,
  type Column,
  EmptyState,
  PageHeader,
  StatCard,
  SkeletonText,
  cn,
  formatINR,
} from '@/components';
import { api, type AgingBuckets, type BalanceSheet, type ProfitLoss, type TrialBalance, type TrialBalanceRow } from '@/lib/api';

type Tab = 'receivables' | 'payables' | 'trial' | 'pl' | 'balance';

const TABS: { id: Tab; label: string }[] = [
  { id: 'receivables', label: 'Receivables aging' },
  { id: 'payables', label: 'Payables aging' },
  { id: 'trial', label: 'Trial balance' },
  { id: 'pl', label: 'Profit & loss' },
  { id: 'balance', label: 'Balance sheet' },
];

function AgingTable({ buckets }: { buckets: AgingBuckets }) {
  const rows = Object.entries(buckets).map(([label, value]) => ({ label, value }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const columns: Column<{ label: string; value: number }>[] = [
    { key: 'label', header: 'Bucket (days)', sortable: true },
    { key: 'value', header: 'Outstanding', align: 'right', render: (r) => <span className="tabular-nums">{formatINR(r.value)}</span> },
  ];
  return (
    <div className="space-y-4">
      <DataTable caption="Aging" columns={columns} data={rows} getRowId={(r) => r.label} />
      <div className="flex justify-end text-sm">
        <span className="text-ink-muted">Total </span>
        <span className="ml-2 font-semibold text-ink tabular-nums">{formatINR(total)}</span>
      </div>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = React.useState<Tab>('receivables');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [ar, setAr] = React.useState<AgingBuckets | null>(null);
  const [ap, setAp] = React.useState<AgingBuckets | null>(null);
  const [trial, setTrial] = React.useState<TrialBalance | null>(null);
  const [pl, setPl] = React.useState<ProfitLoss | null>(null);
  const [balance, setBalance] = React.useState<BalanceSheet | null>(null);

  const loaders: Record<Tab, () => Promise<void>> = {
    receivables: async () => { setAr(await api.getReceivablesAging()); },
    payables: async () => { setAp(await api.getPayablesAging()); },
    trial: async () => { setTrial(await api.getTrialBalance()); },
    pl: async () => { setPl(await api.getProfitLoss()); },
    balance: async () => { setBalance(await api.getBalanceSheet()); },
  };

  const loaded: Record<Tab, boolean> = {
    receivables: !!ar,
    payables: !!ap,
    trial: !!trial,
    pl: !!pl,
    balance: !!balance,
  };

  React.useEffect(() => {
    if (loaded[tab]) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaders[tab]()
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  const trialColumns: Column<TrialBalanceRow>[] = [
    { key: 'code', header: 'Code', width: '90px' },
    { key: 'name', header: 'Account', sortable: true },
    { key: 'type', header: 'Type', hideBelow: 'md' },
    { key: 'opening', header: 'Opening', align: 'right', render: (r) => <span className="tabular-nums">{formatINR(r.opening)}</span> },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => <span className="tabular-nums">{formatINR(r.debit)}</span> },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => <span className="tabular-nums">{formatINR(r.credit)}</span> },
    { key: 'closing', header: 'Closing', align: 'right', render: (r) => <span className="tabular-nums">{formatINR(r.closing)}</span> },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Financial reports" subtitle="Aging, balances and statements for the period to date." />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Reports">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              tab === t.id ? 'border-transparent bg-primary text-white' : 'border-border-strong text-ink-muted hover:bg-canvas'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load report" description={error} />
      ) : tab === 'receivables' && ar ? (
        <AgingTable buckets={ar} />
      ) : tab === 'payables' && ap ? (
        <AgingTable buckets={ap} />
      ) : tab === 'trial' && trial ? (
        <div className="space-y-4">
          <DataTable caption="Trial balance" columns={trialColumns} data={trial.rows} getRowId={(r) => r.code} />
          <div className="flex justify-between rounded bg-canvas px-4 py-3 text-sm">
            <span className="text-ink-muted">Totals</span>
            <span className={cn('font-medium tabular-nums', trial.balanced ? 'text-success' : 'text-danger')}>
              Dr {formatINR(trial.totalDebit)} · Cr {formatINR(trial.totalCredit)}
              {!trial.balanced && ' · unbalanced'}
            </span>
          </div>
        </div>
      ) : tab === 'pl' && pl ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Revenue" value={formatINR(pl.revenue)} trend="up" />
          <StatCard label="Purchases" value={formatINR(pl.purchases)} trend="flat" />
          <StatCard label="GST paid" value={formatINR(pl.gstPaid)} trend="flat" />
          <StatCard label="Operating expense" value={formatINR(pl.operatingExpense)} trend="flat" />
          <StatCard label="Net profit" value={formatINR(pl.netProfit)} trend={pl.netProfit >= 0 ? 'up' : 'down'} />
          <StatCard label="Margin" value={`${pl.marginPct}%`} trend={pl.marginPct >= 0 ? 'up' : 'down'} />
        </div>
      ) : tab === 'balance' && balance ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-base font-semibold text-ink">Assets</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Cash" value={balance.assets.cash} />
              <Row label="Debtors" value={balance.assets.debtors} />
              <Row label="Inventory" value={balance.assets.inventory} />
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-ink">
                <dt>Total assets</dt>
                <dd className="tabular-nums">{formatINR(balance.assets.total)}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="font-display text-base font-semibold text-ink">Liabilities & equity</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Creditors" value={balance.liabilities.creditors} />
              <Row label="Equity" value={balance.liabilities.equity} />
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-ink">
                <dt>Total liabilities</dt>
                <dd className="tabular-nums">{formatINR(balance.liabilities.total)}</dd>
              </div>
            </dl>
          </Card>
          <div className="lg:col-span-2">
            <Badge tone={balance.balanced ? 'success' : 'danger'} withDot>
              {balance.balanced ? 'Balanced' : 'Out of balance'}
            </Badge>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-ink-muted">
      <dt>{label}</dt>
      <dd className="tabular-nums text-ink">{formatINR(value)}</dd>
    </div>
  );
}
