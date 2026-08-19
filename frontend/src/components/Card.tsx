import * as React from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/** Card — generic bordered surface. The base every other card composes. */
export function Card({ padding = 'md', className, children, ...props }: CardProps) {
  const PADDING = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-8' } as const;
  return (
    <div
      className={cn(
        'rounded-[var(--nx-radius-md)] border border-border bg-surface shadow-[var(--nx-shadow-sm)]',
        PADDING[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** e.g. "+4.2% vs last month". Sign determines color automatically unless trend is passed. */
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

/**
 * StatCard — the KPI tile used across every role dashboard (cash position,
 * open invoices, headcount, pending approvals...). One component instead
 * of every module hand-rolling its own tile keeps dashboards visually
 * consistent as new modules ship.
 */
export function StatCard({ label, value, delta, trend, icon, isLoading, className }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <div className="animate-pulse space-y-3">
          <div className="h-3.5 w-24 rounded bg-canvas" />
          <div className="h-7 w-32 rounded bg-canvas" />
          <div className="h-3 w-20 rounded bg-canvas" />
        </div>
      </Card>
    );
  }

  const trendClass =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-ink-muted';

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        {icon && (
          <span className="text-ink-muted" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">
        {value}
      </div>
      {delta && <div className={cn('mt-1 text-xs font-medium', trendClass)}>{delta}</div>}
    </Card>
  );
}

export interface InsightCardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * InsightCard — the visual container for anything the AI layer generated
 * (Copilot recommendation, anomaly flag, predictive cash-flow note). Uses
 * the reserved accent color exactly once, as a left border + tiny glyph,
 * so it reads as "the system noticed this" without shouting on every page.
 */
export function InsightCard({ title, children, action, className }: InsightCardProps) {
  return (
    <Card className={cn('border-l-4 border-l-accent', className)}>
      <div className="flex items-center gap-2">
        <AiGlyph className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-2 text-sm text-ink-muted">{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}

function AiGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 0l1.6 5.2L15 8l-5.4 1.6L8 15l-1.5-5.4L1 8l5.5-1.8L8 0z" />
    </svg>
  );
}
