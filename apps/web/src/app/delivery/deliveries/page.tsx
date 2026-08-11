'use client';
import { DeliveriesPage } from '@/features/deliveries/DeliveriesPage';

export default function Page() {
  return (
    <DeliveriesPage
      canUpdate
      title="Assigned deliveries"
      description="Everything currently on your run."
    />
  );
}
