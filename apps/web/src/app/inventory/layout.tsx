import { AppShell } from '@/components/layout/AppShell';

const items = [
  { label: 'Dashboard', href: '/inventory/dashboard' },
  { label: 'Products', href: '/inventory/products' },
  { label: 'Stock Levels', href: '/inventory/stock' },
  { label: 'Doctor Requests', href: '/inventory/requests' },
  { label: 'Purchase Orders', href: '/inventory/purchase-orders' },
  { label: 'Warehouses', href: '/inventory/warehouses' },
  { label: 'Reports', href: '/inventory/reports' },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} title="Inventory">
      {children}
    </AppShell>
  );
}
