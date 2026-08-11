import React from 'react';
import { PageHeader } from './PageHeader';

/**
 * Placeholder for the role dashboards. Widgets land in the later sub-projects;
 * this keeps the shell honest about what is and isn't built yet.
 */
export function ComingSoon({ title, whatsNext }: { title: string; whatsNext: string[] }) {
  return (
    <>
      <PageHeader title={title} description="Your workspace is ready. Widgets arrive in a later release." />
      <div className="rounded-xl border border-dashed border-line bg-surface/50 p-10">
        <p className="text-sm font-medium text-ink">Coming to this dashboard</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {whatsNext.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-active/50" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
