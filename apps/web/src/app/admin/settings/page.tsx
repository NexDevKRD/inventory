'use client';
import { useState } from 'react';
import { useApiQuery, useApiMutation } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';

/** Categories and suppliers — the reference data the catalogue depends on. */
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Reference data used across the catalogue." />
      <div className="grid gap-6 lg:grid-cols-2">
        <CategorySettings />
        <SupplierSettings />
      </div>
    </>
  );
}

function CategorySettings() {
  const [name, setName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const categoriesQuery = useApiQuery<any[]>(['categories'], '/categories');

  const createMutation = useApiMutation({
    mutationFn: (client, vars: { name: string }) => client.post('/categories', vars),
    invalidate: [['categories']],
    successMessage: 'Category added',
    errorMessage: 'Failed to add category',
    onSuccess: () => setName(''),
  });
  const deleteMutation = useApiMutation({
    mutationFn: (client, id: string) => client.delete(`/categories/${id}`),
    invalidate: [['categories']],
    successMessage: 'Category removed',
    errorMessage: 'Failed to remove category',
  });

  return (
    <Card title="Categories" description="Used to group products">
      <div className="space-y-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) createMutation.mutate({ name: name.trim() });
          }}
        >
          <div className="flex-1">
            <FormField label="New category">
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dressings" />
            </FormField>
          </div>
          <Button type="submit" loading={createMutation.isPending} disabled={name.trim().length < 2}>
            Add
          </Button>
        </form>

        {categoriesQuery.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {categoriesQuery.data?.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">{c.name}</p>
                  <p className="text-xs text-muted">{c._count?.products ?? 0} product(s)</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setConfirmId(c.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        title="Remove this category?"
        description="Only possible when no products are assigned to it."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(confirmId!);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </Card>
  );
}

function SupplierSettings() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const suppliersQuery = useApiQuery<any[]>(['suppliers'], '/suppliers');

  const createMutation = useApiMutation({
    mutationFn: (client, vars: any) => client.post('/suppliers', vars),
    invalidate: [['suppliers']],
    successMessage: 'Supplier added',
    errorMessage: 'Failed to add supplier',
    onSuccess: () => {
      setName('');
      setEmail('');
    },
  });
  const deleteMutation = useApiMutation({
    mutationFn: (client, id: string) => client.delete(`/suppliers/${id}`),
    invalidate: [['suppliers']],
    successMessage: 'Supplier removed',
    errorMessage: 'Failed to remove supplier',
  });

  return (
    <Card title="Suppliers" description="Companies you raise purchase orders with">
      <div className="space-y-4">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) createMutation.mutate({ name: name.trim(), contactEmail: email || undefined });
          }}
        >
          <FormField label="Supplier name">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Meridian Medical" />
          </FormField>
          <FormField label="Contact email">
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@supplier.example"
            />
          </FormField>
          <Button type="submit" loading={createMutation.isPending} disabled={name.trim().length < 2}>
            Add supplier
          </Button>
        </form>

        {suppliersQuery.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {suppliersQuery.data?.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">{s.name}</p>
                  <p className="truncate text-xs text-muted">
                    {s.contactEmail || 'No contact email'} · {s._count?.purchaseOrders ?? 0} order(s)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setConfirmId(s.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        title="Remove this supplier?"
        description="Existing purchase orders are kept for the record."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(confirmId!);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </Card>
  );
}
