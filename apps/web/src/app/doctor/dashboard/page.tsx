'use client';
import Link from 'next/link';
import { useApiQuery } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCart } from '@/features/catalogue/CartContext';

export default function DoctorDashboard() {
  const dashboardQuery = useApiQuery<any>(['dashboard', 'doctor'], '/dashboard/doctor');
  const { count } = useCart();
  const data = dashboardQuery.data;
  const loading = dashboardQuery.isLoading;

  return (
    <>
      <PageHeader
        title="Doctor dashboard"
        description="Your requests at a glance."
        action={
          <Link href="/doctor/catalogue">
            <Button>Browse catalogue</Button>
          </Link>
        }
      />

      <StatGrid>
        <StatCard label="Pending" value={data?.counts.pending ?? 0} loading={loading} tone="warning" />
        <StatCard label="Approved" value={data?.counts.approved ?? 0} loading={loading} tone="active" />
        <StatCard label="Fulfilled" value={data?.counts.fulfilled ?? 0} loading={loading} tone="success" />
        <StatCard label="In your cart" value={count} hint="Not yet submitted" />
      </StatGrid>

      <Card
        title="Recent requests"
        action={
          <Link href="/doctor/requests">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        }
      >
        {data?.recent?.length ? (
          <ul className="divide-y divide-line">
            {data.recent.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">
                    <code className="text-xs">{r.reference}</code> · {r.warehouse.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {r.items.length} item(s) · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No requests yet"
            description="Add products to your cart and submit your first request."
            action={
              <Link href="/doctor/catalogue">
                <Button variant="secondary" size="sm">
                  Browse catalogue
                </Button>
              </Link>
            }
          />
        )}
      </Card>
    </>
  );
}
