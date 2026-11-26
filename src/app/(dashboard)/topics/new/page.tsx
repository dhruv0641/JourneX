import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TopicBuilderWizard } from '@/features/topic-builder/topic-builder-wizard';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { listTopicTemplates } from '@/services/topics.service';

export const metadata: Metadata = {
  title: 'New Topic Builder',
};

export default async function NewTopicPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const templates = await listTopicTemplates(await createClient());

  return <TopicBuilderWizard templates={templates} />;
}
