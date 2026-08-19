import * as React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({ title, subtitle, description, actions, badge }: PageHeaderProps) {
  const sub = description ?? subtitle;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {sub && (
          <p className="mt-1 text-sm text-ink-muted">{sub}</p>
        )}
      </div>
      {(actions || badge) && (
        <div className="flex items-center gap-3">
          {badge}
          {actions}
        </div>
      )}
    </div>
  );
}
