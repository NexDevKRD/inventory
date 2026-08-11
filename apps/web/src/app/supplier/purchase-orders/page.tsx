'use client';
import { PurchaseOrdersPage } from '@/features/purchaseOrders/PurchaseOrdersPage';

export default function Page() {
  return (
    <PurchaseOrdersPage
      canManage={false}
      title="Purchase orders"
      description="Orders raised against your company."
    />
  );
}
