import * as React from 'react';
import { Button, Card, PageHeader, useToast } from '@/components';
import { api } from '@/lib/api';

export default function AICopilot() {
  const { notify } = useToast();
  const [query, setQuery] = React.useState('');
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.copilotAI(query.trim());
      setAnswer(res.answer);
      setData(res.data);
    } catch (err: any) {
      notify({ title: 'Error', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="AI Copilot" subtitle="Ask questions about your business data." />
      <Card>
        <form onSubmit={ask} className="flex gap-3">
          <textarea
            className="h-24 w-full rounded-[var(--nx-radius-sm)] border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder='Try "outstanding receivable", "overdue invoices", "below reorder level"...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" isLoading={loading}>Ask</Button>
        </form>
      </Card>
      {answer && (
        <Card>
          <p className="text-sm text-ink">{answer}</p>
          {data && (
            <pre className="mt-3 overflow-x-auto rounded bg-canvas p-3 text-xs text-ink-muted">{JSON.stringify(data, null, 2)}</pre>
          )}
        </Card>
      )}
    </div>
  );
}
