import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TodayWorkspace } from '@/features/dashboard/today-workspace';
import { getLocalDateKey } from '@/lib/utilities/dates';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { fetchGlobalDashboardSummary } from '@/services/modules.service';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

export const metadata: Metadata = {
  title: 'Today',
};

export default async function DashboardPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const supabase = await createClient();
  const bootstrap = await fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? '');
  const timezone = bootstrap.profile?.timezone ?? 'UTC';
  const summary = await fetchGlobalDashboardSummary(supabase, 7, timezone);
  return (
    <TodayWorkspace
      userId={claims.userId}
      timezone={timezone}
      initialSummary={summary}
      initialDate={getLocalDateKey(new Date(), timezone)}
    />
  );
}
