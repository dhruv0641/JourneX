import type { Metadata } from 'next';
import { TodayPageClient } from '@/features/dashboard/today-page-client';

export const metadata: Metadata = { title: 'Today' };

export default function DashboardPage() {
  return <TodayPageClient />;
}
