import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Assigned Deliveries', href: '/deliveries', comingSoon: true },
  { label: 'Delivery History', href: '/history', comingSoon: true },
];

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} title="Delivery" />
      <div className="flex-1">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
