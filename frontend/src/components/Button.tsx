import * as React from 'react';
import { cn } from '../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button, keeping its width stable. */
  isLoading?: boolean;
  /** Text announced to screen readers while isLoading is true. Defaults to "Loading". */
  loadingLabel?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:bg-primary/40',
  secondary:
    'bg-surface text-ink border border-border-strong hover:bg-canvas active:bg-canvas disabled:text-ink-muted/50',
  ghost:
    'bg-transparent text-ink hover:bg-canvas active:bg-border/60 disabled:text-ink-muted/50',
  danger:
    'bg-danger text-white hover:bg-danger/90 active:bg-danger/90 disabled:bg-danger/40',
  // Reserved for AI-initiated actions ("Apply suggestion", "Ask Copilot") —
  // keeps the accent color meaningful instead of decorative.
  ai: 'bg-accent text-white hover:bg-accent/90 active:bg-accent/90 disabled:bg-accent/40',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Button — the single click-target primitive for the whole app.
 *
 * Every other interactive control (IconButton, menu triggers, table row
 * actions) should compose this rather than styling a raw <button>, so
 * focus rings, disabled states and loading behavior stay consistent.
 *
 * Accessibility:
 * - Native <button> under the hood, so it's keyboard-operable and
 *   announced correctly by default — don't replace with a styled <div>.
 * - isLoading sets aria-busy and swaps the visible label for an
 *   sr-only announcement so screen reader users hear "Saving" not silence.
 * - Focus-visible ring meets WCAG 2.4.7; never remove it, only restyle.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingLabel = 'Loading',
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={props.type ?? 'button'}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--nx-radius-sm)] font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner className="h-4 w-4" />
            <span className="sr-only">{loadingLabel}</span>
            <span aria-hidden="true">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
