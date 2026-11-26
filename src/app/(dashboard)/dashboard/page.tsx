import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TodayWorkspace } from '@/features/dashboard/today-workspace';
import { getLocalDateKey } from '@/lib/utilities/dates';
import { createClient, getAuthenticatedClaims, getAuthenticatedUser } from '@/lib/supabase/server';
import { fetchGlobalDashboardSummary } from '@/services/modules.service';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

export const metadata: Metadata = {
  title: 'Today',
};

export default async function DashboardPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  let timezone = 'UTC';
  let summary;
  try {
    const supabase = await createClient();
    const bootstrap = await fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? '');
    timezone = bootstrap.profile?.timezone ?? 'UTC';
    summary = await fetchGlobalDashboardSummary(supabase, 7, timezone);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const user = await getAuthenticatedUser();
    if (!user || /UNAUTHORIZED|JWT|expired|invalid token/i.test(msg)) {
      redirect('/login');
    }
    console.error('[DashboardPage] load failed:', msg);
    throw err;
  }

  return (
    <TodayWorkspace
      userId={claims.userId}
      timezone={timezone}
      initialSummary={summary}
      initialDate={getLocalDateKey(new Date(), timezone)}
    />
  );
}
