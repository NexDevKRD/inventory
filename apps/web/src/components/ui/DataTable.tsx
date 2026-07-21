'use client';
import React from 'react';
import { EmptyState } from './EmptyState';

interface Column<T> { key: keyof T; header: string; render?: (row: T) => React.ReactNode }
interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function DataTable<T extends Record<string, any>>({ columns, rows, page, pageSize, total, onPageChange }: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) return <EmptyState description="Try adjusting your filters." />;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-2 text-sm">{col.render ? col.render(row) : String(row[col.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Prev</button>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
