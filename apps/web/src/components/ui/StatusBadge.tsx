import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success', COMPLETED: 'bg-success/10 text-success', DELIVERED: 'bg-success/10 text-success',
  INACTIVE: 'bg-gray-200 text-gray-600', LOCKED: 'bg-warning/10 text-warning', PENDING: 'bg-warning/10 text-warning',
  REJECTED: 'bg-danger/10 text-danger', EXPIRED: 'bg-danger/10 text-danger', OUT_OF_STOCK: 'bg-danger/10 text-danger',
  SUBMITTED: 'bg-active/10 text-active', APPROVED: 'bg-active/10 text-active',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{status}</span>;
}
