'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWarehouseSchema, CreateWarehouseInput } from '@inventory/shared';
import { useApiQuery, useApiMutation } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PlusIcon } from '@/components/ui/icons';

export function WarehousesPage({ canEdit }: { canEdit: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const warehousesQuery = useApiQuery<any[]>(['warehouses'], '/warehouses');
  const invalidate = [['warehouses'], ['dashboard']];

  const createMutation = useApiMutation({
    mutationFn: (client, vars: CreateWarehouseInput) => client.post('/warehouses', vars),
    invalidate,
    successMessage: 'Warehouse created',
    errorMessage: 'Failed to create warehouse',
    onSuccess: () => setDrawerOpen(false),
  });
  const updateMutation = useApiMutation({
    mutationFn: (client, vars: { id: string; data: any }) => client.patch(`/warehouses/${vars.id}`, vars.data),
    invalidate,
    successMessage: 'Warehouse updated',
    errorMessage: 'Failed to update warehouse',
    onSuccess: () => setDrawerOpen(false),
  });
  const deleteMutation = useApiMutation({
    mutationFn: (client, id: string) => client.delete(`/warehouses/${id}`),
    invalidate,
    successMessage: 'Warehouse removed',
    errorMessage: 'Failed to remove warehouse',
  });

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Storage locations that hold stock."
        action={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              New warehouse
            </Button>
          )
        }
      />

      {warehousesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : warehousesQuery.isError ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState tone="danger" title="Couldn't load warehouses" description="Please try again." />
        </div>
      ) : warehousesQuery.data?.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="No warehouses yet" description="Create one to start holding stock." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehousesQuery.data?.map((w) => (
            <div key={w.id} className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{w.name}</p>
                  <code className="text-xs text-muted">{w.code}</code>
                </div>
                <StatusBadge status={w.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <p className="mt-3 flex-1 text-sm text-muted">{w.location || 'No location set'}</p>
              <p className="mt-3 text-xs text-muted">{w._count?.stockItems ?? 0} stock lines</p>
              {canEdit && (
                <div className="mt-4 flex gap-1 border-t border-line pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(w);
                      setDrawerOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={() => setConfirmId(w.id)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <WarehouseDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        warehouse={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data) => {
          if (editing) {
            const { code, ...rest } = data as any;
            updateMutation.mutate({ id: editing.id, data: rest });
          } else {
            createMutation.mutate(data);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmId}
        title="Remove this warehouse?"
        description="Only possible when it holds no stock."
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

function WarehouseDrawer({
  open,
  onClose,
  warehouse,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  warehouse: any | null;
  onSubmit: (data: CreateWarehouseInput) => void;
  submitting: boolean;
}) {
  const isEdit = !!warehouse;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWarehouseInput>({
    resolver: zodResolver(createWarehouseSchema),
    values: warehouse
      ? {
          code: warehouse.code,
          name: warehouse.name,
          location: warehouse.location ?? '',
          isActive: warehouse.isActive,
        }
      : undefined,
  });

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit warehouse' : 'New warehouse'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="flex-1 space-y-5">
          <FormField label="Code" error={errors.code?.message} required>
            <input className="field" placeholder="WH-MAIN" disabled={isEdit} {...register('code')} />
          </FormField>
          <FormField label="Name" error={errors.name?.message} required>
            <input className="field" placeholder="Main Store" {...register('name')} />
          </FormField>
          <FormField label="Location" error={errors.location?.message}>
            <input className="field" placeholder="Building A, Level 1" {...register('location')} />
          </FormField>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-line accent-active" {...register('isActive')} />
            Active
          </label>
        </div>
        <div className="sticky -bottom-6 -mx-6 mt-6 flex justify-end gap-2 border-t border-line bg-surface px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create warehouse'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
