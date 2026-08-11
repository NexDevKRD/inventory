'use client';
import Link from 'next/link';
import { useApiQuery, money } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function SupplierDashboard() {
  const dashboardQuery = useApiQuery<any>(['dashboard', 'supplier'], '/dashboard/supplier', undefined, {
    retry: false,
  });
  const data = dashboardQuery.data;
  const loading = dashboardQuery.isLoading;

  if (dashboardQuery.isError) {
    return (
      <>
        <PageHeader title="Supplier dashboard" />
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            tone="danger"
            title="No supplier linked to this account"
            description="Ask an administrator to link your login to a supplier record."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Supplier dashboard"
        description="Orders raised against your company."
        action={
          <Link href="/supplier/purchase-orders">
            <Button>View orders</Button>
          </Link>
        }
      />

      <StatGrid>
        <StatCard label="Awaiting fulfilment" value={data?.counts.submitted ?? 0} loading={loading} tone="warning" />
        <StatCard label="Approved" value={data?.counts.approved ?? 0} loading={loading} tone="active" />
        <StatCard label="Received" value={data?.counts.received ?? 0} loading={loading} tone="success" />
      </StatGrid>

      <Card title="Recent orders">
        {data?.recent?.length ? (
          <ul className="divide-y divide-line">
            {data.recent.map((po: any) => (
              <li key={po.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">
                    <code className="text-xs">{po.reference}</code> · {po.warehouse.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {po.items.length} line(s) ·{' '}
                    {money(po.items.reduce((sum: number, i: any) => sum + i.quantity * Number(i.unitPrice), 0))}
                  </p>
                </div>
                <StatusBadge status={po.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No orders yet" description="Purchase orders sent to you will appear here." />
        )}
      </Card>
    </>
  );
}
