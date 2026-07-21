import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Users', href: '/users' },
  { label: 'Roles & Permissions', href: '/roles' },
  { label: 'Audit Logs', href: '/audit-logs' },
  { label: 'Products', href: '/products', comingSoon: true },
  { label: 'Warehouses', href: '/warehouses', comingSoon: true },
  { label: 'Settings', href: '/settings', comingSoon: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} title="Super Admin" />
      <div className="flex-1">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
