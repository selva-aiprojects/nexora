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
  TextArea,
  TextField,
  useToast,
} from '@/components';
import { api, type ProjectTimeEntry } from '@/lib/api';

export default function TimeEntries() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<ProjectTimeEntry[]>([]);
  const [projectId, setProjectId] = React.useState('');
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ projectId: '', wbsId: '', employeeId: '', date: new Date().toISOString().slice(0, 10), hours: 8, description: '', billable: true });

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getTimeEntries(projectId ? { projectId } : undefined),
      api.getProjects(),
    ])
      .then(([ents, proj]) => {
        setEntries(ents.rows ?? []);
        setProjects(proj.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, [projectId]);

  function openCreate() {
    setForm({ projectId: projects[0]?.id ?? '', wbsId: '', employeeId: '', date: new Date().toISOString().slice(0, 10), hours: 8, description: '', billable: true });
    setCreateOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createTimeEntry({ ...form, wbsId: form.wbsId || null });
      notify({ title: 'Time entry logged', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not log time', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<ProjectTimeEntry>[] = [
    { key: 'date', header: 'Date', width: '120px' },
    { key: 'employeeId', header: 'Employee', hideBelow: 'md' },
    { key: 'description', header: 'Description', hideBelow: 'sm' },
    {
      key: 'hours',
      header: 'Hours',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums">{row.hours}h</span>,
    },
    {
      key: 'billable',
      header: 'Billable',
      align: 'center',
      render: (row) => row.billable ? 'Yes' : 'No',
    },
  ];

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Time Entries"
        subtitle="Track hours spent on projects and WBS items."
        actions={<Button onClick={openCreate}>+ Log time</Button>}
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
        <EmptyState variant="error" title="Couldn't load time entries" description={error} />
      ) : (
        <DataTable
          caption="Time entries"
          columns={columns}
          data={entries}
          getRowId={(row) => row.id}
          emptyTitle="No time entries"
          emptyDescription="Log time to start tracking project effort."
          emptyAction={<Button onClick={openCreate}>+ Log time</Button>}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Log time"
        description="Record hours worked on a project."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="te-form" isLoading={saving} loadingLabel="Saving">Log time</Button>
          </>
        }
      >
        <form id="te-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Project" htmlFor="te-project" required>
              <Select id="te-project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} options={projectOptions} />
            </FormField>
            <FormField label="Date" htmlFor="te-date" required>
              <TextField id="te-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Hours" htmlFor="te-hours" required>
              <TextField id="te-hours" type="number" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Employee ID" htmlFor="te-emp">
              <TextField id="te-emp" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="te-desc">
            <TextArea id="te-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
