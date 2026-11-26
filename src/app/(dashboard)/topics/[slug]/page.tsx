import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { TopicWorkspaceClient } from '@/features/topics/topic-workspace-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { fetchTopicAnalyticsSummary } from '@/services/modules.service';
import { fetchTopicDetailBySlug } from '@/services/topics.service';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

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

  const [bootstrap, bundle] = await Promise.all([
    fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? ''),
    fetchTopicDetailBySlug(supabase, claims.userId, slug),
  ]);

  if (!bundle) notFound();

  const timezone = bootstrap.profile?.timezone ?? 'UTC';
  const analytics = await fetchTopicAnalyticsSummary(supabase, bundle.topic.id, 30, timezone);

  // Map friendly query tab names (e.g. ?tab=tasks) to matching module ID if present
  const matchedMod = sp.tab
    ? bundle.modules.find((m) => m.feature_key.includes(sp.tab!) || m.module_key === sp.tab)
    : undefined;

  return (
    <TopicWorkspaceClient
      userId={claims.userId}
      timezone={timezone}
      initialBundle={bundle}
      initialAnalytics={analytics}
      initialTab={matchedMod?.id ?? sp.tab}
    />
  );
}
