import * as React from 'react';
import { cn } from '../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Skeleton — base shimmer block. Compose into shapes (SkeletonText,
 * SkeletonTableRows) rather than reaching for raw <div className="animate-pulse">
 * inline, so every loading state in the app shares one timing/opacity curve.
 *
 * Respects prefers-reduced-motion: the pulse animation is disabled via the
 * `motion-reduce:animate-none` utility, falling back to a static block.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse motion-reduce:animate-none rounded bg-canvas', className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
