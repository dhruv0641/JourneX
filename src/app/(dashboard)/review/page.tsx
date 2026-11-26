import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GlobalDashboardClient } from '@/features/dashboard/global-dashboard-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import {
  fetchGlobalDashboardSummary,
  listGlobalDashboardWidgets,
} from '@/services/modules.service';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

export const metadata: Metadata = {
  title: 'Review',
};

export default async function ReviewPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const supabase = await createClient();
  const bootstrap = await fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? '');
  const timezone = bootstrap.profile?.timezone ?? 'UTC';
  const rangePref = bootstrap.preferences?.default_dashboard_range ?? '30d';
  const initialDays =
    rangePref === '7d' ? 7 : rangePref === '90d' ? 90 : rangePref === 'all' ? 365 : 30;

  const [summary, widgets] = await Promise.all([
    fetchGlobalDashboardSummary(supabase, initialDays, timezone),
    listGlobalDashboardWidgets(supabase, claims.userId),
  ]);

  return (
    <GlobalDashboardClient
      userId={claims.userId}
      appName={bootstrap.preferences?.app_name ?? 'NEXORA'}
      timezone={timezone}
      initialDays={initialDays}
      initialSummary={summary}
      initialWidgets={widgets}
    />
  );
}
