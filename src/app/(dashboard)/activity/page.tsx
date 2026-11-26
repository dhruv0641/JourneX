import type { Metadata } from 'next';
import { ActivityPageClient } from '@/features/activity/activity-page-client';

export const metadata: Metadata = { title: 'Activity' };

export default function ActivityPage() {
  return <ActivityPageClient />;
}
