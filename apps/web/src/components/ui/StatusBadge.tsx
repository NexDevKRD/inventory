import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success ring-success/20',
  COMPLETED: 'bg-success/10 text-success ring-success/20',
  DELIVERED: 'bg-success/10 text-success ring-success/20',
  INACTIVE: 'bg-raised text-muted ring-line',
  LOCKED: 'bg-warning/10 text-warning ring-warning/20',
  PENDING: 'bg-warning/10 text-warning ring-warning/20',
  REJECTED: 'bg-danger/10 text-danger ring-danger/20',
  EXPIRED: 'bg-danger/10 text-danger ring-danger/20',
  OUT_OF_STOCK: 'bg-danger/10 text-danger ring-danger/20',
  SUBMITTED: 'bg-active/10 text-active ring-active/20',
  APPROVED: 'bg-active/10 text-active ring-active/20',
};

// OUT_OF_STOCK -> "Out of stock"; enum names should never reach the user raw.
const humanize = (status: string) =>
  status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-raised text-muted ring-line';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label ?? humanize(status)}
    </span>
  );
}
