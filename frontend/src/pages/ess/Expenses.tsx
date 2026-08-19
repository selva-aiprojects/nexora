import * as React from 'react';
import { Badge, Button, DataTable, PageHeader, Modal, FormField, Select, TextArea, TextField, useToast } from '@/components';
import { api } from '@/lib/api';

export default function ESSExpenses() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getESSExpenses()
      .then((res) => { if (!cancelled) setRows(res.rows ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.createESSExpense({
        category: String(fd.get('category')),
        amount: Number(fd.get('amount')),
        date: String(fd.get('date')),
        description: String(fd.get('description') || ''),
      });
      notify({ title: 'Expense submitted', tone: 'success' });
      setOpen(false);
      load();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading expenses…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Expenses" subtitle="Submit and track expense claims." actions={<Button onClick={() => setOpen(true)}>New Expense</Button>} />
      <DataTable
        caption="Expenses"
        columns={[
          { key: 'date', header: 'Date', sortable: true },
          { key: 'category', header: 'Category' },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            render: (row) => <span className="tabular-nums">₹{row.amount.toLocaleString('en-IN')}</span>,
          },
          { key: 'description', header: 'Description', hideBelow: 'md' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge tone={row.status === 'reimbursed' ? 'success' : row.status === 'submitted' ? 'warning' : 'neutral'} withDot>{row.status}</Badge>,
          },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No expenses"
        emptyDescription="Submit an expense to see it here."
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New expense" description="Submit an expense claim." footer={<Button type="submit" form="ess-expense-form" isLoading={busy}>Submit</Button>}>
        <form id="ess-expense-form" onSubmit={submit} className="mt-4 grid gap-4">
          <FormField label="Category" htmlFor="ess-exp-cat" required>
            <Select id="ess-exp-cat" name="category" options={[{ value: 'Travel', label: 'Travel' }, { value: 'Meals', label: 'Meals' }, { value: 'Office', label: 'Office' }]} placeholder="Select category" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount" htmlFor="ess-exp-amt" required>
              <TextField id="ess-exp-amt" name="amount" type="number" min={0} step="0.01" required />
            </FormField>
            <FormField label="Date" htmlFor="ess-exp-date" required>
              <TextField id="ess-exp-date" name="date" type="date" required />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="ess-exp-desc">
            <TextArea id="ess-exp-desc" name="description" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
