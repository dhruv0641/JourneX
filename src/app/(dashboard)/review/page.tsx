import type { Metadata } from 'next';
import { ReviewPageClient } from '@/features/dashboard/review-page-client';

export const metadata: Metadata = { title: 'Review' };

export default function ReviewPage() {
  return <ReviewPageClient />;
}
