import type { ReactNode } from 'react';
import '@/styles/workspace.css';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { AppProviders } from '@/components/providers/app-providers';
import { createClient, getAuthenticatedClaims, getAuthenticatedUser } from '@/lib/supabase/server';
import { fetchWorkspaceBootstrap } from '@/services/workspace.service';

export default async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const claims = await getAuthenticatedClaims();
  if (!claims) {
    redirect('/login');
  }

  let bootstrap;
  try {
    const supabase = await createClient();
    bootstrap = await fetchWorkspaceBootstrap(supabase, claims.userId, claims.email ?? '');
  } catch (err) {
    const user = await getAuthenticatedUser();
    if (!user) {
      redirect('/login');
    }
    console.error('[DashboardGroupLayout] bootstrap failed:', err instanceof Error ? err.message : err);
    throw err;
  }

  return (
    <AppProviders userId={claims.userId}>
      <AppShell initialBootstrap={bootstrap}>{children}</AppShell>
    </AppProviders>
  );
}
