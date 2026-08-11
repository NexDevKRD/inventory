import { ComingSoon } from '@/components/ui/ComingSoon';

export default function DashboardPage() {
  return (
    <ComingSoon
      title="Inventory dashboard"
      whatsNext={["Stock level alerts","Expiring batches","Pending doctor requests","Purchase order status"]}
    />
  );
}
