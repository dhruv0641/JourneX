'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pause, Play, Square } from 'lucide-react';
import { computeElapsedSeconds, formatTimerClock } from '@/lib/utilities/dates';
import { cn } from '@/lib/utilities/cn';
import { createClient } from '@/lib/supabase/client';
import { transitionTimeSessionAtomic } from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { TimeSessionRow } from '@/types/domain';

export function FocusTimer({ activeTimer }: { activeTimer: TimeSessionRow }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [timerBusy, setTimerBusy] = useState(false);
  const queryClient = useQueryClient();
  const pushToast = useUiStore((state) => state.pushToast);

  useEffect(() => {
    if (!activeTimer || activeTimer.status !== 'running') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  const elapsedSeconds = activeTimer
    ? computeElapsedSeconds(
        {
          status: activeTimer.status as 'running' | 'paused' | 'completed',
          accumulated_seconds: activeTimer.accumulated_seconds,
          last_resumed_at: activeTimer.last_resumed_at,
          started_at: activeTimer.started_at,
        },
        nowMs,
      )
    : 0;

  async function handleTimerAction(action: 'pause' | 'resume' | 'stop') {
    if (!activeTimer || timerBusy) return;
    setTimerBusy(true);
    try {
      await transitionTimeSessionAtomic(
        createClient(),
        activeTimer.id,
        action,
        activeTimer.version,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['time-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
      ]);
      pushToast({
        kind: 'success',
        title:
          action === 'stop'
            ? 'Session saved'
            : action === 'pause'
              ? 'Timer paused'
              : 'Timer resumed',
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Timer update failed',
        description: err instanceof Error ? err.message : 'Please reload to sync state.',
      });
    } finally {
      setTimerBusy(false);
    }
  }

  return (
    <div className="order-last flex w-full items-center gap-1 rounded-xl border border-primary/25 bg-primary/5 px-2 text-xs sm:order-none sm:w-auto sm:rounded-full">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          activeTimer.status === 'running' ? 'bg-success' : 'bg-warning',
        )}
        aria-hidden="true"
      />
      <span className="ml-1 text-muted-foreground sm:hidden">
        {activeTimer.status === 'running' ? 'Focus timer' : 'Paused'}
      </span>
      <span className="mr-auto font-mono font-semibold tabular-nums text-foreground sm:mr-0">
        {formatTimerClock(elapsedSeconds)}
      </span>
      <button
        type="button"
        disabled={timerBusy}
        onClick={() => handleTimerAction(activeTimer.status === 'running' ? 'pause' : 'resume')}
        aria-label={activeTimer.status === 'running' ? 'Pause timer' : 'Resume timer'}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {activeTimer.status === 'running' ? (
          <Pause className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Play className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        disabled={timerBusy}
        onClick={() => handleTimerAction('stop')}
        aria-label="Stop and save timer"
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-destructive hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Square className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}
