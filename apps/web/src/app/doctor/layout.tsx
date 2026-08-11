import { AppShell } from '@/components/layout/AppShell';
import { CartProvider } from '@/features/catalogue/CartContext';

const items = [
  { label: 'Dashboard', href: '/doctor/dashboard' },
  { label: 'Product Catalogue', href: '/doctor/catalogue' },
  { label: 'Request Cart', href: '/doctor/cart' },
  { label: 'Request History', href: '/doctor/requests' },
  { label: 'Favourites', href: '/doctor/favourites' },
  { label: 'Notifications', href: '/doctor/notifications' },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <AppShell items={items} title="Doctor Portal">
        {children}
      </AppShell>
    </CartProvider>
  );
}
