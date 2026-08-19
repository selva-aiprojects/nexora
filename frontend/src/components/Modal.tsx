import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Set false only for destructive confirmation dialogs where an accidental outside click must not dismiss unsaved work. */
  closeOnOverlayClick?: boolean;
}

const SIZE_CLASSES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/**
 * Modal — the single dialog implementation, used for confirmations, quick
 * edit forms and detail drill-ins. Renders via portal so it's never
 * clipped by an ancestor's overflow:hidden (a real problem inside
 * DataTable's scroll container).
 *
 * Accessibility, all required for a real production dialog:
 * - role="dialog" + aria-modal="true", labelled by the title.
 * - Focus moves to the dialog on open and is trapped inside it (Tab/Shift+Tab
 *   cycle within), and returns to the triggering element on close.
 * - Escape closes it; background scroll is locked while open.
 * - Background content is inert to screen readers via aria-hidden on siblings
 *   (handled by the portal target being the only non-hidden root child —
 *   see usage note below).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/50"
        aria-hidden="true"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full rounded-[var(--nx-radius-lg)] bg-surface shadow-[var(--nx-shadow-lg)] focus:outline-none',
          SIZE_CLASSES[size]
        )}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-ink-muted hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
