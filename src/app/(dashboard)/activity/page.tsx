import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ActivityFeedClient } from '@/features/activity/activity-feed-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { listActivityLogs } from '@/services/modules.service';

export const metadata: Metadata = {
  title: 'Activity',
};

export default async function ActivityPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const supabase = await createClient();
  const [profileResult, topicsResult, logs] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', claims.userId).maybeSingle(),
    supabase.from('topics').select('*').eq('user_id', claims.userId).is('deleted_at', null),
    listActivityLogs(supabase, claims.userId, { limit: 80 }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (topicsResult.error) throw topicsResult.error;

  return (
    <ActivityFeedClient
      userId={claims.userId}
      timezone={profileResult.data?.timezone ?? 'UTC'}
      topics={topicsResult.data ?? []}
      initialLogs={logs}
    />
  );
}
