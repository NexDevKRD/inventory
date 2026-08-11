import React from 'react';
import { InboxIcon } from './icons';

export function EmptyState({
  title = 'No results',
  description,
  icon,
  action,
  tone = 'neutral',
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-raised text-faint'
        }`}
      >
        {icon ?? <InboxIcon className="h-6 w-6" />}
      </span>
      <div className="space-y-1">
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
