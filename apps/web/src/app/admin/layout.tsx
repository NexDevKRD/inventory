import { AppShell } from '@/components/layout/AppShell';

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
    <AppShell items={items} title="Super Admin">
      {children}
    </AppShell>
  );
}
