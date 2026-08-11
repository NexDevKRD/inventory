'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApiQuery } from '@/lib/useApi';
import { BellIcon } from '@/components/ui/icons';

/** Links through to whichever portal the user is currently in. */
export function NotificationBell() {
  const pathname = usePathname();
  const portal = pathname.split('/')[1] || 'doctor';

  const query = useApiQuery<any>(['notifications', 'unread'], '/notifications', { pageSize: 1, unreadOnly: 'true' }, {
    retry: false,
    refetchInterval: 60_000,
  });
  const unread = query.data?.unread ?? 0;

  return (
    <Link
      href={`/${portal}/notifications`}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
