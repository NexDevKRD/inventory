import { AppShell } from '@/components/layout/AppShell';

const items = [
  { label: 'Dashboard', href: '/supplier/dashboard' },
  { label: 'Purchase Orders', href: '/supplier/purchase-orders' },
  { label: 'Invoices', href: '/supplier/invoices' },
];

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} title="Supplier Portal">
      {children}
    </AppShell>
  );
}
