'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useApiQuery, useApiMutation, money } from '@/lib/useApi';
import { useCart } from '@/features/catalogue/CartContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toolbar, SearchInput, SelectFilter } from '@/components/ui/Toolbar';

export default function CataloguePage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { add } = useCart();

  const productsQuery = useApiQuery<any>(['products', 'catalogue'], '/products', {
    pageSize: 60,
    search: search || undefined,
    categoryId: categoryId || undefined,
    status: 'ACTIVE',
  });
  const categoriesQuery = useApiQuery<any[]>(['categories'], '/categories');
  const favouritesQuery = useApiQuery<any[]>(['favourites'], '/favourites');

  const favouriteIds = new Set((favouritesQuery.data ?? []).map((f) => f.id));

  const toggleFavourite = useApiMutation({
    mutationFn: (client, vars: { productId: string; isFavourite: boolean }) =>
      vars.isFavourite
        ? client.delete(`/favourites/${vars.productId}`)
        : client.post(`/favourites/${vars.productId}`),
    invalidate: [['favourites']],
    errorMessage: 'Failed to update favourites',
  });

  const products = productsQuery.data?.items ?? [];

  return (
    <>
      <PageHeader title="Product catalogue" description="Browse available stock and build a request." />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
        <SelectFilter
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          allLabel="All categories"
          options={(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
      </Toolbar>

      {productsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : productsQuery.isError ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState tone="danger" title="Couldn't load the catalogue" description="Please try again." />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="No products found" description="Try a different search or category." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => {
            const isFavourite = favouriteIds.has(p.id);
            const outOfStock = p.totalStock === 0;
            return (
              <article key={p.id} className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-ink">{p.name}</h3>
                    <code className="text-xs text-muted">{p.sku}</code>
                  </div>
                  <button
                    type="button"
                    aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                    aria-pressed={isFavourite}
                    onClick={() => toggleFavourite.mutate({ productId: p.id, isFavourite })}
                    className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                      isFavourite ? 'text-warning' : 'text-faint hover:text-muted'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill={isFavourite ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={1.75}
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m12 3.6 2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.75L6.8 19.6l1-5.8-4.2-4.1 5.8-.85z" />
                    </svg>
                  </button>
                </div>

                <p className="mt-2 flex-1 text-sm text-muted line-clamp-2">{p.description || p.category?.name}</p>

                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="tabular-nums text-ink">{money(p.unitPrice)}</span>
                  <StatusBadge
                    status={outOfStock ? 'OUT_OF_STOCK' : p.totalStock <= p.reorderLevel ? 'PENDING' : 'ACTIVE'}
                    label={outOfStock ? 'Out of stock' : `${p.totalStock} ${p.unit}`}
                  />
                </div>

                <Button
                  className="mt-4 w-full"
                  variant={outOfStock ? 'secondary' : 'primary'}
                  disabled={outOfStock}
                  onClick={() => {
                    add({ productId: p.id, name: p.name, unit: p.unit });
                    toast.success(`${p.name} added to your request`);
                  }}
                >
                  {outOfStock ? 'Unavailable' : 'Add to request'}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
