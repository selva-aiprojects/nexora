import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded p-2 text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`${theme === 'light' ? 'Dark' : 'Light'} mode`}
    >
      {theme === 'light' ? (
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M17.293 13.293A7 7 0 016.707 2.707a7.001 7.001 0 1010.586 10.586z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
