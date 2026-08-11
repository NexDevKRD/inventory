'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adjustStockSchema, AdjustStockInput } from '@inventory/shared';
import { useApiQuery, useApiMutation, dateOnly } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toolbar, SearchInput, SelectFilter } from '@/components/ui/Toolbar';

const PAGE_SIZE = 20;

export function StockPage({ canAdjust }: { canAdjust: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [preset, setPreset] = useState<{ productId?: string; warehouseId?: string }>({});

  const stockQuery = useApiQuery<any>(['stock'], '/stock', {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    warehouseId: warehouseId || undefined,
  });
  const warehousesQuery = useApiQuery<any[]>(['warehouses'], '/warehouses');
  const productsQuery = useApiQuery<any>(['products', 'all'], '/products', { pageSize: 100 });

  const adjustMutation = useApiMutation({
    mutationFn: (client, vars: AdjustStockInput) => client.post('/stock/adjust', vars),
    invalidate: [['stock'], ['products'], ['dashboard']],
    successMessage: 'Stock updated',
    errorMessage: 'Failed to adjust stock',
    onSuccess: () => setAdjustOpen(false),
  });

  return (
    <>
      <PageHeader
        title="Stock levels"
        description="On-hand quantities per warehouse and batch."
        action={
          canAdjust && (
            <Button
              onClick={() => {
                setPreset({});
                setAdjustOpen(true);
              }}
            >
              Adjust stock
            </Button>
          )
        }
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search product or SKU…"
        />
        <SelectFilter
          label="Warehouse"
          value={warehouseId}
          onChange={(v) => {
            setWarehouseId(v);
            setPage(1);
          }}
          allLabel="All warehouses"
          options={(warehousesQuery.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
        />
      </Toolbar>

      <DataTable
        columns={[
          {
            key: 'product',
            header: 'Product',
            render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{r.product.name}</p>
                <code className="text-xs text-muted">{r.product.sku}</code>
              </div>
            ),
          },
          { key: 'warehouse', header: 'Warehouse', render: (r: any) => r.warehouse.name },
          { key: 'batchNumber', header: 'Batch', render: (r: any) => r.batchNumber ?? '—' },
          { key: 'expiryDate', header: 'Expires', render: (r: any) => dateOnly(r.expiryDate) },
          {
            key: 'quantity',
            header: 'Quantity',
            render: (r: any) => (
              <span className={`tabular-nums ${r.isLow ? 'font-semibold text-danger' : 'text-ink'}`}>
                {r.quantity} {r.product.unit}
              </span>
            ),
          },
          {
            key: 'isLow',
            header: 'Level',
            render: (r: any) => (
              <StatusBadge
                status={r.quantity === 0 ? 'OUT_OF_STOCK' : r.isLow ? 'PENDING' : 'ACTIVE'}
                label={r.quantity === 0 ? 'Out of stock' : r.isLow ? 'Low' : 'Healthy'}
              />
            ),
          },
          ...(canAdjust
            ? [
                {
                  key: 'id' as const,
                  header: 'Actions',
                  render: (r: any) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreset({ productId: r.product.id, warehouseId: r.warehouse.id });
                        setAdjustOpen(true);
                      }}
                    >
                      Adjust
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
        rows={stockQuery.data?.items ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={stockQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={stockQuery.isLoading}
        isError={stockQuery.isError}
        onRetry={() => stockQuery.refetch()}
        emptyTitle="No stock records"
        emptyDescription="Receive stock against a product to see it here."
      />

      <AdjustDrawer
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        preset={preset}
        products={productsQuery.data?.items ?? []}
        warehouses={warehousesQuery.data ?? []}
        submitting={adjustMutation.isPending}
        onSubmit={(data) => adjustMutation.mutate(data)}
      />
    </>
  );
}

function AdjustDrawer({
  open,
  onClose,
  preset,
  products,
  warehouses,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  preset: { productId?: string; warehouseId?: string };
  products: any[];
  warehouses: any[];
  onSubmit: (data: AdjustStockInput) => void;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdjustStockInput>({
    resolver: zodResolver(adjustStockSchema),
    values: {
      productId: preset.productId ?? '',
      warehouseId: preset.warehouseId ?? '',
      quantity: 0,
      reason: '',
    } as AdjustStockInput,
  });

  return (
    <Drawer open={open} onClose={onClose} title="Adjust stock">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="flex-1 space-y-5">
          <FormField label="Product" error={errors.productId?.message} required>
            <select className="field" {...register('productId')}>
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Warehouse" error={errors.warehouseId?.message} required>
            <select className="field" {...register('warehouseId')}>
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Quantity change"
            error={errors.quantity?.message}
            hint="Positive receives stock, negative issues it."
            required
          >
            <input className="field" type="number" step="1" {...register('quantity')} />
          </FormField>
          <FormField label="Batch number" error={errors.batchNumber?.message} hint="Leave blank for unbatched stock.">
            <input className="field" placeholder="B-2411" {...register('batchNumber')} />
          </FormField>
          <FormField label="Expiry date" error={errors.expiryDate?.message}>
            <input className="field" type="date" {...register('expiryDate')} />
          </FormField>
          <FormField label="Reason" error={errors.reason?.message} required>
            <input className="field" placeholder="Delivery received / stock count correction" {...register('reason')} />
          </FormField>
        </div>
        <div className="sticky -bottom-6 -mx-6 mt-6 flex justify-end gap-2 border-t border-line bg-surface px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Apply adjustment
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
