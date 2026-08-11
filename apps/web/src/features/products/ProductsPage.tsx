'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProductSchema, CreateProductInput } from '@inventory/shared';
import { useApiQuery, useApiMutation, money } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toolbar, SearchInput, SelectFilter } from '@/components/ui/Toolbar';
import { PlusIcon } from '@/components/ui/icons';

const PAGE_SIZE = 20;

export function ProductsPage({ canEdit }: { canEdit: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const productsQuery = useApiQuery<any>(['products'], '/products', {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    categoryId: categoryId || undefined,
  });
  const categoriesQuery = useApiQuery<any[]>(['categories'], '/categories');
  const suppliersQuery = useApiQuery<any[]>(['suppliers'], '/suppliers', undefined, { retry: false });

  const invalidate = [['products'], ['dashboard']];

  const createMutation = useApiMutation({
    mutationFn: (client, vars: CreateProductInput) => client.post('/products', vars),
    invalidate,
    successMessage: 'Product created',
    errorMessage: 'Failed to create product',
    onSuccess: () => setDrawerOpen(false),
  });

  const updateMutation = useApiMutation({
    mutationFn: (client, vars: { id: string; data: any }) => client.patch(`/products/${vars.id}`, vars.data),
    invalidate,
    successMessage: 'Product updated',
    errorMessage: 'Failed to update product',
    onSuccess: () => setDrawerOpen(false),
  });

  const deleteMutation = useApiMutation({
    mutationFn: (client, id: string) => client.delete(`/products/${id}`),
    invalidate,
    successMessage: 'Product removed',
    errorMessage: 'Failed to remove product',
  });

  return (
    <>
      <PageHeader
        title="Products"
        description="The catalogue every request and purchase order draws from."
        action={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              New product
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
          placeholder="Search name or SKU…"
        />
        <SelectFilter
          label="Category"
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
          allLabel="All categories"
          options={(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
      </Toolbar>

      <DataTable
        columns={[
          { key: 'sku', header: 'SKU', render: (r: any) => <code className="text-xs text-muted">{r.sku}</code> },
          {
            key: 'name',
            header: 'Product',
            render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{r.name}</p>
                <p className="truncate text-xs text-muted">{r.category?.name}</p>
              </div>
            ),
          },
          { key: 'unit', header: 'Unit' },
          { key: 'unitPrice', header: 'Price', render: (r: any) => <span className="tabular-nums">{money(r.unitPrice)}</span> },
          {
            key: 'totalStock',
            header: 'On hand',
            render: (r: any) => (
              <span
                className={`tabular-nums ${r.totalStock <= r.reorderLevel ? 'font-semibold text-danger' : 'text-ink'}`}
              >
                {r.totalStock}
                <span className="text-faint"> / {r.reorderLevel}</span>
              </span>
            ),
          },
          { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
          ...(canEdit
            ? [
                {
                  key: 'id' as const,
                  header: 'Actions',
                  render: (r: any) => (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(r);
                          setDrawerOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        onClick={() => setConfirmId(r.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        rows={productsQuery.data?.items ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={productsQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        onRetry={() => productsQuery.refetch()}
        emptyTitle="No products found"
        emptyDescription={search ? 'Try a different search term.' : 'Add the first product to the catalogue.'}
      />

      <ProductDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        product={editing}
        categories={categoriesQuery.data ?? []}
        suppliers={suppliersQuery.data ?? []}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data) => {
          if (editing) {
            const { sku, ...rest } = data as any;
            updateMutation.mutate({ id: editing.id, data: rest });
          } else {
            createMutation.mutate(data);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmId}
        title="Remove this product?"
        description="It will be hidden from the catalogue. Existing history is kept."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(confirmId!);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </>
  );
}

function ProductDrawer({
  open,
  onClose,
  product,
  categories,
  suppliers,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  product: any | null;
  categories: any[];
  suppliers: any[];
  onSubmit: (data: CreateProductInput) => void;
  submitting: boolean;
}) {
  const isEdit = !!product;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    values: product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description ?? '',
          categoryId: product.categoryId,
          supplierId: product.supplierId ?? '',
          unit: product.unit,
          unitPrice: Number(product.unitPrice),
          reorderLevel: product.reorderLevel,
          status: product.status,
        }
      : undefined,
  });

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit product' : 'New product'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="flex-1 space-y-5">
          <FormField label="SKU" error={errors.sku?.message} required>
            <input className="field" placeholder="SKU-1009" disabled={isEdit} {...register('sku')} />
          </FormField>
          <FormField label="Name" error={errors.name?.message} required>
            <input className="field" placeholder="Sterile Gauze 10x10" {...register('name')} />
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <textarea className="field" rows={2} {...register('description')} />
          </FormField>
          <FormField label="Category" error={errors.categoryId?.message} required>
            <select className="field" {...register('categoryId')}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Supplier" error={errors.supplierId?.message}>
            <select className="field" {...register('supplierId')}>
              <option value="">No supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit" error={errors.unit?.message} required>
              <input className="field" placeholder="box" {...register('unit')} />
            </FormField>
            <FormField label="Unit price" error={errors.unitPrice?.message} required>
              <input className="field" type="number" step="0.01" min="0" {...register('unitPrice')} />
            </FormField>
          </div>
          <FormField
            label="Reorder level"
            error={errors.reorderLevel?.message}
            hint="Stock at or below this level is flagged as low."
            required
          >
            <input className="field" type="number" min="0" {...register('reorderLevel')} />
          </FormField>
          {isEdit && (
            <FormField label="Status" error={errors.status?.message}>
              <select className="field" {...register('status')}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </FormField>
          )}
        </div>

        <div className="sticky -bottom-6 -mx-6 mt-6 flex justify-end gap-2 border-t border-line bg-surface px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
