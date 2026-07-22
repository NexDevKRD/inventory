import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { RequireAuth } from '@/components/layout/RequireAuth';

const items = [
  { label: 'Dashboard', href: '/inventory/dashboard' },
  { label: 'Products', href: '/inventory/products', comingSoon: true },
  { label: 'Stock Levels', href: '/inventory/stock', comingSoon: true },
  { label: 'Doctor Requests', href: '/inventory/requests', comingSoon: true },
  { label: 'Purchase Orders', href: '/inventory/purchase-orders', comingSoon: true },
  { label: 'Warehouses', href: '/inventory/warehouses', comingSoon: true },
  { label: 'Reports', href: '/inventory/reports', comingSoon: true },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen">
        <Sidebar items={items} title="Inventory" />
        <div className="flex-1">
          <TopNav />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
