import { ComingSoon } from '@/components/ui/ComingSoon';

export default function DashboardPage() {
  return (
    <ComingSoon
      title="Super Admin dashboard"
      whatsNext={["Platform-wide KPIs","User activity summary","Audit log highlights","System health"]}
    />
  );
}
