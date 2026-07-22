import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { RequireAuth } from '@/components/layout/RequireAuth';

const items = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Roles & Permissions', href: '/admin/roles' },
  { label: 'Audit Logs', href: '/admin/audit-logs' },
  { label: 'Products', href: '/admin/products', comingSoon: true },
  { label: 'Warehouses', href: '/admin/warehouses', comingSoon: true },
  { label: 'Settings', href: '/admin/settings', comingSoon: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen">
        <Sidebar items={items} title="Super Admin" />
        <div className="flex-1">
          <TopNav />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
