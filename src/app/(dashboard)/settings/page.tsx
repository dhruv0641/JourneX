import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/features/settings/settings-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const supabase = await createClient();
  const bootstrap = await fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? '');

  return (
    <SettingsClient
      userId={claims.userId}
      email={claims.email ?? ''}
      initialProfile={bootstrap.profile}
      initialPreferences={bootstrap.preferences}
    />
  );
}
