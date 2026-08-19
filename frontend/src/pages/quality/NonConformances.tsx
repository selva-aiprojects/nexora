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
  useToast,
} from '@/components';
import { api, type QCNonConformance } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  open: 'danger',
  investigating: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export default function NonConformances() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ncs, setNcs] = React.useState<QCNonConformance[]>([]);
  const [checks, setChecks] = React.useState<{ id: string; result: string }[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ checkId: '', description: '', severity: 'minor', correctiveAction: '', status: 'open' });

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getQCNonConformances(),
      api.getQCChecks(),
    ])
      .then(([ncList, chkList]) => {
        setNcs(ncList.rows ?? []);
        setChecks(chkList.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ checkId: checks[0]?.id ?? '', description: '', severity: 'minor', correctiveAction: '', status: 'open' });
    setCreateOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createQCNonConformance(form);
      notify({ title: 'Non-conformance raised', tone: 'success' });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not raise non-conformance', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<QCNonConformance>[] = [
    { key: 'description', header: 'Description', sortable: true },
    {
      key: 'severity',
      header: 'Severity',
      width: '120px',
      render: (row) => {
        const tone = row.severity === 'critical' ? 'danger' : row.severity === 'major' ? 'warning' : 'neutral';
        return <Badge tone={tone as any}>{row.severity}</Badge>;
      },
    },
    { key: 'correctiveAction', header: 'Corrective Action', hideBelow: 'md' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} withDot>{row.status}</Badge>,
    },
  ];

  const checkOptions = checks.map((c) => ({ value: c.id, label: `${c.id} — ${c.result}` }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Non-Conformances"
        subtitle="Track and resolve quality deviations."
        actions={<Button onClick={openCreate}>+ Raise NC</Button>}
      />

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load non-conformances" description={error} />
      ) : (
        <DataTable
          caption="Non-conformances"
          columns={columns}
          data={ncs}
          getRowId={(row) => row.id}
          emptyTitle="No non-conformances"
          emptyDescription="All quality checks are passing."
          emptyAction={<Button onClick={openCreate}>+ Raise NC</Button>}
        />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Raise non-conformance"
        description="Log a quality deviation and corrective action."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="nc-form" isLoading={saving} loadingLabel="Saving">Raise NC</Button>
          </>
        }
      >
        <form id="nc-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="QC Check" htmlFor="nc-check" required>
              <Select id="nc-check" value={form.checkId} onChange={(e) => setForm((f) => ({ ...f, checkId: e.target.value }))} options={checkOptions} />
            </FormField>
            <FormField label="Severity" htmlFor="nc-sev" required>
              <Select id="nc-sev" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} options={[
                { value: 'minor', label: 'Minor' },
                { value: 'major', label: 'Major' },
                { value: 'critical', label: 'Critical' },
              ]} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="nc-desc" required>
            <TextArea id="nc-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Corrective Action" htmlFor="nc-ca">
            <TextArea id="nc-ca" value={form.correctiveAction} onChange={(e) => setForm((f) => ({ ...f, correctiveAction: e.target.value }))} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
