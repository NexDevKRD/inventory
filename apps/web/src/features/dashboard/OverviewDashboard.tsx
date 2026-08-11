'use client';
import Link from 'next/link';
import { useApiQuery, dateOnly } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function OverviewDashboard({ title, basePath }: { title: string; basePath: string }) {
  const overviewQuery = useApiQuery<any>(['dashboard', 'overview'], '/dashboard/overview');
  const data = overviewQuery.data;
  const loading = overviewQuery.isLoading;

  return (
    <>
      <PageHeader title={title} description="Live picture of stock, requests, and orders." />

      <StatGrid>
        <StatCard label="Products" value={data?.counts.products ?? 0} loading={loading} />
        <StatCard
          label="Units on hand"
          value={(data?.counts.totalStock ?? 0).toLocaleString()}
          loading={loading}
          tone="active"
        />
        <StatCard
          label="Low stock"
          value={data?.counts.lowStock ?? 0}
          loading={loading}
          tone={data?.counts.lowStock ? 'danger' : 'success'}
          hint="At or below reorder level"
        />
        <StatCard
          label="Pending requests"
          value={data?.counts.pendingRequests ?? 0}
          loading={loading}
          tone={data?.counts.pendingRequests ? 'warning' : 'neutral'}
        />
      </StatGrid>

      <StatGrid>
        <StatCard label="Warehouses" value={data?.counts.warehouses ?? 0} loading={loading} />
        <StatCard label="Suppliers" value={data?.counts.suppliers ?? 0} loading={loading} />
        <StatCard label="Open purchase orders" value={data?.counts.openPurchaseOrders ?? 0} loading={loading} />
        <StatCard label="Active deliveries" value={data?.counts.activeDeliveries ?? 0} loading={loading} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Low stock"
          description="Reorder these soon"
          action={
            <Link href={`${basePath}/stock`}>
              <Button variant="ghost" size="sm">
                View stock
              </Button>
            </Link>
          }
        >
          {data?.lowStock?.length ? (
            <ul className="divide-y divide-line">
              {data.lowStock.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{p.name}</p>
                    <p className="truncate text-xs text-muted">{p.category}</p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums text-danger">
                    {p.totalStock}
                    <span className="text-faint"> / {p.reorderLevel}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Everything stocked" description="No product is below its reorder level." />
          )}
        </Card>

        <Card title="Expiring soon" description="Within the next 90 days">
          {data?.expiring?.length ? (
            <ul className="divide-y divide-line">
              {data.expiring.map((item: any) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{item.product.name}</p>
                    <p className="truncate text-xs text-muted">
                      {item.warehouse.name} · batch {item.batchNumber ?? '—'}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-warning">{dateOnly(item.expiryDate)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing expiring" description="No batches are near their expiry date." />
          )}
        </Card>
      </div>

      <Card title="Recent stock movements">
        {data?.recentMovements?.length ? (
          <ul className="divide-y divide-line">
            {data.recentMovements.map((m: any) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">{m.product.name}</p>
                  <p className="truncate text-xs text-muted">
                    {m.warehouse.name} · {m.reason ?? m.type}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-medium tabular-nums ${m.quantity >= 0 ? 'text-success' : 'text-danger'}`}
                >
                  {m.quantity >= 0 ? '+' : ''}
                  {m.quantity}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No movements yet" description="Stock receipts and issues appear here." />
        )}
      </Card>
    </>
  );
}
