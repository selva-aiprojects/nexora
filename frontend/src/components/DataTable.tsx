import * as React from 'react';
import { cn } from '../lib/utils';
import { SkeletonTableRows } from './Skeleton';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: string;
  /** Render the cell. Falls back to `row[key]` (stringified) when omitted. */
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Right-align — use for currency/quantity columns. */
  align?: 'left' | 'right' | 'center';
  /** Hide below this breakpoint to keep the table usable on mobile instead of forcing horizontal scroll for everything. */
  hideBelow?: 'sm' | 'md' | 'lg';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Stable unique key per row — required, never falls back to array index (which breaks state across sorts/filters). */
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  /** Row selection for bulk actions (approve, export, delete). */
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  caption: string;
  /** Limit visible columns by key. When omitted, all columns render. */
  visibleColumns?: Set<string>;
  className?: string;
}

/**
 * DataTable — the single table implementation for every list screen in
 * the ERP (invoices, vendors, employees, stock, journal entries...).
 * Modules pass columns + data; the table owns sort UI, loading rows,
 * empty/error states, selection and pagination so none of that is
 * reimplemented per module.
 *
 * Accessibility:
 * - Real <table>/<th scope="col">, so screen readers announce row/column
 *   position — never a div-grid pretending to be a table.
 * - Sortable headers are real <button>s with aria-sort on the parent <th>.
 * - Row selection checkboxes have visible labels (sr-only "Select {row}").
 * - Loading state sets aria-busy on the table and keeps column headers
 *   visible so context isn't lost while skeleton rows render.
 *
 * State ownership: sort/pagination/selection are controlled from outside
 * (sortKey/onSortChange, pagination.page/onPageChange, selectedIds/
 * onSelectionChange) rather than internal state, because in a real ERP
 * screen sort and page usually need to survive a URL/query-param sync and
 * drive a server request — baking them in as internal state would force
 * a rewrite the first time a table needs server-side sorting.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  error,
  onRetry,
  emptyTitle = 'No records yet',
  emptyDescription = 'Once records are added, they will show up here.',
  emptyAction,
  sortKey,
  sortDirection = 'asc',
  onSortChange,
  onRowClick,
  selectedIds,
  onSelectionChange,
  pagination,
  caption,
  visibleColumns,
  className,
}: DataTableProps<T>) {
  const selectable = !!onSelectionChange;
  const visible = React.useMemo(
    () => (visibleColumns ? columns.filter((c) => visibleColumns.has(c.key)) : columns),
    [columns, visibleColumns]
  );
  const allIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);
  const allSelected = selectable && allIds.length > 0 && allIds.every((id) => selectedIds?.has(id));
  const someSelected = selectable && allIds.some((id) => selectedIds?.has(id)) && !allSelected;

  function toggleAll() {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(allIds));
  }

  function toggleRow(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(next);
  }

  function handleSort(col: Column<T>) {
    if (!col.sortable || !onSortChange) return;
    const nextDir = sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(col.key, nextDir);
  }

  const showEmpty = !isLoading && !error && data.length === 0;

  return (
    <div className={cn('overflow-hidden rounded-[var(--nx-radius-md)] border border-border bg-surface', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-busy={isLoading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border bg-canvas/60">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => el && (el.indeterminate = someSelected)}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-border-strong text-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </th>
              )}
              {visible.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                    style={{ width: col.width }}
                    className={cn(
                      'px-4 py-3 font-medium text-ink-muted',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.hideBelow === 'sm' && 'hidden sm:table-cell',
                      col.hideBelow === 'md' && 'hidden md:table-cell',
                      col.hideBelow === 'lg' && 'hidden lg:table-cell'
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {col.header}
                        <SortIcon direction={isSorted ? sortDirection : undefined} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {isLoading ? (
            <SkeletonTableRows rows={pagination?.pageSize ?? 6} columns={visible.length + (selectable ? 1 : 0)} />
          ) : (
            <tbody>
              {data.map((row) => {
                const id = getRowId(row);
                const selected = selectedIds?.has(id);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-canvas/60',
                      selected && 'bg-primary-subtle'
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleRow(id)}
                          aria-label={`Select row ${id}`}
                          className="h-4 w-4 rounded border-border-strong text-primary focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </td>
                    )}
                    {visible.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-ink',
                          col.align === 'right' && 'text-right tabular-nums',
                          col.align === 'center' && 'text-center',
                          col.hideBelow === 'sm' && 'hidden sm:table-cell',
                          col.hideBelow === 'md' && 'hidden md:table-cell',
                          col.hideBelow === 'lg' && 'hidden lg:table-cell'
                        )}
                      >
                        {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {showEmpty && (
        <EmptyState
          className="border-0"
          variant="no-results"
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}

      {!isLoading && error && (
        <EmptyState
          className="border-0"
          variant="error"
          title="Couldn't load this data"
          description={error ?? undefined}
          action={onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
        />
      )}

      {pagination && !isLoading && !error && data.length > 0 && (
        <TablePagination {...pagination} />
      )}
    </div>
  );
}

function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden="true">
      <path
        d="M6 2l3 4H3l3-4z"
        fill={direction === 'asc' ? 'currentColor' : 'currentColor'}
        opacity={direction === 'asc' ? 1 : 0.3}
      />
      <path
        d="M6 10l-3-4h6l-3 4z"
        fill="currentColor"
        opacity={direction === 'desc' ? 1 : 0.3}
      />
    </svg>
  );
}

function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-ink-muted">
      <span aria-live="polite">
        Showing {start}–{end} of {total}
      </span>
      <nav aria-label="Table pagination" className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span aria-hidden="true" className="tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </nav>
    </div>
  );
}
