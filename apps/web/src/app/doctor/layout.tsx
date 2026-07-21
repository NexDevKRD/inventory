import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

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
    <div className="flex min-h-screen">
      <Sidebar items={items} title="Doctor Portal" />
      <div className="flex-1">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
