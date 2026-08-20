import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/Button';
import ModuleDashboard from './ModuleDashboard';

const MODULES = [
  { key: 'sales', label: 'Sales', icon: '💼' },
  { key: 'finance', label: 'Finance', icon: '💰' },
  { key: 'procurement', label: 'Procurement', icon: '🛒' },
  { key: 'inventory', label: 'Inventory', icon: '📦' },
  { key: 'crm', label: 'CRM', icon: '🤝' },
  { key: 'hrms', label: 'HRMS', icon: '👥' },
];

export default function ModuleDashboardSlider() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const module = MODULES[activeIndex].key;

  function next() {
    setActiveIndex((i) => (i + 1) % MODULES.length);
  }

  function prev() {
    setActiveIndex((i) => (i - 1 + MODULES.length) % MODULES.length);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Command Center</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={prev}>← Prev</Button>
          <span className="text-sm font-medium text-ink-muted">
            {MODULES[activeIndex].icon} {MODULES[activeIndex].label}
          </span>
          <Button variant="secondary" size="sm" onClick={next}>Next →</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {MODULES.map((m, idx) => (
          <button
            key={m.key}
            onClick={() => setActiveIndex(idx)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              idx === activeIndex
                ? 'bg-primary text-white'
                : 'bg-canvas text-ink-muted hover:text-ink'
            )}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <ModuleDashboard module={module} />
    </div>
  );
}
