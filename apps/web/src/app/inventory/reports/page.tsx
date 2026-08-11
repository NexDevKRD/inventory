'use client';
import { useApiQuery } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, BarList } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ReportsPage() {
  const reportsQuery = useApiQuery<any>(['dashboard', 'reports'], '/dashboard/reports');
  const data = reportsQuery.data;

  if (reportsQuery.isLoading) {
    return (
      <>
        <PageHeader title="Reports" description="How stock and demand are distributed." />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </>
    );
  }

  if (reportsQuery.isError) {
    return (
      <>
        <PageHeader title="Reports" />
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState tone="danger" title="Couldn't load reports" description="Please try again." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Reports" description="How stock and demand are distributed." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Stock by warehouse" description="Units on hand">
          <BarList rows={data?.stockByWarehouse ?? []} unit="units" />
        </Card>
        <Card title="Products by category" description="Catalogue breakdown">
          <BarList rows={data?.productsByCategory ?? []} />
        </Card>
        <Card title="Requests by status" description="All time">
          <BarList rows={data?.requestsByStatus ?? []} />
        </Card>
        <Card title="Most moved products" description="By total movement volume">
          <BarList rows={data?.topMovedProducts ?? []} unit="units" />
        </Card>
      </div>
    </>
  );
}
