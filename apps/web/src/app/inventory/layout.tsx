import { AppShell } from '@/components/layout/AppShell';

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
    <AppShell items={items} title="Inventory">
      {children}
    </AppShell>
  );
}
