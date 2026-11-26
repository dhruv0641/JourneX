'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flame, Plus, Target, Trash2 } from 'lucide-react';
import { HabitCalendarHeatmap } from '@/components/charts/analytics-charts';
import { EmptyState } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, NativeSelect } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { getLocalDateKey } from '@/lib/utilities/dates';
import {
  createGoal,
  createHabit,
  deleteGoal,
  listGoals,
  listHabitsAndCheckins,
  toggleHabitCheckin,
  updateGoalProgress,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { TopicModuleRow } from '@/types/domain';

export function GoalsModule({
  userId,
  topicId,
  module: mod,
}: {
  userId: string;
  topicId: string;
  module: TopicModuleRow;
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [target, setTarget] = useState('10');
  const [unit, setUnit] = useState('hrs');

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', userId, topicId],
    queryFn: () => listGoals(createClient(), userId, topicId),
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    ]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createGoal(createClient(), userId, {
      topic_id: topicId,
      module_id: mod.id,
      title: title.trim(),
      period_type: period,
      target_value: Math.max(1, Number(target)),
      unit: unit.trim(),
    });
    setTitle('');
    await refresh();
    pushToast({ kind: 'success', title: 'Goal created' });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{mod.name}</h2>
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={handleCreate}
            className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-12"
          >
            <label className="grid min-w-0 gap-1 text-sm font-medium xl:col-span-5">
              Goal title
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goal title (e.g., 20 study hours)…"
                required
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium xl:col-span-2">
              Repeat
              <NativeSelect
                value={period}
                onChange={(e) => setPeriod(e.target.value as typeof period)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </NativeSelect>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium xl:col-span-2">
              Target
              <Input
                type="number"
                min={1}
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium xl:col-span-1">
              Unit
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
            </label>
            <Button type="submit" className="xl:col-span-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Goal
            </Button>
          </form>
        </CardContent>
      </Card>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" aria-hidden="true" />}
          title="No goals configured"
          description="Set measurable daily, weekly, monthly, or milestone targets above."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = Math.min(
              100,
              Math.round((g.current_value / Math.max(1, g.target_value)) * 100),
            );
            return (
              <Card key={g.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="break-words font-semibold">{g.title}</h3>
                      <p className="text-xs capitalize text-muted-foreground">
                        {g.period_type} •{' '}
                        <span className="font-mono tabular-nums">
                          {g.current_value} / {g.target_value} {g.unit}
                        </span>
                      </p>
                    </div>
                    <Badge variant={g.status === 'completed' ? 'success' : 'primary'}>{pct}%</Badge>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={g.title}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await updateGoalProgress(
                            createClient(),
                            userId,
                            g.id,
                            g.current_value + 1,
                            g.target_value,
                            g.version,
                          );
                          await refresh();
                        }}
                      >
                        +1
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await updateGoalProgress(
                            createClient(),
                            userId,
                            g.id,
                            Math.max(0, g.current_value - 1),
                            g.target_value,
                            g.version,
                          );
                          await refresh();
                        }}
                      >
                        -1
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete goal ${g.title}`}
                      onClick={async () => {
                        await deleteGoal(createClient(), userId, g.id);
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HabitsModule({
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

  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<'daily' | 'weekdays'>('daily');
  const todayKey = useMemo(() => getLocalDateKey(new Date(), timezone), [timezone]);

  const { data } = useQuery({
    queryKey: ['habits', userId, topicId],
    queryFn: () => listHabitsAndCheckins(createClient(), userId, topicId),
  });

  const habits = data?.habits ?? [];
  const checkins = useMemo(() => data?.checkins ?? [], [data?.checkins]);

  const heatmapCounts = useMemo(() => {
    const map = new Map<string, number>();
    checkins.forEach((c) => {
      map.set(c.checkin_date, (map.get(c.checkin_date) ?? 0) + 1);
    });
    return map;
  }, [checkins]);

  function computeStreak(habitId: string): number {
    const dates = new Set(
      checkins.filter((c) => c.habit_id === habitId).map((c) => c.checkin_date),
    );
    let streak = 0;
    const cursor = new Date(`${todayKey}T00:00:00Z`);
    if (!dates.has(todayKey)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['habits'] }),
      queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
    ]);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{mod.name}</h2>

      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return;
              await createHabit(createClient(), userId, {
                topic_id: topicId,
                module_id: mod.id,
                title: title.trim(),
                schedule_type: schedule,
              });
              setTitle('');
              await refresh();
              pushToast({ kind: 'success', title: 'Habit added' });
            }}
            className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <label className="grid gap-1 text-sm font-medium">
              Habit name
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New habit (e.g., 30 min vocabulary review)…"
                required
                className="flex-1"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Repeat
              <NativeSelect
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as 'daily' | 'weekdays')}
                className="sm:w-36"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
              </NativeSelect>
            </label>
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Habit
            </Button>
          </form>
        </CardContent>
      </Card>

      {habits.length === 0 ? (
        <EmptyState
          icon={<Flame className="h-5 w-5" aria-hidden="true" />}
          title="No habits tracked yet"
          description="Add a recurring habit to track daily check-ins, streaks, and your consistency heatmap."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2.5">
            {habits.map((h) => {
              const checkedToday = checkins.some(
                (c) => c.habit_id === h.id && c.checkin_date === todayKey,
              );
              const streak = computeStreak(h.id);
              return (
                <Card key={h.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="break-words font-semibold">{h.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {h.schedule_type} • Streak:{' '}
                        <span className="font-mono font-semibold text-foreground tabular-nums">
                          {streak}d
                        </span>
                      </p>
                    </div>
                    <Button
                      aria-pressed={checkedToday}
                      variant={checkedToday ? 'default' : 'outline'}
                      size="sm"
                      onClick={async () => {
                        await toggleHabitCheckin(
                          createClient(),
                          userId,
                          topicId,
                          h.id,
                          todayKey,
                          !checkedToday,
                        );
                        await refresh();
                      }}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      {checkedToday ? 'Done Today' : 'Check In'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>84-Day Consistency Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <HabitCalendarHeatmap datesMap={heatmapCounts} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
