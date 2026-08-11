'use client';
import { useApiQuery, money, dateOnly } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useState } from 'react';

// Invoicing proper is a later sub-project; received orders are the billable
// record that exists today, so that is what this lists.
export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const ordersQuery = useApiQuery<any>(['purchase-orders', 'received'], '/purchase-orders', {
    page,
    pageSize: 20,
    status: 'RECEIVED',
  });

  return (
    <>
      <PageHeader title="Invoices" description="Fulfilled orders ready to be billed." />
      <DataTable
        columns={[
          { key: 'reference', header: 'Order', render: (r: any) => <code className="text-xs text-ink">{r.reference}</code> },
          { key: 'warehouse', header: 'Delivered to', render: (r: any) => r.warehouse.name },
          { key: 'receivedAt', header: 'Received', render: (r: any) => dateOnly(r.receivedAt) },
          { key: 'total', header: 'Amount', render: (r: any) => <span className="tabular-nums">{money(r.total)}</span> },
          { key: 'status', header: 'Status', render: () => <StatusBadge status="COMPLETED" label="Billable" /> },
        ]}
        rows={ordersQuery.data?.items ?? []}
        page={page}
        pageSize={20}
        total={ordersQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        onRetry={() => ordersQuery.refetch()}
        emptyTitle="No billable orders"
        emptyDescription="Orders appear here once the warehouse marks them received."
      />
    </>
  );
}
