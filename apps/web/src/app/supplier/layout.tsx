import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { RequireAuth } from '@/components/layout/RequireAuth';

const items = [
  { label: 'Dashboard', href: '/supplier/dashboard' },
  { label: 'Purchase Orders', href: '/supplier/purchase-orders', comingSoon: true },
  { label: 'Invoices', href: '/supplier/invoices', comingSoon: true },
];

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen">
        <Sidebar items={items} title="Supplier Portal" />
        <div className="flex-1">
          <TopNav />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
