import * as React from 'react';
import { cn } from '../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Use 'error' for failed-to-load states (network/server error), not just zero data. */
  variant?: 'default' | 'error' | 'no-results';
  className?: string;
}

/**
 * EmptyState — the single component for every "nothing to show" screen:
 * a new tenant with no invoices yet, a filtered table with no matches, or
 * a failed fetch. Distinguishing the three matters for what the user
 * should do next, so `variant` changes the framing, not just the icon.
 *
 * Copy convention (see frontend-design guidance): describe what happened
 * and what to do, in the interface's voice — never "Oops!" or an apology
 * for a normal empty state.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--nx-radius-md)] border border-dashed border-border-strong px-6 py-12 text-center',
        variant === 'error' && 'border-danger/30 bg-danger-subtle/40',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-3 flex h-12 w-12 items-center justify-center rounded-full',
            variant === 'error' ? 'bg-danger-subtle text-danger' : 'bg-canvas text-ink-muted'
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
