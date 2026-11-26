'use client';

import dynamic from 'next/dynamic';
import { useWorkspace } from '@/components/providers/workspace-context';
import { FeaturePending } from '@/components/shared/feature-pending';

const SettingsClient = dynamic(
  () => import('@/features/settings/settings-client').then((module) => module.SettingsClient),
  {
    loading: () => <FeaturePending title="Settings" />,
  },
);

export function SettingsPageClient() {
  const workspace = useWorkspace();
  return (
    <SettingsClient
      userId={workspace.userId}
      email={workspace.email}
      initialProfile={workspace.profile}
      initialPreferences={workspace.preferences}
    />
  );
}
