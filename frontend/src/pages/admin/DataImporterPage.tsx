import * as React from 'react';
import { api } from '@/lib/api';
import { Button, Badge, Card, Modal, useToast } from '@/components';

interface ImportEntity {
  key: string;
  displayName: string;
  requiredFields: string[];
  allowedFields: string[];
  sampleCsvHeaders: string;
}

interface ParsedRow {
  [key: string]: string;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

export default function DataImporterPage() {
  const { notify } = useToast();
  const [entities, setEntities] = React.useState<ImportEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = React.useState<ImportEntity | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([]);
  const [preview, setPreview] = React.useState<any>(null);
  const [committed, setCommitted] = React.useState<any>(null);
  const [step, setStep] = React.useState<'select' | 'upload' | 'preview' | 'done'>('select');
  const [loading, setLoading] = React.useState(false);
  const [templateModalOpen, setTemplateModalOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    api.getImporterEntities().then(res => setEntities(res.entities || []));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = parseCsv(text);
      setParsedRows(rows);
      if (rows.length > 0) {
        setStep('upload');
      } else {
        notify({ title: 'Could not parse CSV', description: 'File appears empty or malformed.', tone: 'warning' });
      }
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!selectedEntity || parsedRows.length === 0) return;
    setLoading(true);
    try {
      const res = await api.previewImport(selectedEntity.key, parsedRows);
      setPreview(res);
      setStep('preview');
    } catch (err: any) {
      notify({ title: 'Preview failed', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedEntity || !preview?.canCommit) return;
    setLoading(true);
    try {
      const res = await api.commitImport(selectedEntity.key, parsedRows);
      setCommitted(res);
      setStep('done');
      notify({ title: 'Import Complete!', description: res.message, tone: 'success' });
    } catch (err: any) {
      notify({ title: 'Import failed', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedEntity(null);
    setParsedRows([]);
    setPreview(null);
    setCommitted(null);
    setStep('select');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const STEPS = ['select', 'upload', 'preview', 'done'] as const;
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Universal Data Importer</h1>
          <p className="text-sm text-ink-muted">
            Bulk import master data from CSV — Customers, Vendors, Items, Employees & Fixed Assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => setTemplateModalOpen(true)}>
            📄 Download Templates
          </Button>
          {step !== 'select' && (
            <Button variant="ghost" size="md" onClick={handleReset}>
              ↺ Start Over
            </Button>
          )}
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="flex items-center gap-0">
        {['Select Entity', 'Upload CSV', 'Validate & Preview', 'Done'].map((label, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-2 ${i <= stepIdx ? 'text-primary' : 'text-ink-muted'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < stepIdx ? 'bg-success text-white' :
                i === stepIdx ? 'bg-primary text-white' :
                'bg-surface-raised text-ink-muted border border-border-strong'
              }`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{label}</span>
            </div>
            {i < 3 && <div className={`h-px flex-1 mx-2 ${i < stepIdx ? 'bg-success' : 'bg-border-strong'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select Entity */}
      {step === 'select' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entities.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-sm text-ink-muted">Loading entity types…</div>
          ) : entities.map((entity) => (
            <Card
              key={entity.key}
              className={`cursor-pointer p-5 transition-all hover:border-primary hover:shadow-md ${
                selectedEntity?.key === entity.key ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => { setSelectedEntity(entity); }}
            >
              <div className="font-semibold text-ink mb-1">{entity.displayName}</div>
              <div className="text-xs text-ink-muted mb-3">
                Required: <span className="font-medium text-ink">{entity.requiredFields.join(', ')}</span>
              </div>
              <div className="text-[11px] text-ink-muted font-mono bg-surface-raised rounded p-1.5 overflow-x-auto whitespace-nowrap">
                {entity.sampleCsvHeaders}
              </div>
            </Card>
          ))}
          {selectedEntity && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface p-10 text-center transition-all hover:border-primary hover:bg-primary/5">
                <span className="text-3xl mb-3">📂</span>
                <span className="font-semibold text-ink">{selectedEntity.displayName} — Upload CSV File</span>
                <span className="text-xs text-ink-muted mt-1">Click to browse or drag & drop your file</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Upload / Confirm rows parsed */}
      {step === 'upload' && selectedEntity && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-ink">File Loaded: {parsedRows.length} rows detected</div>
              <div className="text-xs text-ink-muted">Entity: {selectedEntity.displayName}</div>
            </div>
            <Badge tone="info">{parsedRows.length} rows</Badge>
          </div>

          {/* Preview first 3 rows */}
          <div className="overflow-x-auto rounded-lg border border-border-strong">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-raised">
                <tr>
                  {Object.keys(parsedRows[0] || {}).map(h => (
                    <th key={h} className="px-3 py-2 font-semibold text-ink border-b border-border-strong">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-strong">
                {parsedRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="text-ink-muted">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-2">{val || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 5 && (
            <div className="text-xs text-ink-muted text-center">…and {parsedRows.length - 5} more rows</div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={handleReset}>Change File</Button>
            <Button variant="primary" onClick={handlePreview} isLoading={loading}>
              Validate All Rows →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Preview & Validation Results */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className={`flex items-center gap-4 rounded-xl p-4 border ${preview.canCommit ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
            <span className="text-2xl">{preview.canCommit ? '✅' : '⚠️'}</span>
            <div className="flex-1">
              <div className="font-semibold text-ink">{preview.message}</div>
              <div className="text-xs text-ink-muted mt-0.5">
                Valid: <b className="text-success">{preview.validCount}</b> &nbsp;|&nbsp;
                Errors: <b className="text-danger">{preview.invalidCount}</b> &nbsp;|&nbsp;
                Total: {preview.totalRows}
              </div>
            </div>
          </div>

          {/* Error rows */}
          {preview.invalidRows?.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="font-semibold text-danger text-sm">Rows with Errors (fix before import)</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {preview.invalidRows.map((r: any) => (
                  <div key={r.rowIndex} className="flex items-start gap-2 text-xs rounded bg-danger/5 border border-danger/20 p-2">
                    <span className="font-bold text-danger whitespace-nowrap">Row {r.rowIndex}:</span>
                    <span className="text-danger">{r.errors.join(' | ')}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Valid rows preview */}
          {preview.validRows?.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="font-semibold text-success text-sm">Sample Valid Rows (first {Math.min(preview.validRows.length, 5)})</div>
              <div className="overflow-x-auto rounded border border-border-strong">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-ink-muted border-b border-border-strong">Row</th>
                      {Object.keys(preview.validRows[0]?.row || {}).slice(0, 6).map(h => (
                        <th key={h} className="px-3 py-2 font-semibold text-ink border-b border-border-strong">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-strong">
                    {preview.validRows.slice(0, 5).map((r: any) => (
                      <tr key={r.rowIndex} className="text-ink-muted">
                        <td className="px-3 py-2 text-success font-bold">#{r.rowIndex}</td>
                        {Object.values(r.row).slice(0, 6).map((val: any, j: number) => (
                          <td key={j} className="px-3 py-2">{val || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={handleReset}>Start Over</Button>
            <Button
              variant="primary"
              onClick={handleCommit}
              isLoading={loading}
              disabled={!preview.canCommit}
            >
              {preview.canCommit ? `Import ${preview.validCount} Records →` : 'Fix Errors First'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && committed && (
        <Card className="p-10 text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <div className="font-display text-2xl font-bold text-success">Import Successful!</div>
          <div className="text-sm text-ink-muted max-w-md mx-auto">{committed.message}</div>
          <div className="flex items-center justify-center gap-8 text-sm mt-4">
            <div>
              <div className="text-2xl font-bold text-success">{committed.imported}</div>
              <div className="text-xs text-ink-muted">Records Imported</div>
            </div>
            {committed.errors?.length > 0 && (
              <div>
                <div className="text-2xl font-bold text-danger">{committed.errors.length}</div>
                <div className="text-xs text-ink-muted">Rows with Errors</div>
              </div>
            )}
          </div>
          <Button variant="primary" onClick={handleReset} className="mt-4">
            Import More Data
          </Button>
        </Card>
      )}

      {/* Template Download Modal */}
      <Modal open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="CSV Templates" size="md">
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Download these sample CSV templates and populate them with your data before importing.</p>
          {entities.map(entity => (
            <div key={entity.key} className="flex items-center justify-between rounded-lg border border-border-strong p-3">
              <div>
                <div className="font-medium text-ink text-sm">{entity.displayName}</div>
                <div className="text-[11px] text-ink-muted font-mono mt-0.5">{entity.sampleCsvHeaders}</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const blob = new Blob([entity.sampleCsvHeaders + '\n'], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `nexora_${entity.key}_template.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                ↓ Template
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
