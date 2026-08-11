import { ComingSoon } from '@/components/ui/ComingSoon';

export default function DashboardPage() {
  return (
    <ComingSoon
      title="Delivery dashboard"
      whatsNext={["Assigned deliveries","Route overview","Completed today","Delivery history"]}
    />
  );
}
