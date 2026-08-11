'use client';
import { RequestsPage } from '@/features/requests/RequestsPage';

export default function Page() {
  return (
    <RequestsPage
      canReview
      canAssign
      title="Doctor requests"
      description="Review requests, release stock, and schedule deliveries."
    />
  );
}
