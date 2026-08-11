'use client';
import { DeliveriesPage } from '@/features/deliveries/DeliveriesPage';

export default function Page() {
  return (
    <DeliveriesPage
      canUpdate={false}
      fixedStatus="DELIVERED"
      title="Delivery history"
      description="Deliveries you have completed."
    />
  );
}
