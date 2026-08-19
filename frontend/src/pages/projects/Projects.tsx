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
import { api, type Project } from '@/lib/api';
import { projectSchema, type ProjectInput } from '@/lib/validation';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  draft: 'neutral',
  'on-hold': 'warning',
  completed: 'info',
  cancelled: 'danger',
};

export default function Projects() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<ProjectInput>({
    name: '', code: '', description: '', status: 'draft', startDate: '', endDate: '', budget: 0, managerId: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [detail, setDetail] = React.useState<Project | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    return api.getProjects()
      .then((res) => setProjects(res.rows ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ name: '', code: '', description: '', status: 'draft', startDate: '', endDate: '', budget: 0, managerId: '' });
    setErrors({});
    setCreateOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = projectSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      notify({ title: 'Validation failed', description: 'Please fix the errors below.', tone: 'danger' });
      return;
    }
    setSaving(true);
    try {
      await api.createProject(result.data);
      notify({ title: 'Project created', description: `${result.data.name} is ready.`, tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notify({ title: 'Could not create project', description: message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Project>[] = [
    { key: 'code', header: 'Code', width: '120px' },
    { key: 'name', header: 'Project', sortable: true },
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
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDetail(row)}>View</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Manage projects, WBS, time tracking, and budgets."
        actions={<Button onClick={openCreate}>+ New project</Button>}
      />

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load projects" description={error} />
      ) : (
        <DataTable
          caption="Projects"
          columns={columns}
          data={projects}
          getRowId={(row) => row.id}
          emptyTitle="No projects yet"
          emptyDescription="Create your first project to start tracking."
          emptyAction={<Button onClick={openCreate}>+ New project</Button>}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New project"
        description="Set up a new project with budget and timeline."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="proj-form" isLoading={saving} loadingLabel="Creating">Create project</Button>
          </>
        }
      >
        <form id="proj-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Project name" htmlFor="proj-name" required error={errors.name}>
              <TextField id="proj-name" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Code" htmlFor="proj-code" required error={errors.code}>
              <TextField id="proj-code" value={form.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="proj-desc" error={errors.description}>
            <TextArea id="proj-desc" value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Start date" htmlFor="proj-start" required error={errors.startDate}>
              <TextField id="proj-start" type="date" value={form.startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </FormField>
            <FormField label="End date" htmlFor="proj-end" required error={errors.endDate}>
              <TextField id="proj-end" type="date" value={form.endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Budget" htmlFor="proj-budget" required error={errors.budget}>
              <TextField id="proj-budget" type="number" value={form.budget} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Status" htmlFor="proj-status">
              <Select id="proj-status" value={form.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, status: e.target.value }))} options={[
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'on-hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]} />
            </FormField>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Project ${detail.code}` : ''}
        description={detail?.name}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-ink-muted">Start</div>
                <div className="font-medium text-ink">{detail.startDate}</div>
              </div>
              <div>
                <div className="text-ink-muted">End</div>
                <div className="font-medium text-ink">{detail.endDate}</div>
              </div>
              <div>
                <div className="text-ink-muted">Budget</div>
                <div className="font-medium text-ink tabular-nums">{formatINR(detail.budget)}</div>
              </div>
              <div>
                <div className="text-ink-muted">Status</div>
                <div className="font-medium text-ink">{detail.status}</div>
              </div>
            </div>
            <p className="text-sm text-ink-muted">{detail.description}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
