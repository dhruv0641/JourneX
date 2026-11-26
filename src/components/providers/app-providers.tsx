'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { OfflineBanner, ToastViewport } from '@/components/shared/state-views';
import { WorkspaceSoundListener } from '@/components/shared/workspace-sounds';
import { createClient } from '@/lib/supabase/client';
import { useUiStore } from '@/stores/ui-store';

function WorkspaceSyncListener({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const setOffline = useUiStore((s) => s.setOffline);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      pushToast({ kind: 'info', title: 'Connection restored', description: 'Refreshing latest workspace state…' });
      void queryClient.invalidateQueries();
    };
    const handleOffline = () => {
      setOffline(true);
    };

    setOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`nexora-workspace-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'topics', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['topics'] });
          void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['tasks'] });
          void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
          void queryClient.invalidateQueries({ queryKey: ['topic-analytics'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_sessions', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['time-sessions'] });
          void queryClient.invalidateQueries({ queryKey: ['active-timer'] });
          void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journal_entries', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
          void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void queryClient.invalidateQueries({ queryKey: ['active-timer'] });
        }
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      void supabase.removeChannel(channel);
    };
  }, [queryClient, setOffline, pushToast, userId]);

  return null;
}

export function AppProviders({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceSyncListener userId={userId} />
      <WorkspaceSoundListener />
      <OfflineBanner />
      {children}
      <ToastViewport />
    </QueryClientProvider>
  );
}
