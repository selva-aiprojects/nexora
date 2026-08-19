import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
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
  cn,
  formatINR,
} from '@/components';
import { api, type Account, type JournalEntry, type JournalEntryLine } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  posted: 'success',
  draft: 'neutral',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyLine(accounts: Account[]): JournalEntryLine {
  return { accountId: accounts[0]?.id ?? '', description: '', debit: 0, credit: 0 };
}

export default function JournalEntries() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ date: today(), narration: '', lines: [] as JournalEntryLine[] });

  const [postTarget, setPostTarget] = React.useState<JournalEntry | null>(null);
  const [posting, setPosting] = React.useState(false);

  function load() {
    setLoading(true);
    setError(null);
    return Promise.all([
      api.getJournalEntries(),
      api.getAccounts(),
    ])
      .then(([je, acc]) => {
        setEntries(je.rows ?? []);
        setAccounts(acc.rows ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ date: today(), narration: '', lines: accounts.length ? [emptyLine(accounts)] : [] });
    setModalOpen(true);
  }

  function updateLine(idx: number, patch: Partial<JournalEntryLine>) {
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, emptyLine(accounts)] }));
  }

  function removeLine(idx: number) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }

  const totalDebit = form.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.narration.trim() || form.lines.length < 2) {
      notify({ title: 'Incomplete entry', description: 'Add at least two lines with a narration.', tone: 'danger' });
      return;
    }
    if (!balanced) {
      notify({ title: 'Out of balance', description: 'Total debit must equal total credit.', tone: 'danger' });
      return;
    }
    const cleaned = form.lines.map((l) => ({
      accountId: l.accountId,
      description: l.description,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    }));
    setSaving(true);
    try {
      await api.createJournalEntry({ date: form.date, narration: form.narration.trim(), entries: cleaned });
      notify({ title: 'Journal entry created', description: 'Saved as a draft.', tone: 'success' });
      setModalOpen(false);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not save entry', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  async function confirmPost() {
    if (!postTarget) return;
    setPosting(true);
    try {
      await api.postJournalEntry(postTarget.id);
      notify({ title: 'Entry posted', description: `${postTarget.number} is now posted.`, tone: 'success' });
      setPostTarget(null);
      await load();
    } catch (err: any) {
      notify({ title: 'Could not post', description: err.message, tone: 'danger' });
    } finally {
      setPosting(false);
    }
  }

  const columns: Column<JournalEntry>[] = [
    { key: 'number', header: 'Voucher #', width: '120px' },
    { key: 'date', header: 'Date', width: '120px' },
    { key: 'narration', header: 'Narration', render: (row) => <span className="line-clamp-1">{row.narration}</span> },
    {
      key: 'entries',
      header: 'Accounts',
      hideBelow: 'md',
      render: (row) => <span className="text-ink-muted">{row.entries.length} lines</span>,
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
      render: (row) =>
        row.status === 'draft' ? (
          <Button size="sm" variant="secondary" onClick={() => setPostTarget(row)}>Post</Button>
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        ),
    },
  ];

  const accountOptions = accounts.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Journal entries"
        subtitle="Manual vouchers that move money between ledger accounts."
        actions={<Button onClick={openCreate}>+ New entry</Button>}
      />

      {loading ? (
        <Card padding="lg"><SkeletonText lines={6} /></Card>
      ) : error ? (
        <EmptyState variant="error" title="Couldn't load journal entries" description={error} />
      ) : (
        <DataTable
          caption="Journal entries"
          columns={columns}
          data={entries}
          getRowId={(row) => row.id}
          emptyTitle="No journal entries yet"
          emptyDescription="Record an adjusting entry or a manual transfer."
          emptyAction={<Button onClick={openCreate}>+ New entry</Button>}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New journal entry"
        description="Debits must equal credits before you can save."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="je-form" isLoading={saving} loadingLabel="Saving" disabled={!balanced}>
              Save draft
            </Button>
          </>
        }
      >
        <form id="je-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" htmlFor="je-date" required>
              <TextField id="je-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Narration" htmlFor="je-narration" required>
            <TextArea
              id="je-narration"
              value={form.narration}
              onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))}
              placeholder="e.g. Depreciation for July"
            />
          </FormField>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Line items</span>
              <Button type="button" size="sm" variant="ghost" onClick={addLine}>+ Add line</Button>
            </div>

            {form.lines.length === 0 && (
              <p className="text-xs text-ink-muted">Select an account and enter a debit or credit amount.</p>
            )}

            {form.lines.map((line, idx) => (
              <div key={idx} className="grid gap-2 rounded border border-border p-3 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-5">
                  <FormField label="Account" htmlFor={`je-acc-${idx}`} required>
                    <Select
                      id={`je-acc-${idx}`}
                      value={line.accountId}
                      onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                      placeholder="Select account"
                      options={accountOptions}
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-3">
                  <FormField label="Debit" htmlFor={`je-debit-${idx}`}>
                    <TextField
                      id={`je-debit-${idx}`}
                      type="number"
                      min={0}
                      value={line.debit || ''}
                      onChange={(e) => updateLine(idx, { debit: Number(e.target.value), credit: 0 })}
                      placeholder="0"
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-3">
                  <FormField label="Credit" htmlFor={`je-credit-${idx}`}>
                    <TextField
                      id={`je-credit-${idx}`}
                      type="number"
                      min={0}
                      value={line.credit || ''}
                      onChange={(e) => updateLine(idx, { credit: Number(e.target.value), debit: 0 })}
                      placeholder="0"
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(idx)} disabled={form.lines.length <= 1}>✕</Button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded bg-canvas px-3 py-2 text-sm">
              <span className="text-ink-muted">Totals</span>
              <span className={cn(balanced ? 'text-success' : 'text-danger')}>
                Dr {formatINR(totalDebit)} · Cr {formatINR(totalCredit)}
                {!balanced && ' · unbalanced'}
              </span>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!postTarget}
        onClose={() => setPostTarget(null)}
        onConfirm={confirmPost}
        title="Post journal entry?"
        description="Posted entries update the ledger and can't be edited from this screen."
        confirmLabel="Post entry"
        loading={posting}
      />
    </div>
  );
}
