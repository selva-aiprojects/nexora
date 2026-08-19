import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';

type ToastTone = 'success' | 'danger' | 'info' | 'warning';

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'border-l-success',
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-info',
};

/**
 * ToastProvider — mount once near the app root. Exposes `useToast().notify(...)`
 * to any descendant so a save handler three components deep can surface
 * feedback without prop-drilling a callback.
 *
 * Accessibility: the container is a single aria-live="polite" region so
 * screen readers announce new toasts without interrupting current speech
 * (assertive would be jarring for routine "Saved" confirmations — reserve
 * that for truly urgent alerts, which this system intentionally doesn't
 * cover; use an inline alert for those instead).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const notify = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'flex items-start justify-between gap-3 rounded-[var(--nx-radius-md)] border-l-4 bg-surface px-4 py-3 shadow-[var(--nx-shadow-md)]',
                TONE_CLASSES[t.tone]
              )}
            >
              <div>
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-ink-muted">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
