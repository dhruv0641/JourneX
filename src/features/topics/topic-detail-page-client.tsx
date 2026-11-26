'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/components/providers/workspace-context';
import { FeaturePending } from '@/components/shared/feature-pending';
import { createClient } from '@/lib/supabase/client';
import { fetchTopicAnalyticsSummary } from '@/services/modules.service';
import { fetchTopicDetailBySlug } from '@/services/topics.service';

const TopicWorkspaceClient = dynamic(
  () =>
    import('@/features/topics/topic-workspace-client').then(
      (module) => module.TopicWorkspaceClient,
    ),
  {
    loading: () => <FeaturePending title="Loading topic" />,
  },
);

export function TopicDetailPageClient({ slug, tab }: { slug: string; tab?: string }) {
  const workspace = useWorkspace();
  const timezone = workspace.profile?.timezone ?? 'UTC';
  const knownTopic = workspace.topics.find((topic) => topic.slug === slug);
  const bundleQuery = useQuery({
    queryKey: ['topic-detail', slug],
    queryFn: () => fetchTopicDetailBySlug(createClient(), workspace.userId, slug),
  });
  const topicId = knownTopic?.id ?? bundleQuery.data?.topic.id;
  const analyticsQuery = useQuery({
    queryKey: ['topic-analytics', topicId, timezone],
    queryFn: () => fetchTopicAnalyticsSummary(createClient(), topicId!, 30, timezone),
    enabled: Boolean(topicId),
  });

  if (bundleQuery.data === null) {
    return (
      <div role="alert" className="space-y-3">
        <h1 className="font-serif text-4xl">Topic unavailable</h1>
        <Link href="/topics" className="text-primary underline">
          Back to topics
        </Link>
      </div>
    );
  }
  if (!bundleQuery.data) {
    return (
      <FeaturePending
        title={knownTopic?.name ?? slug}
        error={bundleQuery.isError}
        onRetry={() => {
          void bundleQuery.refetch();
        }}
      />
    );
  }
  return (
    <TopicWorkspaceClient
      userId={workspace.userId}
      timezone={timezone}
      initialBundle={bundleQuery.data}
      initialAnalytics={analyticsQuery.data}
      initialTab={tab}
    />
  );
}
