import type { ReactNode } from 'react';
import '@/styles/workspace.css';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { AppProviders } from '@/components/providers/app-providers';
import { createClient, getAuthenticatedClaims } from '@/lib/supabase/server';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

export default async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const claims = await getAuthenticatedClaims();
  if (!claims) {
    redirect('/login');
  }

  const supabase = await createClient();
  const bootstrap = await fetchWorkspaceBootstrap(
    supabase,
    claims.userId,
    claims.email ?? '',
  );

  return (
    <AppProviders userId={claims.userId}>
      <AppShell initialBootstrap={bootstrap}>{children}</AppShell>
    </AppProviders>
  );
}
