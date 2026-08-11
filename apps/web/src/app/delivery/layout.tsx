import { AppShell } from '@/components/layout/AppShell';

const items = [
  { label: 'Dashboard', href: '/delivery/dashboard' },
  { label: 'Assigned Deliveries', href: '/delivery/deliveries' },
  { label: 'Delivery History', href: '/delivery/history' },
];

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} title="Delivery">
      {children}
    </AppShell>
  );
}
