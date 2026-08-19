import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  type Column,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  Select,
  SkeletonText,
  TextField,
  useToast,
  formatINR,
} from '@/components';
import { api, ACCOUNT_TYPES, type Account } from '@/lib/api';

const TYPE_TONE: Record<string, 'info' | 'warning' | 'success' | 'neutral' | 'ai'> = {
  Asset: 'info',
  Liability: 'warning',
  Equity: 'neutral',
  Revenue: 'success',
  Expense: 'ai',
};

export default function ChartOfAccounts() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [typeFilter, setTypeFilter] = React.useState('');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ code: '', name: '', type: 'Asset', opening: '' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAccounts(typeFilter ? { type: typeFilter } : undefined);
      setAccounts(res.rows ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getAccounts(typeFilter ? { type: typeFilter } : undefined)
      .then((res) => { if (!cancelled) setAccounts(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [typeFilter]);

  function openCreate() {
    setForm({ code: '', name: '', type: 'Asset', opening: '' });
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      notify({ title: 'Missing fields', description: 'Code and name are required.', tone: 'danger' });
      return;
    }
    setSaving(true);
    try {
      await api.createAccount({
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        opening: Number(form.opening) || 0,
      });
      notify({ title: 'Account created', description: `${form.code} — ${form.name}`, tone: 'success' });
      setModalOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not create account', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Account>[] = [
    { key: 'code', header: 'Code', width: '90px' },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge tone={TYPE_TONE[row.type] ?? 'neutral'} withDot>{row.type}</Badge>,
    },
    {
      key: 'opening',
      header: 'Opening balance',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.opening)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Chart of accounts"
        subtitle="The ledger backbone — every transaction posts to one of these accounts."
        actions={<Button onClick={openCreate}>+ New account</Button>}
      />

      <Card padding="sm" className="flex flex-wrap items-end gap-4">
        <FormField label="Filter by type" htmlFor="type-filter" className="min-w-[200px]">
          <Select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="All types"
            options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </FormField>
      </Card>

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load accounts" description={error} />
      ) : (
        <DataTable
          caption="Chart of accounts"
          columns={columns}
          data={accounts}
          getRowId={(row) => row.id}
          emptyTitle="No accounts yet"
          emptyDescription="Create your first ledger account to start posting entries."
          emptyAction={<Button onClick={openCreate}>+ New account</Button>}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New account"
        description="Add a ledger account to the chart of accounts."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="account-form" isLoading={saving} loadingLabel="Saving">Create account</Button>
          </>
        }
      >
        <form id="account-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Code" htmlFor="acc-code" required>
              <TextField
                id="acc-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="1003"
              />
            </FormField>
            <FormField label="Type" htmlFor="acc-type" required>
              <Select
                id="acc-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </FormField>
          </div>
          <FormField label="Name" htmlFor="acc-name" required>
            <TextField
              id="acc-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Office Rent"
            />
          </FormField>
          <FormField label="Opening balance" htmlFor="acc-opening" help="Balance carried forward as on date">
            <TextField
              id="acc-opening"
              type="number"
              min={0}
              value={form.opening}
              onChange={(e) => setForm((f) => ({ ...f, opening: e.target.value }))}
              placeholder="0"
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
