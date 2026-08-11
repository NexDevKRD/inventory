import { Sidebar, NavItem } from './Sidebar';
import { TopNav } from './TopNav';
import { RequireAuth } from './RequireAuth';

/** The one authenticated shell — every role portal renders through it. */
export function AppShell({
  items,
  title,
  children,
}: {
  items: NavItem[];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar items={items} title={title} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
