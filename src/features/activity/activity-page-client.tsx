'use client';

import { useWorkspace } from '@/components/providers/workspace-context';
import { ActivityFeedClient } from '@/features/activity/activity-feed-client';

export function ActivityPageClient() {
  const workspace = useWorkspace();
  return (
    <ActivityFeedClient
      userId={workspace.userId}
      timezone={workspace.profile?.timezone ?? 'UTC'}
      topics={workspace.topics}
    />
  );
}
