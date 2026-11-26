'use client';

import { useWorkspace } from '@/components/providers/workspace-context';
import { TopicsDirectoryClient } from '@/features/topics/topics-directory-client';

export function TopicsPageClient({
  initialStatusFilter,
}: {
  initialStatusFilter: 'active' | 'archived' | 'all';
}) {
  const workspace = useWorkspace();
  return (
    <TopicsDirectoryClient
      userId={workspace.userId}
      timezone={workspace.profile?.timezone ?? 'UTC'}
      initialTopics={workspace.topics}
      initialStatusFilter={initialStatusFilter}
    />
  );
}
