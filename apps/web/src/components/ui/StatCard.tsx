import React from 'react';
import { Skeleton } from './Skeleton';

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  loading = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'neutral' | 'active' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}) {
  const accent = {
    neutral: 'text-ink',
    active: 'text-active',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }[tone];

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${accent}`}>{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
