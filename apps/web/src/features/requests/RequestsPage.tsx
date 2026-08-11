'use client';
import { useState } from 'react';
import { useApiQuery, useApiMutation } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toolbar, SelectFilter } from '@/components/ui/Toolbar';
import { FormField } from '@/components/ui/FormField';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FULFILLED', label: 'Fulfilled' },
];

/**
 * Shared by the inventory team (review + assign) and doctors (own history).
 * The API scopes the rows; `canReview` only controls which controls appear.
 */
export function RequestsPage({
  canReview,
  canAssign = false,
  title = 'Requests',
  description,
}: {
  canReview: boolean;
  canAssign?: boolean;
  title?: string;
  description?: string;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [assignTo, setAssignTo] = useState('');

  const requestsQuery = useApiQuery<any>(['requests'], '/requests', {
    page,
    pageSize: PAGE_SIZE,
    status: status || undefined,
  });
  const staffQuery = useApiQuery<any[]>(['delivery-staff'], '/deliveries/staff', undefined, {
    enabled: canAssign,
    retry: false,
  });

  const invalidate = [['requests'], ['stock'], ['dashboard'], ['deliveries']];

  const reviewMutation = useApiMutation({
    mutationFn: (client, vars: { id: string; status: string; reviewNote?: string }) =>
      client.patch(`/requests/${vars.id}/review`, { status: vars.status, reviewNote: vars.reviewNote }),
    invalidate,
    successMessage: 'Request reviewed',
    errorMessage: 'Failed to review request',
    onSuccess: () => {
      setSelected(null);
      setReviewNote('');
    },
  });

  const assignMutation = useApiMutation({
    mutationFn: (client, vars: { requestId: string; assignedToId: string }) => client.post('/deliveries', vars),
    invalidate,
    successMessage: 'Delivery assigned',
    errorMessage: 'Failed to assign delivery',
    onSuccess: () => {
      setSelected(null);
      setAssignTo('');
    },
  });

  return (
    <>
      <PageHeader title={title} description={description ?? 'Stock requests raised by clinical staff.'} />

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

      <DataTable
        columns={[
          {
            key: 'reference',
            header: 'Reference',
            render: (r: any) => <code className="text-xs text-ink">{r.reference}</code>,
          },
          {
            key: 'doctor',
            header: 'Requested by',
            render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate text-ink">
                  {r.doctor.firstName} {r.doctor.lastName}
                </p>
                <p className="truncate text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ),
          },
          { key: 'warehouse', header: 'Warehouse', render: (r: any) => r.warehouse.name },
          { key: 'items', header: 'Items', render: (r: any) => `${r.items.length} line(s)` },
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
        rows={requestsQuery.data?.items ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={requestsQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={requestsQuery.isLoading}
        isError={requestsQuery.isError}
        onRetry={() => requestsQuery.refetch()}
        emptyTitle="No requests"
        emptyDescription="Requests raised by doctors will appear here."
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Request ${selected.reference}` : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-muted">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Requested by</dt>
                <dd className="text-ink">
                  {selected.doctor.firstName} {selected.doctor.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Warehouse</dt>
                <dd className="text-ink">{selected.warehouse.name}</dd>
              </div>
            </dl>

            {selected.note && (
              <div className="rounded-lg border border-line bg-raised/50 p-3 text-sm text-muted">{selected.note}</div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Items</p>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {selected.items.map((item: any) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate text-ink">{item.product.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {item.approvedQuantity ?? item.quantity} {item.product.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {selected.reviewNote && (
              <div className="rounded-lg border border-line bg-raised/50 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-faint">Review note</p>
                <p className="text-muted">{selected.reviewNote}</p>
              </div>
            )}

            {canReview && selected.status === 'PENDING' && (
              <div className="space-y-3 border-t border-line pt-4">
                <FormField label="Review note">
                  <input
                    className="field"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Optional note for the requester"
                  />
                </FormField>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    loading={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({ id: selected.id, status: 'APPROVED', reviewNote: reviewNote || undefined })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    loading={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({ id: selected.id, status: 'REJECTED', reviewNote: reviewNote || undefined })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {canAssign && selected.status === 'APPROVED' && !selected.delivery && (
              <div className="space-y-3 border-t border-line pt-4">
                <FormField label="Assign delivery to" required>
                  <select className="field" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                    <option value="">Select delivery staff</option>
                    {(staffQuery.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Button
                  className="w-full"
                  disabled={!assignTo}
                  loading={assignMutation.isPending}
                  onClick={() => assignMutation.mutate({ requestId: selected.id, assignedToId: assignTo })}
                >
                  Schedule delivery
                </Button>
              </div>
            )}

            {selected.delivery && (
              <div className="rounded-lg border border-line bg-raised/50 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-faint">Delivery</p>
                <p className="text-ink">
                  {selected.delivery.reference} · {selected.delivery.status.replace('_', ' ').toLowerCase()}
                </p>
                <p className="text-xs text-muted">Assigned to {selected.delivery.assignedTo.email}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
