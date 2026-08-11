import { AppShell } from '@/components/layout/AppShell';

const items = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Roles & Permissions', href: '/admin/roles' },
  { label: 'Audit Logs', href: '/admin/audit-logs' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Warehouses', href: '/admin/warehouses' },
  { label: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} title="Super Admin">
      {children}
    </AppShell>
  );
}
