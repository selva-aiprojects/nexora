import * as React from 'react';
import { api } from '@/lib/api';
import { Button, Badge, Card, StatCard, FormField, Modal, useToast } from '@/components';
import { TextField } from '@/components';
import { formatINR } from '@/lib/utils';

interface TaxScheme {
  id: string;
  code: string;
  name: string;
  country: string;
  type: string;
  description: string;
  isDefault: boolean;
  active: boolean;
  components: { name: string; rate: number; applicableTo: string; description: string }[];
  effectiveRate: number;
}

const TYPE_COLORS: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  GST: 'success', VAT: 'info', SALES_TAX: 'warning', EXEMPT: 'danger', CUSTOM: 'info',
};

export default function TaxConfigPage() {
  const { notify } = useToast();
  const [schemes, setSchemes] = React.useState<TaxScheme[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [calcModalOpen, setCalcModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [calcAmount, setCalcAmount] = React.useState('');
  const [calcSchemeId, setCalcSchemeId] = React.useState('');
  const [calcResult, setCalcResult] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    country: '',
    type: 'VAT',
    description: '',
    components: [{ name: '', rate: '', applicableTo: 'all', description: '' }],
  });

  const loadSchemes = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTaxSchemes();
      setSchemes(res.rows || res);
    } catch (err: any) {
      notify({ title: 'Failed to load tax schemes', description: err.message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  React.useEffect(() => { loadSchemes(); }, [loadSchemes]);

  const handleToggleActive = async (scheme: TaxScheme) => {
    try {
      await api.toggleTaxScheme(scheme.id);
      notify({ title: 'Updated', description: `${scheme.name} ${scheme.active ? 'deactivated' : 'activated'}.`, tone: 'success' });
      loadSchemes();
    } catch (err: any) {
      notify({ title: 'Failed to toggle', description: err.message, tone: 'danger' });
    }
  };

  const handleCalculate = async () => {
    if (!calcAmount || !calcSchemeId) {
      notify({ title: 'Select scheme and enter amount', tone: 'warning' });
      return;
    }
    try {
      const res = await api.calculateTax({ amount: Number(calcAmount), schemeId: calcSchemeId });
      setCalcResult(res);
    } catch (err: any) {
      notify({ title: 'Calculation failed', description: err.message, tone: 'danger' });
    }
  };

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.country) {
      notify({ title: 'Name and Country are required', tone: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const comps = formData.components.filter(c => c.name && c.rate);
      await api.createTaxScheme({
        ...formData,
        components: comps.map(c => ({ ...c, rate: Number(c.rate) })),
      });
      notify({ title: 'Tax scheme created', tone: 'success' });
      setCreateModalOpen(false);
      loadSchemes();
    } catch (err: any) {
      notify({ title: 'Failed to create scheme', description: err.message, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const addComponent = () => {
    setFormData(f => ({
      ...f,
      components: [...f.components, { name: '', rate: '', applicableTo: 'all', description: '' }],
    }));
  };

  const updateComponent = (index: number, field: string, value: string) => {
    setFormData(f => ({
      ...f,
      components: f.components.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const activeCount = schemes.filter(s => s.active).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Tax Configuration</h1>
          <p className="text-sm text-ink-muted">
            Configure multi-jurisdiction tax schemes — Indian GST, GCC VAT, UK VAT, US Sales Tax & more.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => setCalcModalOpen(true)}>
            🧮 Tax Calculator
          </Button>
          <Button variant="primary" size="md" onClick={() => setCreateModalOpen(true)}>
            + New Tax Scheme
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Schemes" value={String(schemes.length)} delta="Configured globally" trend="flat" isLoading={loading} />
        <StatCard label="Active Schemes" value={String(activeCount)} delta="Applied to transactions" trend="up" isLoading={loading} />
        <StatCard label="Jurisdictions" value={String(new Set(schemes.map(s => s.country)).size)} delta="Countries / Regions covered" trend="flat" isLoading={loading} />
      </div>

      {/* Scheme Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="p-5 animate-pulse space-y-3">
              <div className="h-4 w-48 rounded bg-surface-raised" />
              <div className="h-3 w-full rounded bg-surface-raised" />
              <div className="h-3 w-32 rounded bg-surface-raised" />
            </Card>
          ))
        ) : schemes.map((scheme) => (
          <Card key={scheme.id} className={`p-5 transition-all ${!scheme.active ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="font-semibold text-ink">{scheme.name}</div>
                <div className="text-xs text-ink-muted mt-0.5">🌍 {scheme.country}</div>
              </div>
              <Badge tone={TYPE_COLORS[scheme.type] || 'info'}>{scheme.type}</Badge>
            </div>

            <p className="text-xs text-ink-muted mb-3">{scheme.description}</p>

            <div className="space-y-1.5 mb-4">
              {scheme.components.map((comp, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-ink">{comp.name}</span>
                  <span className="font-bold text-primary">{comp.rate}%</span>
                </div>
              ))}
              {scheme.components.length > 1 && (
                <div className="flex items-center justify-between text-xs border-t border-border-strong pt-1.5 mt-1.5">
                  <span className="font-semibold text-ink">Effective Rate</span>
                  <span className="font-bold text-success">{scheme.effectiveRate}%</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={scheme.active ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => handleToggleActive(scheme)}
              >
                {scheme.active ? 'Deactivate' : 'Activate'}
              </Button>
              {scheme.isDefault && (
                <span className="text-[11px] text-ink-muted font-medium">• System Default</span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Tax Calculator Modal */}
      <Modal open={calcModalOpen} onClose={() => { setCalcModalOpen(false); setCalcResult(null); }} title="Interactive Tax Calculator" size="md">
        <div className="space-y-4">
          <FormField label="Base Amount" htmlFor="calc-amount">
            <TextField
              type="number"
              placeholder="Enter amount (e.g. 100000)"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
            />
          </FormField>
          <FormField label="Tax Scheme" htmlFor="calc-scheme">
            <select
              className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              value={calcSchemeId}
              onChange={(e) => { setCalcSchemeId(e.target.value); setCalcResult(null); }}
            >
              <option value="">Select a tax scheme…</option>
              {schemes.filter(s => s.active).map(s => (
                <option key={s.id} value={s.id}>{s.name} (Effective: {s.effectiveRate}%)</option>
              ))}
            </select>
          </FormField>
          <Button variant="primary" onClick={handleCalculate} className="w-full">
            Calculate Tax
          </Button>

          {calcResult && (
            <div className="rounded-lg border border-border-strong bg-surface p-4 space-y-3 mt-2">
              <div className="font-semibold text-ink text-sm">{calcResult.scheme.name} Breakdown</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-ink-muted">
                  <span>Base Amount</span>
                  <span className="font-medium text-ink">{formatINR(calcResult.baseAmount)}</span>
                </div>
                {calcResult.breakdown.map((b: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-ink-muted">{b.name} ({b.rate}%)</span>
                    <span className="text-warning font-medium">+ {formatINR(b.taxAmount)}</span>
                  </div>
                ))}
                <div className="border-t border-border-strong pt-2 flex justify-between text-sm font-bold">
                  <span>Total Tax</span>
                  <span className="text-danger">{formatINR(calcResult.totalTax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Total with Tax</span>
                  <span className="text-success">{formatINR(calcResult.totalWithTax)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Scheme Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Custom Tax Scheme" size="lg">
        <form onSubmit={handleCreateScheme} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheme Name" htmlFor="ts-name" required>
              <TextField placeholder="e.g. Malaysia SST 6%" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required />
            </FormField>
            <FormField label="Country / Region" htmlFor="ts-country" required>
              <TextField placeholder="e.g. Malaysia" value={formData.country} onChange={e => setFormData(f => ({ ...f, country: e.target.value }))} required />
            </FormField>
            <FormField label="Tax Type" htmlFor="ts-type">
              <select className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary" value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}>
                <option value="VAT">VAT</option>
                <option value="GST">GST</option>
                <option value="SALES_TAX">Sales Tax</option>
                <option value="EXEMPT">Exempt</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </FormField>
            <FormField label="Description" htmlFor="ts-desc">
              <TextField placeholder="Optional description" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
            </FormField>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Tax Components</span>
              <Button type="button" variant="ghost" size="sm" onClick={addComponent}>+ Add Component</Button>
            </div>
            <div className="space-y-2">
              {formData.components.map((comp, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <TextField placeholder="Name (e.g. VAT)" value={comp.name} onChange={e => updateComponent(i, 'name', e.target.value)} />
                  <TextField type="number" placeholder="Rate %" value={comp.rate} onChange={e => updateComponent(i, 'rate', e.target.value)} />
                  <TextField placeholder="Applies to (e.g. all)" value={comp.applicableTo} onChange={e => updateComponent(i, 'applicableTo', e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border-strong pt-4">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={saving}>Create Scheme</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
