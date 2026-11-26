import type { Metadata } from 'next';
import { NewTopicPageClient } from '@/features/topic-builder/new-topic-page-client';

export const metadata: Metadata = {
  title: 'New Topic Builder',
};

export default function NewTopicPage() {
  return <NewTopicPageClient />;
}
