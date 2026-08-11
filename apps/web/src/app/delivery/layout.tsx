import { AppShell } from '@/components/layout/AppShell';

const items = [
  { label: 'Dashboard', href: '/delivery/dashboard' },
  { label: 'Assigned Deliveries', href: '/delivery/deliveries', comingSoon: true },
  { label: 'Delivery History', href: '/delivery/history', comingSoon: true },
];

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} title="Delivery">
      {children}
    </AppShell>
  );
}
