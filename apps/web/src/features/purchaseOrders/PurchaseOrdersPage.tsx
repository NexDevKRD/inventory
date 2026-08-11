'use client';
import { useState } from 'react';
import { useApiQuery, useApiMutation, money, dateOnly } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormField } from '@/components/ui/FormField';
import { Toolbar, SelectFilter } from '@/components/ui/Toolbar';
import { PlusIcon } from '@/components/ui/icons';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const NEXT: Record<string, { status: string; label: string; variant?: 'primary' | 'danger' | 'secondary' }[]> = {
  DRAFT: [
    { status: 'SUBMITTED', label: 'Submit to supplier' },
    { status: 'CANCELLED', label: 'Cancel', variant: 'danger' },
  ],
  SUBMITTED: [
    { status: 'APPROVED', label: 'Approve' },
    { status: 'CANCELLED', label: 'Cancel', variant: 'danger' },
  ],
  APPROVED: [
    { status: 'RECEIVED', label: 'Mark received' },
    { status: 'CANCELLED', label: 'Cancel', variant: 'danger' },
  ],
  RECEIVED: [],
  CANCELLED: [],
};

export function PurchaseOrdersPage({
  canManage,
  title = 'Purchase orders',
  description,
}: {
  canManage: boolean;
  title?: string;
  description?: string;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const ordersQuery = useApiQuery<any>(['purchase-orders'], '/purchase-orders', {
    page,
    pageSize: PAGE_SIZE,
    status: status || undefined,
  });

  const statusMutation = useApiMutation({
    mutationFn: (client, vars: { id: string; status: string }) =>
      client.patch(`/purchase-orders/${vars.id}/status`, { status: vars.status }),
    invalidate: [['purchase-orders'], ['stock'], ['products'], ['dashboard']],
    successMessage: 'Order updated',
    errorMessage: 'Failed to update order',
    onSuccess: () => setSelected(null),
  });

  return (
    <>
      <PageHeader
        title={title}
        description={description ?? 'Restock orders raised against suppliers.'}
        action={
          canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              New order
            </Button>
          )
        }
      />

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
          { key: 'supplier', header: 'Supplier', render: (r: any) => r.supplier.name },
          { key: 'warehouse', header: 'Deliver to', render: (r: any) => r.warehouse.name },
          { key: 'items', header: 'Items', render: (r: any) => `${r.items.length} line(s)` },
          { key: 'total', header: 'Total', render: (r: any) => <span className="tabular-nums">{money(r.total)}</span> },
          { key: 'expectedAt', header: 'Expected', render: (r: any) => dateOnly(r.expectedAt) },
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
        rows={ordersQuery.data?.items ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={ordersQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        onRetry={() => ordersQuery.refetch()}
        emptyTitle="No purchase orders"
        emptyDescription={canManage ? 'Raise an order to restock a warehouse.' : 'Orders sent to you will appear here.'}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Order ${selected.reference}` : undefined}
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-muted">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Supplier</dt>
                <dd className="text-ink">{selected.supplier.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Deliver to</dt>
                <dd className="text-ink">{selected.warehouse.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Expected</dt>
                <dd className="text-ink">{dateOnly(selected.expectedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Total</dt>
                <dd className="tabular-nums text-ink">{money(selected.total)}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Items</p>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {selected.items.map((item: any) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-ink">{item.product.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {item.quantity} × {money(item.unitPrice)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {NEXT[selected.status].length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {NEXT[selected.status].map((action) => (
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
            {selected.status === 'APPROVED' && (
              <p className="text-xs text-muted">
                Marking this order received books its quantities into {selected.warehouse.name}.
              </p>
            )}
          </div>
        )}
      </Drawer>

      {canManage && <CreateOrderDrawer open={createOpen} onClose={() => setCreateOpen(false)} />}
    </>
  );
}

function CreateOrderDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [lines, setLines] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([]);

  const suppliersQuery = useApiQuery<any[]>(['suppliers'], '/suppliers');
  const warehousesQuery = useApiQuery<any[]>(['warehouses'], '/warehouses');
  const productsQuery = useApiQuery<any>(['products', 'all'], '/products', { pageSize: 100 });
  const products = productsQuery.data?.items ?? [];

  const createMutation = useApiMutation({
    mutationFn: (client, vars: any) => client.post('/purchase-orders', vars),
    invalidate: [['purchase-orders'], ['dashboard']],
    successMessage: 'Purchase order created',
    errorMessage: 'Failed to create order',
    onSuccess: () => {
      setLines([]);
      setSupplierId('');
      setWarehouseId('');
      setExpectedAt('');
      onClose();
    },
  });

  const addLine = () => setLines((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0 }]);
  const updateLine = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const isValid = supplierId && warehouseId && lines.length > 0 && lines.every((l) => l.productId && l.quantity > 0);

  return (
    <Drawer open={open} onClose={onClose} title="New purchase order">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-5">
          <FormField label="Supplier" required>
            <select className="field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select a supplier</option>
              {(suppliersQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Deliver to" required>
            <select className="field" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Select a warehouse</option>
              {(warehousesQuery.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Expected date">
            <input className="field" type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
          </FormField>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Items</p>
              <Button type="button" variant="secondary" size="sm" onClick={addLine}>
                Add item
              </Button>
            </div>

            {lines.length === 0 && <p className="text-sm text-muted">No items yet. Add at least one.</p>}

            {lines.map((line, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-line p-3">
                <select
                  aria-label="Product"
                  className="field"
                  value={line.productId}
                  onChange={(e) => {
                    const product = products.find((p: any) => p.id === e.target.value);
                    updateLine(index, {
                      productId: e.target.value,
                      // Default the price to the catalogue price; still editable.
                      unitPrice: product ? Number(product.unitPrice) : line.unitPrice,
                    });
                  }}
                >
                  <option value="">Select a product</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    aria-label="Quantity"
                    className="field"
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                  />
                  <input
                    aria-label="Unit price"
                    className="field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-muted">Order total</span>
            <span className="font-medium tabular-nums text-ink">{money(total)}</span>
          </div>
        </div>

        <div className="sticky -bottom-6 -mx-6 mt-6 flex justify-end gap-2 border-t border-line bg-surface px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!isValid}
            loading={createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                supplierId,
                warehouseId,
                expectedAt: expectedAt || undefined,
                items: lines,
              })
            }
          >
            Create order
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
