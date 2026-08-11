import { AppShell } from '@/components/layout/AppShell';

const items = [
  { label: 'Dashboard', href: '/doctor/dashboard' },
  { label: 'Product Catalogue', href: '/doctor/catalogue', comingSoon: true },
  { label: 'Request Cart', href: '/doctor/cart', comingSoon: true },
  { label: 'Request History', href: '/doctor/requests', comingSoon: true },
  { label: 'Favourites', href: '/doctor/favourites', comingSoon: true },
  { label: 'Notifications', href: '/doctor/notifications', comingSoon: true },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} title="Doctor Portal">
      {children}
    </AppShell>
  );
}
