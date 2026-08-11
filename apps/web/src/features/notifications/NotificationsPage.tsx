'use client';
import Link from 'next/link';
import { useApiQuery, useApiMutation } from '@/lib/useApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BellIcon } from '@/components/ui/icons';

export function NotificationsPage() {
  const notificationsQuery = useApiQuery<any>(['notifications'], '/notifications', { pageSize: 50 });

  const markRead = useApiMutation({
    mutationFn: (client, id: string) => client.post(`/notifications/${id}/read`),
    invalidate: [['notifications']],
    errorMessage: 'Failed to update notification',
  });
  const markAllRead = useApiMutation({
    mutationFn: (client) => client.post('/notifications/read-all'),
    invalidate: [['notifications']],
    successMessage: 'All caught up',
    errorMessage: 'Failed to update notifications',
  });

  const items = notificationsQuery.data?.items ?? [];
  const unread = notificationsQuery.data?.unread ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
        action={
          unread > 0 && (
            <Button variant="secondary" loading={markAllRead.isPending} onClick={() => markAllRead.mutate(undefined)}>
              Mark all read
            </Button>
          )
        }
      />

      {notificationsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            icon={<BellIcon className="h-6 w-6" />}
            title="No notifications"
            description="Updates about your requests and deliveries land here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {items.map((n: any) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 p-4 transition-colors ${n.readAt ? '' : 'bg-active/[0.04]'}`}
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-active'}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.readAt ? 'text-muted' : 'font-medium text-ink'}`}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-faint">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {n.link && (
                  <Link href={n.link}>
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </Link>
                )}
                {!n.readAt && (
                  <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
