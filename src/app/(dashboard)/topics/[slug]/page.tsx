import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { TopicWorkspaceClient } from '@/features/topics/topic-workspace-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { fetchTopicAnalyticsSummary } from '@/services/modules.service';
import { fetchTopicDetailBySlug } from '@/services/topics.service';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' '),
  };
}

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  const [profileResult, bundle] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', claims.userId).maybeSingle(),
    fetchTopicDetailBySlug(supabase, claims.userId, slug),
  ]);
  if (profileResult.error) throw profileResult.error;

  if (!bundle) notFound();

  const timezone = profileResult.data?.timezone ?? 'UTC';
  const analytics = await fetchTopicAnalyticsSummary(supabase, bundle.topic.id, 30, timezone);

  return (
    <TopicWorkspaceClient
      userId={claims.userId}
      timezone={timezone}
      initialBundle={bundle}
      initialAnalytics={analytics}
      initialTab={sp.tab}
    />
  );
}
