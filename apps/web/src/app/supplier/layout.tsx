import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

const items = [
  { label: 'Dashboard', href: '/supplier/dashboard' },
  { label: 'Purchase Orders', href: '/supplier/purchase-orders', comingSoon: true },
  { label: 'Invoices', href: '/supplier/invoices', comingSoon: true },
];

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} title="Supplier Portal" />
      <div className="flex-1">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
