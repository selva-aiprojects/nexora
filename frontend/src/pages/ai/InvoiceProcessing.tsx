import * as React from 'react';
import { Badge, Button, Card, PageHeader, FormField, TextArea, useToast } from '@/components';
import { api } from '@/lib/api';

export default function AIInvoiceProcessing() {
  const { notify } = useToast();
  const [text, setText] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const process = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.processInvoiceAI(text.trim());
      setResult(res);
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Invoice Processing" subtitle="AI-powered OCR and extraction pipeline." />
      <Card>
        <form onSubmit={process} className="grid gap-4">
          <FormField label="Invoice text" htmlFor="ai-inv-text" required>
            <TextArea id="ai-inv-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste invoice text or structured draft here..." required />
          </FormField>
          <Button type="submit" isLoading={loading}>Process</Button>
        </form>
      </Card>
      {result && (
        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Extracted data</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-ink-muted">Vendor</p>
              <p className="text-sm text-ink">{result.extracted.vendorName}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">GSTIN</p>
              <p className="text-sm text-ink">{result.extracted.gstin ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Amount</p>
              <p className="text-sm text-ink">₹{result.extracted.amount.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Confidence</p>
              <p className="text-sm text-ink">{(result.extracted.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Badge tone={result.duplicate ? 'danger' : 'success'}>{result.status}</Badge>
            {result.poMatch && <Badge tone="info">PO: {result.poMatch.number}</Badge>}
          </div>
        </Card>
      )}
    </div>
  );
}
