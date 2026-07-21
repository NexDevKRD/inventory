import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Product Catalogue', href: '/catalogue', comingSoon: true },
  { label: 'Request Cart', href: '/cart', comingSoon: true },
  { label: 'Request History', href: '/requests', comingSoon: true },
  { label: 'Favourites', href: '/favourites', comingSoon: true },
  { label: 'Notifications', href: '/notifications', comingSoon: true },
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
