import type { Metadata } from 'next';
import { TopicsPageClient } from '@/features/topics/topics-page-client';

export const metadata: Metadata = { title: 'Topics' };

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const initialStatusFilter =
    status === 'archived' ? 'archived' : status === 'all' ? 'all' : 'active';
  return <TopicsPageClient initialStatusFilter={initialStatusFilter} />;
}
