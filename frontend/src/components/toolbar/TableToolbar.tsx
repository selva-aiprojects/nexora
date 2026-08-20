import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../Button';
import { FilterBar, type FilterState } from '../filters/FilterBar';
import { exportTableToCSV, exportTableToExcel } from '../../lib/export';

export interface TableToolbarProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: { key: string; header: string }[];
  filename?: string;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  onReset?: () => void;
  showFilterBar?: boolean;
  filterProps?: {
    searchPlaceholder?: string;
    showDateRange?: boolean;
    showAmountRange?: boolean;
    showStatus?: boolean;
    statusOptions?: { value: string; label: string }[];
  };
  selectedIds?: Set<string>;
  onSelectionClear?: () => void;
  bulkActions?: {
    label: string;
    tone?: 'primary' | 'secondary' | 'danger';
    onClick: () => void;
  }[];
  extraActions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function TableToolbar<T>({
  title,
  subtitle,
  data,
  columns,
  filename = 'export',
  filters,
  onFiltersChange,
  onReset,
  showFilterBar = false,
  filterProps,
  selectedIds,
  onSelectionClear,
  bulkActions = [],
  extraActions,
  className,
  children,
}: TableToolbarProps<T>) {
  const selectedCount = selectedIds?.size ?? 0;

  function handleExportCSV() {
    exportTableToCSV(columns, data, filename);
  }

  function handleExportExcel() {
    exportTableToExcel(columns, data, filename);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>CSV</Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>Excel</Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
        </div>
      </div>

      {showFilterBar && onFiltersChange && (
        <FilterBar
          {...filterProps}
          filters={filters ?? {}}
          onFiltersChange={onFiltersChange}
          onReset={onReset ?? (() => {})}
        />
      )}

      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded bg-primary-subtle px-4 py-2">
          <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.tone === 'danger' ? 'danger' : action.tone === 'secondary' ? 'secondary' : 'primary'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={onSelectionClear}>Clear</Button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
