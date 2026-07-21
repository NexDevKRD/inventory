import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Products', href: '/products', comingSoon: true },
  { label: 'Stock Levels', href: '/stock', comingSoon: true },
  { label: 'Doctor Requests', href: '/requests', comingSoon: true },
  { label: 'Purchase Orders', href: '/purchase-orders', comingSoon: true },
  { label: 'Warehouses', href: '/warehouses', comingSoon: true },
  { label: 'Reports', href: '/reports', comingSoon: true },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} title="Inventory" />
      <div className="flex-1">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
