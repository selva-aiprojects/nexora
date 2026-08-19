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
  TextArea,
  TextField,
  useToast,
  formatINR,
} from '@/components';
import { api, type ProjectWbs } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  completed: 'success',
  active: 'info',
  pending: 'warning',
  'on-hold': 'warning',
};

export default function WBS() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ProjectWbs[]>([]);
  const [projectId, setProjectId] = React.useState('');
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ projectId: '', name: '', description: '', parentId: '', startDate: '', endDate: '', budget: 0, status: 'pending' });

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getWbs(projectId ? { projectId } : undefined),
      api.getProjects(),
    ])
      .then(([wbs, proj]) => {
        setItems(wbs.rows ?? []);
        setProjects(proj.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, [projectId]);

  function openCreate() {
    setForm({ projectId: projects[0]?.id ?? '', name: '', description: '', parentId: '', startDate: '', endDate: '', budget: 0, status: 'pending' });
    setCreateOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createWbs({ ...form, parentId: form.parentId || null });
      notify({ title: 'WBS item created', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not create WBS item', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<ProjectWbs>[] = [
    { key: 'name', header: 'WBS Item', sortable: true },
    { key: 'projectId', header: 'Project', hideBelow: 'md' },
    { key: 'startDate', header: 'Start', width: '120px' },
    { key: 'endDate', header: 'End', width: '120px' },
    {
      key: 'budget',
      header: 'Budget',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{formatINR(row.budget)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Work Breakdown Structure"
        subtitle="Break projects into manageable tasks and track progress."
        actions={<Button onClick={openCreate}>+ New WBS item</Button>}
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
        <EmptyState variant="error" title="Couldn't load WBS" description={error} />
      ) : (
        <DataTable
          caption="WBS items"
          columns={columns}
          data={items}
          getRowId={(row) => row.id}
          emptyTitle="No WBS items"
          emptyDescription="Create WBS items to break down your projects."
          emptyAction={<Button onClick={openCreate}>+ New WBS item</Button>}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New WBS item"
        description="Add a task or milestone to a project."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="wbs-form" isLoading={saving} loadingLabel="Creating">Create</Button>
          </>
        }
      >
        <form id="wbs-form" className="space-y-4" onSubmit={submit}>
          <FormField label="Project" htmlFor="wbs-project" required>
            <Select id="wbs-project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} options={projectOptions} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="wbs-name" required>
              <TextField id="wbs-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Parent WBS" htmlFor="wbs-parent">
              <Select id="wbs-parent" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))} options={[{ value: '', label: 'None' }, ...items.filter((i) => i.projectId === form.projectId).map((i) => ({ value: i.id, label: i.name }))]} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="wbs-desc">
            <TextArea id="wbs-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Start date" htmlFor="wbs-start">
              <TextField id="wbs-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </FormField>
            <FormField label="End date" htmlFor="wbs-end">
              <TextField id="wbs-end" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </FormField>
            <FormField label="Budget" htmlFor="wbs-budget">
              <TextField id="wbs-budget" type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
