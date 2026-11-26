import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/features/settings/settings-client';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const claims = await getAuthenticatedClaims();
  if (!claims) redirect('/login');

  const supabase = await createClient();
  const [profileResult, preferencesResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', claims.userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', claims.userId).maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (preferencesResult.error) throw preferencesResult.error;

  return (
    <SettingsClient
      userId={claims.userId}
      email={claims.email ?? ''}
      initialProfile={profileResult.data}
      initialPreferences={preferencesResult.data}
    />
  );
}
