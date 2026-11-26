'use client';

import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/components/providers/workspace-context';
import { FeaturePending } from '@/components/shared/feature-pending';
import { TodayWorkspace } from '@/features/dashboard/today-workspace';
import { createClient } from '@/lib/supabase/client';
import { getLocalDateKey } from '@/lib/utilities/dates';
import { fetchGlobalDashboardSummary } from '@/services/modules.service';

export function TodayPageClient() {
  const workspace = useWorkspace();
  const timezone = workspace.profile?.timezone ?? 'UTC';
  const {
    data: summary,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-summary', workspace.userId, 7, timezone],
    queryFn: () => fetchGlobalDashboardSummary(createClient(), 7, timezone),
  });

  if (!summary)
    return <FeaturePending title="Today" error={isError} onRetry={() => void refetch()} />;
  return (
    <TodayWorkspace
      userId={workspace.userId}
      timezone={timezone}
      initialSummary={summary}
      initialDate={getLocalDateKey(new Date(), timezone)}
    />
  );
}
