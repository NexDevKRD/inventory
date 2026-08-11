import { ComingSoon } from '@/components/ui/ComingSoon';

export default function DashboardPage() {
  return (
    <ComingSoon
      title="Doctor dashboard"
      whatsNext={["Recent requests","Request status tracking","Favourite products","Notifications"]}
    />
  );
}
