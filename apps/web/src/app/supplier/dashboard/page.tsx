import { ComingSoon } from '@/components/ui/ComingSoon';

export default function DashboardPage() {
  return (
    <ComingSoon
      title="Supplier dashboard"
      whatsNext={["Open purchase orders","Invoice status","Fulfilment history","Order notifications"]}
    />
  );
}
