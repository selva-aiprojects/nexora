import * as React from 'react';
import { cn } from '../lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'ai';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Small leading dot — useful for state at a glance in dense tables. */
  withDot?: boolean;
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-canvas text-ink-muted border-border-strong',
  success: 'bg-success-subtle text-success border-transparent',
  warning: 'bg-warning-subtle text-warning border-transparent',
  danger: 'bg-danger-subtle text-danger border-transparent',
  info: 'bg-info-subtle text-info border-transparent',
  ai: 'bg-accent-subtle text-accent border-transparent',
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: 'bg-ink-muted',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  ai: 'bg-accent',
};

/**
 * Badge — compact status label for table rows, cards and headers.
 *
 * Domain mapping (so tone stays meaningful, not decorative):
 *   success -> Approved, Posted, Filed, Reconciled, Paid
 *   warning -> Pending, Due Soon, Draft awaiting approval
 *   danger  -> Rejected, Overdue, Failed, Blocked
 *   info    -> Submitted, In Review, Scheduled
 *   ai      -> AI-suggested / AI-flagged (anomaly, auto-matched) — always
 *              pair with the word "AI" or an icon so it isn't mistaken for
 *              a plain status
 *   neutral -> Draft, Inactive, N/A
 *
 * Color is never the only signal: label text always states the status in
 * words, satisfying WCAG 1.4.1 (use of color) for color-blind users.
 */
export function Badge({ tone = 'neutral', withDot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {withDot && (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full', DOT_CLASSES[tone])}
        />
      )}
      {children}
    </span>
  );
}
