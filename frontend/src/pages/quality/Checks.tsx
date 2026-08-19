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
import { api, type QCCheck } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  passed: 'success',
  failed: 'danger',
  pending: 'warning',
  conditional: 'info',
};

export default function QCChecks() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checks, setChecks] = React.useState<QCCheck[]>([]);
  const [plans, setPlans] = React.useState<{ id: string; name: string }[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ planId: '', batchId: '', inspectorId: '', date: new Date().toISOString().slice(0, 10), result: '', remarks: '', status: 'pending' });

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getQCChecks(),
      api.getQCInspectionPlans(),
    ])
      .then(([chks, plns]) => {
        setChecks(chks.rows ?? []);
        setPlans(plns.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ planId: plans[0]?.id ?? '', batchId: '', inspectorId: '', date: new Date().toISOString().slice(0, 10), result: '', remarks: '', status: 'pending' });
    setCreateOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createQCCheck(form);
      notify({ title: 'QC check recorded', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not record check', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<QCCheck>[] = [
    { key: 'date', header: 'Date', width: '120px' },
    { key: 'batchId', header: 'Batch', width: '140px' },
    { key: 'inspectorId', header: 'Inspector', hideBelow: 'md' },
    { key: 'result', header: 'Result', width: '120px' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  const planOptions = plans.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="QC Checks"
        subtitle="Record and review quality inspections."
        actions={<Button onClick={openCreate}>+ New check</Button>}
      />

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load checks" description={error} />
      ) : (
        <DataTable
          caption="QC checks"
          columns={columns}
          data={checks}
          getRowId={(row) => row.id}
          emptyTitle="No QC checks"
          emptyDescription="Record a check to start quality monitoring."
          emptyAction={<Button onClick={openCreate}>+ New check</Button>}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New QC check"
        description="Record a quality inspection result."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="qc-check-form" isLoading={saving} loadingLabel="Saving">Record</Button>
          </>
        }
      >
        <form id="qc-check-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Inspection plan" htmlFor="qc-plan" required>
              <Select id="qc-plan" value={form.planId} onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))} options={planOptions} />
            </FormField>
            <FormField label="Batch ID" htmlFor="qc-batch">
              <TextField id="qc-batch" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Inspector ID" htmlFor="qc-inspector" required>
              <TextField id="qc-inspector" value={form.inspectorId} onChange={(e) => setForm((f) => ({ ...f, inspectorId: e.target.value }))} />
            </FormField>
            <FormField label="Date" htmlFor="qc-date" required>
              <TextField id="qc-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Result" htmlFor="qc-result">
            <TextArea id="qc-result" value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} />
          </FormField>
          <FormField label="Remarks" htmlFor="qc-remarks">
            <TextArea id="qc-remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
