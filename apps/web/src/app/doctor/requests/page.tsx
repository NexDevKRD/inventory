'use client';
import { RequestsPage } from '@/features/requests/RequestsPage';

export default function Page() {
  return (
    <RequestsPage
      canReview={false}
      title="My requests"
      description="Every request you have raised and where it stands."
    />
  );
}
