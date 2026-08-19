import * as React from 'react';
import {
  DataTable,
  type Column,
  EmptyState,
  PageHeader,
  StatCard,
  formatINR,
} from '@/components';
import { api, type BankAccount } from '@/lib/api';

export default function BankAccounts() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getBankAccounts()
      .then((res) => { if (!cancelled) setAccounts(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const columns: Column<BankAccount>[] = [
    { key: 'name', header: 'Account', sortable: true },
    { key: 'ifsc', header: 'IFSC', hideBelow: 'md' },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.balance)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Bank accounts"
        subtitle="Liquid balances held across the entity's bank accounts."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total balance" value="—" isLoading />
          <StatCard label="Accounts" value="—" isLoading />
        </div>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load bank accounts" description={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total balance" value={formatINR(totalBalance)} trend="up" />
            <StatCard label="Accounts" value={accounts.length} />
          </div>
          <DataTable
            caption="Bank accounts"
            columns={columns}
            data={accounts}
            getRowId={(row) => row.id}
            emptyTitle="No bank accounts"
            emptyDescription="Linked bank accounts will appear here."
          />
        </>
      )}
    </div>
  );
}
