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
} from '@/components';
import { api, type QCInspectionPlan } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  draft: 'neutral',
  archived: 'warning',
};

export default function InspectionPlans() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [plans, setPlans] = React.useState<QCInspectionPlan[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', itemId: '', type: 'incoming', frequency: 'per-batch', criteria: '', status: 'draft' });

  function load() {
    setLoading(true);
    setError(null);
    return api.getQCInspectionPlans()
      .then((res) => setPlans(res.rows ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ name: '', itemId: '', type: 'incoming', frequency: 'per-batch', criteria: '', status: 'draft' });
    setCreateOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createQCInspectionPlan(form);
      notify({ title: 'Inspection plan created', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not create plan', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<QCInspectionPlan>[] = [
    { key: 'name', header: 'Plan', sortable: true },
    { key: 'itemId', header: 'Item', width: '120px' },
    { key: 'type', header: 'Type', width: '120px' },
    { key: 'frequency', header: 'Frequency', width: '140px' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Inspection Plans"
        subtitle="Define what, when, and how to inspect."
        actions={<Button onClick={openCreate}>+ New plan</Button>}
      />

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load plans" description={error} />
      ) : (
        <DataTable
          caption="Inspection plans"
          columns={columns}
          data={plans}
          getRowId={(row) => row.id}
          emptyTitle="No inspection plans"
          emptyDescription="Create a plan to standardize quality checks."
          emptyAction={<Button onClick={openCreate}>+ New plan</Button>}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New inspection plan"
        description="Define criteria and frequency for quality checks."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="qc-plan-form" isLoading={saving} loadingLabel="Creating">Create plan</Button>
          </>
        }
      >
        <form id="qc-plan-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Plan name" htmlFor="qc-name" required>
              <TextField id="qc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Item ID" htmlFor="qc-item" required>
              <TextField id="qc-item" value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Type" htmlFor="qc-type">
              <Select id="qc-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} options={[
                { value: 'incoming', label: 'Incoming' },
                { value: 'in-process', label: 'In-Process' },
                { value: 'final', label: 'Final' },
                { value: 'random', label: 'Random' },
              ]} />
            </FormField>
            <FormField label="Frequency" htmlFor="qc-freq">
              <Select id="qc-freq" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} options={[
                { value: 'per-batch', label: 'Per Batch' },
                { value: 'per-hour', label: 'Per Hour' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]} />
            </FormField>
          </div>
          <FormField label="Criteria" htmlFor="qc-criteria">
            <TextArea id="qc-criteria" value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
