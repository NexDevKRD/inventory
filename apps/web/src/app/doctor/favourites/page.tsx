'use client';
import Link from 'next/link';
import { toast } from 'sonner';
import { useApiQuery, useApiMutation, money } from '@/lib/useApi';
import { useCart } from '@/features/catalogue/CartContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function FavouritesPage() {
  const favouritesQuery = useApiQuery<any[]>(['favourites'], '/favourites');
  const { add } = useCart();

  const removeFavourite = useApiMutation({
    mutationFn: (client, productId: string) => client.delete(`/favourites/${productId}`),
    invalidate: [['favourites']],
    successMessage: 'Removed from favourites',
    errorMessage: 'Failed to update favourites',
  });

  return (
    <>
      <PageHeader title="Favourites" description="Products you request often." />

      {favouritesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : favouritesQuery.data?.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            title="No favourites yet"
            description="Star a product in the catalogue to keep it handy."
            action={
              <Link href="/doctor/catalogue">
                <Button variant="secondary" size="sm">
                  Browse catalogue
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favouritesQuery.data?.map((p: any) => (
            <article key={p.id} className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
              <div className="min-w-0">
                <h3 className="truncate font-medium text-ink">{p.name}</h3>
                <code className="text-xs text-muted">{p.sku}</code>
              </div>
              <div className="mt-3 flex flex-1 items-center justify-between gap-2 text-sm">
                <span className="tabular-nums text-ink">{money(p.unitPrice)}</span>
                <StatusBadge
                  status={p.totalStock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE'}
                  label={p.totalStock === 0 ? 'Out of stock' : `${p.totalStock} ${p.unit}`}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={p.totalStock === 0}
                  onClick={() => {
                    add({ productId: p.id, name: p.name, unit: p.unit });
                    toast.success(`${p.name} added to your request`);
                  }}
                >
                  Add to request
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeFavourite.mutate(p.id)}>
                  Remove
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
