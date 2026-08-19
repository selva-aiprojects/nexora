import * as React from 'react';
import {
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
import { api, type ProjectBudget } from '@/lib/api';

export default function Budgets() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [budgets, setBudgets] = React.useState<ProjectBudget[]>([]);
  const [projectId, setProjectId] = React.useState('');
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ projectId: '', category: '', amount: 0, period: '' });

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getProjectBudgets(projectId ? { projectId } : undefined),
      api.getProjects(),
    ])
      .then(([buds, proj]) => {
        setBudgets(buds.rows ?? []);
        setProjects(proj.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, [projectId]);

  function openCreate() {
    setForm({ projectId: projects[0]?.id ?? '', category: '', amount: 0, period: new Date().toISOString().slice(0, 7) });
    setCreateOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createProjectBudget(form);
      notify({ title: 'Budget allocated', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not allocate budget', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<ProjectBudget>[] = [
    { key: 'category', header: 'Category', sortable: true },
    { key: 'period', header: 'Period', width: '120px' },
    {
      key: 'amount',
      header: 'Allocated',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.amount)}</span>,
    },
    {
      key: 'spent',
      header: 'Spent',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.spent)}</span>,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatINR(row.amount - row.spent)}</span>,
    },
  ];

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Budgets"
        subtitle="Allocate and track project budgets by category."
        actions={<Button onClick={openCreate}>+ Allocate budget</Button>}
      />

      <div className="flex items-center gap-3">
        <Select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="All projects"
          options={[{ value: '', label: 'All projects' }, ...projectOptions]}
        />
      </div>

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load budgets" description={error} />
      ) : (
        <DataTable
          caption="Budgets"
          columns={columns}
          data={budgets}
          getRowId={(row) => row.id}
          emptyTitle="No budgets"
          emptyDescription="Allocate a budget to start tracking project costs."
          emptyAction={<Button onClick={openCreate}>+ Allocate budget</Button>}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Allocate budget"
        description="Set a budget for a project category."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="bud-form" isLoading={saving} loadingLabel="Saving">Allocate</Button>
          </>
        }
      >
        <form id="bud-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Project" htmlFor="bud-project" required>
              <Select id="bud-project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} options={projectOptions} />
            </FormField>
            <FormField label="Category" htmlFor="bud-cat" required>
              <TextField id="bud-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Development" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount" htmlFor="bud-amt" required>
              <TextField id="bud-amt" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Period" htmlFor="bud-period" required>
              <TextField id="bud-period" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} placeholder="2026-Q3" />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
