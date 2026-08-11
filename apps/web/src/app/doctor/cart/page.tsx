'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApiQuery, useApiMutation } from '@/lib/useApi';
import { useCart } from '@/features/catalogue/CartContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';

export default function CartPage() {
  const { lines, setQuantity, remove, clear, count } = useCart();
  const [warehouseId, setWarehouseId] = useState('');
  const [note, setNote] = useState('');
  const router = useRouter();

  const warehousesQuery = useApiQuery<any[]>(['warehouses'], '/warehouses', undefined, { retry: false });

  const submitMutation = useApiMutation({
    mutationFn: (client, vars: any) => client.post('/requests', vars),
    invalidate: [['requests'], ['dashboard']],
    successMessage: 'Request submitted',
    errorMessage: 'Failed to submit request',
    onSuccess: () => {
      clear();
      router.push('/doctor/requests');
    },
  });

  if (lines.length === 0) {
    return (
      <>
        <PageHeader title="Request cart" description="Items you are about to request." />
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            title="Your cart is empty"
            description="Add products from the catalogue to build a request."
            action={
              <Link href="/doctor/catalogue">
                <Button variant="secondary" size="sm">
                  Browse catalogue
                </Button>
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Request cart"
        description={`${count} item(s) ready to submit.`}
        action={
          <Button variant="ghost" onClick={clear}>
            Clear cart
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {lines.map((line) => (
              <li key={line.productId} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{line.name}</p>
                  <p className="text-xs text-muted">{line.unit}</p>
                </div>
                <input
                  type="number"
                  min={1}
                  aria-label={`Quantity for ${line.name}`}
                  value={line.quantity}
                  onChange={(e) => setQuantity(line.productId, Number(e.target.value))}
                  className="field w-24"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => remove(line.productId)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <Card title="Submit request" className="h-fit">
          <div className="space-y-4">
            <FormField label="Deliver from" required>
              <select className="field" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">Select a warehouse</option>
                {(warehousesQuery.data ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Note">
              <textarea
                className="field"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything the inventory team should know"
              />
            </FormField>
            <Button
              className="w-full"
              disabled={!warehouseId}
              loading={submitMutation.isPending}
              onClick={() =>
                submitMutation.mutate({
                  warehouseId,
                  note: note || undefined,
                  items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
                })
              }
            >
              Submit request
            </Button>
            <p className="text-xs text-muted">
              The inventory team reviews every request before stock is released.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
