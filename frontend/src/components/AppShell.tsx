import * as React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export interface NavItem {
  label: string;
  to: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface AppShellProps {
  sections: NavSection[];
  topBar: React.ReactNode;
  children: React.ReactNode;
  /** Rendered above the nav sections — tenant/company switcher. */
  header?: React.ReactNode;
}

function SectionHeader({ title, expanded, onToggle }: { title: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted',
        'hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
      aria-expanded={expanded}
    >
      <span>{title}</span>
      <svg
        viewBox="0 0 20 20"
        className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : '')}
        fill="none"
        aria-hidden="true"
      >
        <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function AppShell({ sections, topBar, children, header }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<number>>(() => {
    const initial = new Set<number>();
    sections.forEach((section, i) => {
      if (section.items.some((item) => item.active)) {
        initial.add(i);
      }
    });
    return initial;
  });

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Mobile off-canvas nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/50"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10 h-full w-72 bg-surface">
            <SidebarContent sections={sections} header={header} expandedSections={expandedSections} toggleSection={toggleSection} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        aria-label="Primary navigation"
        className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block"
      >
        <SidebarContent sections={sections} header={header} expandedSections={expandedSections} toggleSection={toggleSection} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:px-6">
          <button
            type="button"
            className="rounded p-2 text-ink-muted hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
            aria-expanded={mobileNavOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">{topBar}</div>
        </div>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ sections, header, expandedSections, toggleSection }: { sections: NavSection[]; header?: React.ReactNode; expandedSections: Set<number>; toggleSection: (index: number) => void }) {
  return (
    <div className="flex h-full flex-col">
      {header && <div className="border-b border-border p-4">{header}</div>}
      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {sections.map((section, i) => {
          const expanded = expandedSections.has(i);
          return (
            <div key={i}>
              {section.title ? (
                <SectionHeader title={section.title} expanded={expanded} onToggle={() => toggleSection(i)} />
              ) : (
                <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{section.title}</h3>
              )}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <ul className="space-y-0.5 pt-1">
                  {section.items.map((item, idx) => (
                    <li key={`${item.label}-${idx}`}>
                      <Link
                        to={item.to}
                        aria-current={item.active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-[var(--nx-radius-sm)] px-3 py-2 text-sm font-medium',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          item.active
                            ? 'bg-primary-subtle text-primary'
                            : 'text-ink-muted hover:bg-canvas hover:text-ink'
                        )}
                      >
                        {item.icon && <span aria-hidden="true">{item.icon}</span>}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
