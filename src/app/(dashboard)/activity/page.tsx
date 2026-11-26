import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ActivityFeedClient } from '@/features/activity/activity-feed-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { listActivityLogs } from '@/services/modules.service';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

export const metadata: Metadata = {
  title: 'Activity',
};

export default async function ActivityPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const supabase = await createClient();
  const [bootstrap, logs] = await Promise.all([
    fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? ''),
    listActivityLogs(supabase, claims.userId, { limit: 80 }),
  ]);

  return (
    <ActivityFeedClient
      userId={claims.userId}
      timezone={bootstrap.profile?.timezone ?? 'UTC'}
      topics={bootstrap.topics}
      initialLogs={logs}
    />
  );
}
