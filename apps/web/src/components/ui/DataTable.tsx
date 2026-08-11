'use client';
import React from 'react';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { Button } from './Button';
import { AlertIcon } from './icons';

interface Column<T> { key: keyof T; header: string; render?: (row: T) => React.ReactNode }
interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const shell = 'overflow-hidden rounded-xl border border-line bg-surface shadow-card';

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  isLoading = false,
  isError = false,
  onRetry,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Loading and error are checked before emptiness — an in-flight or failed query
  // is not the same as "no results", which is what the old version claimed.
  if (isLoading) {
    return (
      <div className={shell}>
        <TableChrome columns={columns}>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3">
                  <Skeleton className="h-4 w-full max-w-[12rem]" />
                </td>
              ))}
            </tr>
          ))}
        </TableChrome>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={shell}>
        <EmptyState
          icon={<AlertIcon className="h-6 w-6" />}
          tone="danger"
          title="Couldn't load this list"
          description="The request failed. Check your connection and try again."
          action={onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
        />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={shell}>
        <EmptyState title={emptyTitle} description={emptyDescription ?? 'Nothing to show here yet.'} />
      </div>
    );
  }

  return (
    <div className={shell}>
      <TableChrome columns={columns}>
        {rows.map((row, i) => (
          <tr key={i} className="transition-colors hover:bg-raised/60">
            {columns.map((col) => (
              <td key={String(col.key)} className="px-4 py-3 text-sm text-ink">
                {col.render ? col.render(row) : String(row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </TableChrome>
      <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-sm text-muted">
        <span>
          Page {page} of {totalPages}
          <span className="ltr:ml-2 rtl:mr-2 text-faint">({total} total)</span>
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function TableChrome<T>({ columns, children }: { columns: Column<T>[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-raised/60">
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted ltr:text-left rtl:text-right"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
