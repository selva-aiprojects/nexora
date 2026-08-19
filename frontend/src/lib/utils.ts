import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class lists safely — later classes win over earlier
 * conflicting ones instead of both being emitted (e.g. "p-2 p-4" -> "p-4").
 * Every component in this library accepts a `className` prop and should
 * pass it through `cn(...)` last so consumers can always override.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupees using the en-IN locale grouping
 * (lakh/crore separators: 12,34,567) rather than the western 1,234,567.
 * Used by DataTable numeric columns, StatCard, and anywhere money appears.
 */
export function formatINR(value: number, opts: { compact?: boolean } = {}) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: opts.compact ? 1 : 2,
    notation: opts.compact ? 'compact' : 'standard',
  }).format(value);
}

/** Format a date the way finance/compliance screens expect: 12 Aug 2026. */
export function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Stable id generator for associating labels, errors and hints via aria-describedby. */
let idCounter = 0;
export function useId(prefix = 'nx') {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
