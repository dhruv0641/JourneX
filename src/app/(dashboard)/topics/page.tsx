import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TopicsDirectoryClient } from '@/features/topics/topics-directory-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { listTopics } from '@/services/topics.service';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

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
  const [bootstrap, topics] = await Promise.all([
    fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? ''),
    listTopics(supabase, claims.userId),
  ]);

  return (
    <TopicsDirectoryClient
      userId={claims.userId}
      timezone={bootstrap.profile?.timezone ?? 'UTC'}
      initialTopics={topics}
      initialStatusFilter={initialStatus}
    />
  );
}
