import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TopicsDirectoryClient } from '@/features/topics/topics-directory-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { listTopics } from '@/services/topics.service';

export const metadata: Metadata = {
  title: 'Topics',
};

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const sp = await searchParams;
  const initialStatus =
    sp.status === 'archived' ? 'archived' : sp.status === 'all' ? 'all' : 'active';

  const supabase = await createClient();
  const [profileResult, topics] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', claims.userId).maybeSingle(),
    listTopics(supabase, claims.userId),
  ]);
  if (profileResult.error) throw profileResult.error;

  return (
    <TopicsDirectoryClient
      userId={claims.userId}
      timezone={profileResult.data?.timezone ?? 'UTC'}
      initialTopics={topics}
      initialStatusFilter={initialStatus}
    />
  );
}
