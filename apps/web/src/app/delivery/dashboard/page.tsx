'use client';
import Link from 'next/link';
import { useApiQuery } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function DeliveryDashboard() {
  const dashboardQuery = useApiQuery<any>(['dashboard', 'driver'], '/dashboard/driver');
  const data = dashboardQuery.data;
  const loading = dashboardQuery.isLoading;

  return (
    <>
      <PageHeader
        title="Delivery dashboard"
        description="What's on your run today."
        action={
          <Link href="/delivery/deliveries">
            <Button>View all deliveries</Button>
          </Link>
        }
      />

      <StatGrid>
        <StatCard label="Waiting to start" value={data?.counts.pending ?? 0} loading={loading} tone="warning" />
        <StatCard label="In transit" value={data?.counts.inTransit ?? 0} loading={loading} tone="active" />
        <StatCard label="Delivered today" value={data?.counts.deliveredToday ?? 0} loading={loading} tone="success" />
      </StatGrid>

      <Card title="Up next">
        {data?.next?.length ? (
          <ul className="divide-y divide-line">
            {data.next.map((d: any) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">
                    <code className="text-xs">{d.reference}</code> · from {d.request.warehouse.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    To {d.request.doctor.firstName} {d.request.doctor.lastName}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing assigned" description="New deliveries assigned to you will appear here." />
        )}
      </Card>
    </>
  );
}
