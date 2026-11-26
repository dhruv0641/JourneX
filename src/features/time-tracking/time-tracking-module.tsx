'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Pause, Play, Plus, Square } from 'lucide-react';
import { EmptyState } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { createIdempotencyKey } from '@/lib/utilities/csv';
import {
  computeElapsedSeconds,
  formatDateTimeInZone,
  formatDurationSeconds,
  formatTimerClock,
} from '@/lib/utilities/dates';
import {
  createManualTimeSession,
  listTimeSessions,
  startTimeSessionAtomic,
  transitionTimeSessionAtomic,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { TopicModuleRow } from '@/types/domain';

export function TimeTrackingModule({
  userId,
  topicId,
  module: mod,
  timezone,
}: {
  userId: string;
  topicId: string;
  module: TopicModuleRow;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [description, setDescription] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualMin, setManualMin] = useState('30');
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { data: sessions = [] } = useQuery({
    queryKey: ['time-sessions', userId, topicId],
    queryFn: () => listTimeSessions(createClient(), userId, topicId),
  });

  const activeSession = sessions.find(
    (s) => s.status === 'running' || s.status === 'paused',
  );

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'running') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeSession]);

  const elapsed = activeSession
    ? computeElapsedSeconds(
        {
          status: activeSession.status as 'running' | 'paused' | 'completed',
          accumulated_seconds: activeSession.accumulated_seconds,
          last_resumed_at: activeSession.last_resumed_at,
          started_at: activeSession.started_at,
        },
        nowMs,
      )
    : 0;

  const totalTopicSeconds = sessions.reduce((sum, s) => sum + s.accumulated_seconds, 0);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['time-sessions'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
    ]);
  }

  async function handleStart() {
    setBusy(true);
    try {
      await startTimeSessionAtomic(createClient(), {
        topic_id: topicId,
        module_id: mod.id,
        description: description.trim() || 'Focus session',
        idempotencyKey: createIdempotencyKey('timer'),
      });
      setDescription('');
      await refresh();
      pushToast({ kind: 'success', title: 'Timer started' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Cannot start timer',
        description: err instanceof Error ? err.message : 'Check running timer.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleTransition(action: 'pause' | 'resume' | 'stop') {
    if (!activeSession) return;
    setBusy(true);
    try {
      await transitionTimeSessionAtomic(
        createClient(),
        activeSession.id,
        action,
        activeSession.version,
      );
      await refresh();
      pushToast({ kind: 'success', title: `Timer ${action === 'stop' ? 'saved' : action + 'd'}` });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Timer update failed',
        description: err instanceof Error ? err.message : 'Reload and retry.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleManualLog(e: React.FormEvent) {
    e.preventDefault();
    const mins = Number(manualMin);
    if (!Number.isFinite(mins) || mins <= 0) return;
    setBusy(true);
    try {
      await createManualTimeSession(createClient(), userId, {
        topic_id: topicId,
        module_id: mod.id,
        description: manualDesc.trim() || 'Logged session',
        durationMinutes: mins,
      });
      setManualDesc('');
      await refresh();
      pushToast({ kind: 'success', title: 'Manual session logged' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Failed to log time',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Synced Focus Timer</CardTitle>
              <Badge variant="primary" className="tabular-nums">
                Total: {formatDurationSeconds(totalTopicSeconds)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/40 py-6">
              <span className="font-mono text-4xl font-bold tracking-tight tabular-nums">
                {formatTimerClock(elapsed)}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {activeSession
                  ? `${activeSession.description || 'Active session'} (${activeSession.status})`
                  : 'Ready to start'}
              </span>
            </div>

            {activeSession ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={busy}
                  onClick={() =>
                    void handleTransition(
                      activeSession.status === 'running' ? 'pause' : 'resume',
                    )
                  }
                >
                  {activeSession.status === 'running' ? (
                    <>
                      <Pause className="h-4 w-4" aria-hidden="true" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Resume
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => void handleTransition('stop')}
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Stop &amp; Save
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  aria-label="Session description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you focusing on?…"
                />
                <Button disabled={busy} onClick={handleStart}>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Start
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log Manual Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualLog} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`manual-desc-${mod.id}`}>Session Description</Label>
                <Input
                  id={`manual-desc-${mod.id}`}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Practice exam or deep study block…"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`manual-min-${mod.id}`}>Duration (minutes)</Label>
                <Input
                  id={`manual-min-${mod.id}`}
                  type="number"
                  min={1}
                  max={1440}
                  value={manualMin}
                  onChange={(e) => setManualMin(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Save Time Entry
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session History ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-5 w-5" aria-hidden="true" />}
              title="No sessions recorded yet"
              description="Start the live timer or add a manual time entry above."
            />
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{s.description || 'Focus session'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeInZone(s.started_at, timezone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.is_manual ? 'outline' : 'primary'}>
                      {s.is_manual ? 'Manual' : s.status}
                    </Badge>
                    <span className="font-mono text-xs font-semibold tabular-nums">
                      {formatDurationSeconds(s.accumulated_seconds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
