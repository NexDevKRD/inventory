'use client';
import { useState } from 'react';
import { useApiQuery, useApiMutation } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toolbar, SelectFilter } from '@/components/ui/Toolbar';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
];

// What a driver can do next, given where the delivery currently is.
const NEXT_ACTIONS: Record<string, { status: string; label: string; variant?: 'primary' | 'danger' }[]> = {
  PENDING: [
    { status: 'IN_TRANSIT', label: 'Start delivery' },
    { status: 'FAILED', label: 'Mark failed', variant: 'danger' },
  ],
  IN_TRANSIT: [
    { status: 'DELIVERED', label: 'Mark delivered' },
    { status: 'FAILED', label: 'Mark failed', variant: 'danger' },
  ],
  FAILED: [{ status: 'IN_TRANSIT', label: 'Retry delivery' }],
  DELIVERED: [],
};

export function DeliveriesPage({
  canUpdate,
  title = 'Deliveries',
  description,
  fixedStatus,
}: {
  canUpdate: boolean;
  title?: string;
  description?: string;
  fixedStatus?: string;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(fixedStatus ?? '');
  const [selected, setSelected] = useState<any | null>(null);

  const deliveriesQuery = useApiQuery<any>(['deliveries'], '/deliveries', {
    page,
    pageSize: PAGE_SIZE,
    status: status || undefined,
  });

  const statusMutation = useApiMutation({
    mutationFn: (client, vars: { id: string; status: string }) =>
      client.patch(`/deliveries/${vars.id}/status`, { status: vars.status }),
    invalidate: [['deliveries'], ['dashboard'], ['requests']],
    successMessage: 'Delivery updated',
    errorMessage: 'Failed to update delivery',
    onSuccess: () => setSelected(null),
  });

  return (
    <>
      <PageHeader title={title} description={description ?? 'Approved requests on their way to the wards.'} />

      {!fixedStatus && (
        <Toolbar>
          <SelectFilter
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            allLabel="All statuses"
            options={STATUS_OPTIONS}
          />
        </Toolbar>
      )}

      <DataTable
        columns={[
          {
            key: 'reference',
            header: 'Reference',
            render: (r: any) => <code className="text-xs text-ink">{r.reference}</code>,
          },
          {
            key: 'request',
            header: 'Request',
            render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate text-ink">{r.request.reference}</p>
                <p className="truncate text-xs text-muted">
                  {r.request.doctor.firstName} {r.request.doctor.lastName}
                </p>
              </div>
            ),
          },
          { key: 'warehouse', header: 'From', render: (r: any) => r.request.warehouse.name },
          { key: 'assignedTo', header: 'Driver', render: (r: any) => r.assignedTo.email },
          { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
          {
            key: 'id',
            header: 'Actions',
            render: (r: any) => (
              <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
                View
              </Button>
            ),
          },
        ]}
        rows={deliveriesQuery.data?.items ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={deliveriesQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={deliveriesQuery.isLoading}
        isError={deliveriesQuery.isError}
        onRetry={() => deliveriesQuery.refetch()}
        emptyTitle="No deliveries"
        emptyDescription="Approved requests scheduled for delivery show up here."
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Delivery ${selected.reference}` : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-muted">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Deliver to</dt>
                <dd className="text-ink">
                  {selected.request.doctor.firstName} {selected.request.doctor.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Collect from</dt>
                <dd className="text-ink">{selected.request.warehouse.name}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Items</p>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {selected.request.items.map((item: any) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate text-ink">{item.product.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {item.approvedQuantity ?? item.quantity} {item.product.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {canUpdate && NEXT_ACTIONS[selected.status].length > 0 && (
              <div className="flex gap-2 border-t border-line pt-4">
                {NEXT_ACTIONS[selected.status].map((action) => (
                  <Button
                    key={action.status}
                    variant={action.variant ?? 'primary'}
                    className="flex-1"
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: selected.id, status: action.status })}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
