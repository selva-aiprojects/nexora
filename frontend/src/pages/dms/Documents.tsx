import * as React from 'react';
import { useState } from 'react';
import { Button, Card, DataTable, PageHeader, Modal, FormField, Select, TextField, type Column, useToast } from '@/components';
import { api } from '@/lib/api';

const CATEGORIES = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'gst', label: 'GST' },
  { value: 'policy', label: 'Policy' },
  { value: 'purchase_invoice', label: 'Purchase Invoice' },
  { value: 'employee', label: 'Employee' },
];

function DMSDocuments() {
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<any | null>(null);
  const [versions, setVersions] = React.useState<any[]>([]);
  const [shareOpen, setShareOpen] = React.useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.getDMSDocuments({ pageSize: 20, page })
      .then((res) => {
        if (cancelled) return;
        setDocuments(res.rows ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  React.useEffect(() => { load(); }, [load]);

  const openDetail = async (doc: any) => {
    setDetail(doc);
    try {
      const v = await api.getDMSDocumentVersions(doc.id);
      setVersions(v);
    } catch {
      setVersions([]);
    }
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (row) => <button onClick={() => openDetail(row)} className="text-left text-primary hover:underline">{row.name}</button> },
    { key: 'category', header: 'Category', hideBelow: 'md' },
    { key: 'mimeType', header: 'Type', hideBelow: 'md' },
    {
      key: 'size',
      header: 'Size',
      align: 'right',
      render: (row) => {
        const kb = row.size / 1024;
        return <span className="tabular-nums">{kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`}</span>;
      },
    },
    { key: 'currentVersion', header: 'Ver', align: 'right' },
  ];

  if (loading) return <div className="p-6 text-sm text-ink-muted">Loading documents…</div>;
  if (error) return <div className="p-6 text-sm text-danger">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Documents" subtitle="Central document store and version history." actions={<Button onClick={() => setUploadOpen(true)}>Upload</Button>} />
      <DataTable
        caption="Documents"
        columns={columns}
        data={documents}
        getRowId={(row) => row.id}
        pagination={{ page, pageSize: 20, total, onPageChange: setPage }}
        emptyTitle="No documents"
        emptyDescription="Uploaded documents will appear here."
      />

      {detail && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">{detail.name}</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>Share</Button>
              <Button size="sm" onClick={() => { api.createDMSDocumentVersion(detail.id, { note: 'New version' }).then(() => { notify({ title: 'Version added', tone: 'success' }); openDetail(detail); }); }}>New Version</Button>
              <Button size="sm" variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-ink-muted">Category</p>
              <p className="text-sm text-ink">{detail.category}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Size</p>
              <p className="text-sm text-ink">{(detail.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink">Versions</h3>
            <div className="mt-2 space-y-2">
              {versions.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                  <div>
                    <p className="text-sm text-ink">v{v.version} — {v.note}</p>
                    <p className="text-xs text-ink-muted">{v.uploadedOn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload document" description="Add a new document to the store." footer={<Button onClick={() => setUploadOpen(false)}>Close</Button>}>
        <UploadForm onClose={() => setUploadOpen(false)} onUploaded={() => { setUploadOpen(false); load(); }} />
      </Modal>

      {detail && (
        <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share document" description="Grant access to another user." footer={<Button onClick={() => setShareOpen(false)}>Close</Button>}>
          <ShareForm documentId={detail.id} onClose={() => setShareOpen(false)} onShared={() => { setShareOpen(false); notify({ title: 'Shared', tone: 'success' }); }} />
        </Modal>
      )}
    </div>
  );
}

function UploadForm({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const { notify } = useToast();
  const [form, setForm] = useState({ name: '', category: '', folderId: 'fol_root', tags: '', mimeType: 'application/pdf', size: 0 });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDMSDocument({
        name: form.name,
        category: form.category,
        folderId: form.folderId,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        mimeType: form.mimeType,
        size: form.size,
      });
      notify({ title: 'Uploaded', description: 'Document uploaded successfully.', tone: 'success' });
      onUploaded();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <FormField label="Name" htmlFor="dms-name" required>
        <TextField id="dms-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </FormField>
      <FormField label="Category" htmlFor="dms-cat" required>
        <Select id="dms-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} options={CATEGORIES} placeholder="Select category" required />
      </FormField>
      <FormField label="Tags (comma separated)" htmlFor="dms-tags">
        <TextField id="dms-tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">Upload</Button>
      </div>
    </form>
  );
}

function ShareForm({ documentId, onClose, onShared }: { documentId: string; onClose: () => void; onShared: () => void }) {
  const { notify } = useToast();
  const [sharedWith, setSharedWith] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.shareDMSDocument(documentId, { sharedWith, expiresOn: null });
      onShared();
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    }
  };
  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <FormField label="Share with (email)" htmlFor="dms-share" required>
        <TextField id="dms-share" value={sharedWith} onChange={(e) => setSharedWith(e.target.value)} required />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">Share</Button>
      </div>
    </form>
  );
}

export default DMSDocuments;
