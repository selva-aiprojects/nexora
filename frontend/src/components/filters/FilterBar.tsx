import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../Button';
import { TextField } from '../Input';

export interface FilterState {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  status?: string;
}

export interface FilterBarProps {
  title?: string;
  searchPlaceholder?: string;
  showDateRange?: boolean;
  showAmountRange?: boolean;
  showStatus?: boolean;
  statusOptions?: { value: string; label: string }[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
  extraActions?: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = 'nx_saved_filters';

export function FilterBar({
  title,
  searchPlaceholder = 'Search...',
  showDateRange = false,
  showAmountRange = false,
  showStatus = false,
  statusOptions = [],
  filters,
  onFiltersChange,
  onReset,
  extraActions,
  className,
}: FilterBarProps) {
  const [savedName, setSavedName] = React.useState('');
  const [savedList, setSavedList] = React.useState<{ name: string; filters: FilterState }[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedList(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function update(patch: Partial<FilterState>) {
    onFiltersChange({ ...filters, ...patch });
  }

  function reset() {
    onFiltersChange({});
    onReset();
  }

  function savePreset() {
    if (!savedName.trim()) return;
    const next = [...savedList, { name: savedName.trim(), filters }];
    setSavedList(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedName('');
  }

  function loadPreset(name: string) {
    const preset = savedList.find((p) => p.name === name);
    if (preset) onFiltersChange(preset.filters);
  }

  function deletePreset(name: string) {
    const next = savedList.filter((p) => p.name !== name);
    setSavedList(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (filters && next.find((p) => p.name === name)) {
      onFiltersChange({});
    }
  }

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== 0);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            placeholder={searchPlaceholder}
            value={filters.search ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ search: e.target.value || undefined })}
            leftAddon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-muted">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            }
          />
        </div>

        {showDateRange && (
          <div className="flex items-center gap-2">
            <TextField type="date" className="!py-1.5" value={filters.dateFrom ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ dateFrom: e.target.value || undefined })} />
            <span className="text-ink-muted">–</span>
            <TextField type="date" className="!py-1.5" value={filters.dateTo ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ dateTo: e.target.value || undefined })} />
          </div>
        )}

        {showAmountRange && (
          <div className="flex items-center gap-2">
            <TextField type="number" placeholder="Min" className="!py-1.5 w-28" value={filters.amountMin ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ amountMin: e.target.value ? Number(e.target.value) : undefined })} />
            <span className="text-ink-muted">–</span>
            <TextField type="number" placeholder="Max" className="!py-1.5 w-28" value={filters.amountMax ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update({ amountMax: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        )}

        {showStatus && statusOptions.length > 0 && (
          <select
            value={filters.status ?? ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update({ status: e.target.value || undefined })}
            className="h-10 rounded-[var(--nx-radius-sm)] border border-border-strong bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
          )}
          {extraActions}
        </div>
      </div>

      {savedList.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Saved filters:</span>
          {savedList.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.name)}
              className={cn(
                'rounded-full border px-2.5 py-1 transition-colors',
                filters === preset.filters
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border hover:border-primary/50 hover:text-primary'
              )}
            >
              {preset.name}
              <button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); deletePreset(preset.name); }}
                className="ml-1 text-ink-muted hover:text-danger"
                aria-label={`Delete ${preset.name}`}
              >
                ✕
              </button>
            </button>
          ))}
        </div>
      )}

      {title && savedList.length === 0 && (
        <div className="flex items-center gap-2">
          <TextField
            placeholder="Save current filters..."
            value={savedName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSavedName(e.target.value)}
            className="!py-1.5 text-xs"
          />
          <Button variant="secondary" size="sm" onClick={savePreset} disabled={!savedName.trim()}>Save</Button>
        </div>
      )}
    </div>
  );
}
