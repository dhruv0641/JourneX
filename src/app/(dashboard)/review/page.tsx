import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GlobalDashboardClient } from '@/features/dashboard/global-dashboard-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { displayAppName } from '@/lib/utilities/app-name';
import {
  fetchGlobalDashboardSummary,
  listGlobalDashboardWidgets,
} from '@/services/modules.service';

export const metadata: Metadata = {
  title: 'Review',
};

export default async function ReviewPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const supabase = await createClient();
  const [profileResult, preferencesResult, widgets] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', claims.userId).maybeSingle(),
    supabase
      .from('user_preferences')
      .select('app_name, default_dashboard_range')
      .eq('user_id', claims.userId)
      .maybeSingle(),
    listGlobalDashboardWidgets(supabase, claims.userId),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (preferencesResult.error) throw preferencesResult.error;
  const timezone = profileResult.data?.timezone ?? 'UTC';
  const rangePref = preferencesResult.data?.default_dashboard_range ?? '30d';
  const initialDays =
    rangePref === '7d' ? 7 : rangePref === '90d' ? 90 : rangePref === 'all' ? 365 : 30;

  const summary = await fetchGlobalDashboardSummary(supabase, initialDays, timezone);

  return (
    <GlobalDashboardClient
      userId={claims.userId}
      appName={displayAppName(preferencesResult.data?.app_name)}
      timezone={timezone}
      initialDays={initialDays}
      initialSummary={summary}
      initialWidgets={widgets}
    />
  );
}
