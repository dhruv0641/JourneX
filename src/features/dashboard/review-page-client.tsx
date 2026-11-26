'use client';

import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/components/providers/workspace-context';
import { FeaturePending } from '@/components/shared/feature-pending';
import { GlobalDashboardClient } from '@/features/dashboard/global-dashboard-client';
import { createClient } from '@/lib/supabase/client';
import { displayAppName } from '@/lib/utilities/app-name';
import {
  fetchGlobalDashboardSummary,
  listGlobalDashboardWidgets,
} from '@/services/modules.service';

export function ReviewPageClient() {
  const workspace = useWorkspace();
  const timezone = workspace.profile?.timezone ?? 'UTC';
  const range = workspace.preferences?.default_dashboard_range ?? '30d';
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? 365 : 30;
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', workspace.userId, days, timezone],
    queryFn: () => fetchGlobalDashboardSummary(createClient(), days, timezone),
  });
  const widgetsQuery = useQuery({
    queryKey: ['dashboard-widgets', workspace.userId],
    queryFn: () => listGlobalDashboardWidgets(createClient(), workspace.userId),
  });

  if (!summaryQuery.data || !widgetsQuery.data) {
    return (
      <FeaturePending
        title="Workspace review"
        error={summaryQuery.isError || widgetsQuery.isError}
        onRetry={() => {
          void summaryQuery.refetch();
          void widgetsQuery.refetch();
        }}
      />
    );
  }
  return (
    <GlobalDashboardClient
      userId={workspace.userId}
      appName={displayAppName(workspace.preferences?.app_name)}
      timezone={timezone}
      initialDays={days}
      initialSummary={summaryQuery.data}
      initialWidgets={widgetsQuery.data}
    />
  );
}
