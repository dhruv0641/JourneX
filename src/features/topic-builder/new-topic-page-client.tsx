'use client';

import { useQuery } from '@tanstack/react-query';
import { FeaturePending } from '@/components/shared/feature-pending';
import { TopicBuilderWizard } from '@/features/topic-builder/topic-builder-wizard';
import { createClient } from '@/lib/supabase/client';
import { listTopicTemplates } from '@/services/topics.service';

export function NewTopicPageClient() {
  const {
    data: templates,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['topic-templates'],
    queryFn: () => listTopicTemplates(createClient()),
  });

  if (!templates) {
    return (
      <FeaturePending
        title="Dynamic Topic Builder"
        error={isError}
        onRetry={() => void refetch()}
      />
    );
  }
  return <TopicBuilderWizard templates={templates} />;
}
