'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatDateInZone, formatDateTimeInZone, getLocalDateKey } from '@/lib/utilities/dates';
import {
  createCalendarEvent,
  listCalendarEvents,
  listTopicTasks,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';

export function CalendarModule({
  userId,
  topicId,
  moduleId,
  timezone,
}: {
  userId: string;
  topicId: string;
  moduleId?: string;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [reminderMin, setReminderMin] = useState('15');
  const [saving, setSaving] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', userId, topicId],
    queryFn: () => listCalendarEvents(createClient(), userId, topicId),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', userId, topicId, 'calendar'],
    queryFn: () => listTopicTasks(createClient(), userId, topicId, { pageSize: 100 }),
  });

  const upcomingItems = useMemo(() => {
    const items: Array<{ id: string; kind: 'event' | 'task'; title: string; date: string }> = [];
    events.forEach((ev) =>
      items.push({ id: ev.id, kind: 'event', title: ev.title, date: ev.starts_at }),
    );
    (tasksData?.tasks ?? []).forEach((t) => {
      if (t.due_at) items.push({ id: t.id, kind: 'task', title: t.title, date: t.due_at });
    });
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, tasksData]);

  const todayKey = getLocalDateKey(new Date(), timezone);
  const monthKey = todayKey.slice(0, 7);
  const monthStart = new Date(monthKey + '-01T00:00:00Z');
  const monthDays = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    const count = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
    const grouped = new Map<string, typeof upcomingItems>();
    for (const item of upcomingItems) {
      const key = getLocalDateKey(new Date(item.date), timezone);
      const entries = grouped.get(key) ?? [];
      entries.push(item);
      grouped.set(key, entries);
    }
    return Array.from({ length: count }, (_, index) => {
      const day = index + 1;
      const key = monthKey + '-' + String(day).padStart(2, '0');
      return { day, key, items: grouped.get(key) ?? [] };
    });
  }, [upcomingItems, timezone, monthKey]);
  const occupiedDays = monthDays.filter((cell) => cell.items.length);
  const futureItems = upcomingItems.filter(
    (item) => getLocalDateKey(new Date(item.date), timezone) >= todayKey,
  );

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const start = new Date(startsAt);
      const end = new Date(start.getTime() + 60 * 60_000);
      await createCalendarEvent(createClient(), userId, {
        topic_id: topicId,
        module_id: moduleId ?? null,
        title: title.trim(),
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        reminder_minutes: reminderMin ? Number(reminderMin) : null,
      });
      setTitle('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
      ]);
      pushToast({ kind: 'success', title: 'Event & in-app reminder scheduled' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Unable to add event',
        description: err instanceof Error ? err.message : 'Check date/time.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            Schedule Event &amp; In-App Reminder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAddEvent}
            className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-12"
          >
            <div className="min-w-0 space-y-1 xl:col-span-4">
              <Label htmlFor="cal-title">Event title</Label>
              <Input
                id="cal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mock test slot or review session…"
                required
              />
            </div>
            <div className="min-w-0 space-y-1 xl:col-span-4">
              <Label htmlFor="cal-start">Start (device time)</Label>
              <Input
                id="cal-start"
                type="datetime-local"
                aria-label="Start date and time"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="min-w-0 space-y-1 xl:col-span-2">
              <Label htmlFor="cal-reminder">Reminder (minutes before)</Label>
              <Input
                id="cal-reminder"
                type="number"
                min={0}
                aria-label="Reminder minutes before"
                value={reminderMin}
                onChange={(e) => setReminderMin(e.target.value)}
                placeholder="Reminder (min)"
              />
            </div>
            <Button type="submit" disabled={saving} className="min-w-0 space-y-1 xl:col-span-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Schedule
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>
              {formatDateInZone(monthStart, 'UTC', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:hidden">
              {occupiedDays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events or deadlines this month.</p>
              ) : (
                occupiedDays.map((cell) => (
                  <div
                    key={cell.key}
                    className="grid grid-cols-[3rem_1fr] gap-3 border-b border-border pb-3 last:border-0"
                  >
                    <time
                      dateTime={cell.key}
                      className="self-start rounded-lg bg-muted p-2 text-center text-xs"
                    >
                      {formatDateInZone(cell.key + 'T00:00:00Z', 'UTC', { weekday: 'short' })}
                      <span className="block text-lg font-semibold">{cell.day}</span>
                    </time>
                    <ul className="space-y-2">
                      {cell.items.map((item) => (
                        <li key={item.kind + item.id} className="break-words text-sm">
                          <span className="block font-medium">{item.title}</span>
                          <span className="text-xs capitalize text-muted-foreground">
                            {item.kind} ·{' '}
                            {formatDateInZone(item.date, timezone, {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
            <div className="hidden grid-cols-7 gap-1.5 sm:grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span key={day} className="text-center text-xs text-muted-foreground">
                  {day}
                </span>
              ))}
              {Array.from({ length: monthStart.getUTCDay() }, (_, i) => (
                <span key={'pad' + i} aria-hidden="true" />
              ))}
              {monthDays.map((cell) => (
                <div
                  key={cell.key}
                  className="min-h-16 rounded-md border border-border bg-background p-1.5 text-xs"
                >
                  <span className="font-mono font-semibold tabular-nums">{cell.day}</span>
                  <div className="mt-1 space-y-0.5">
                    {cell.items.slice(0, 2).map((it) => (
                      <div
                        key={it.id}
                        className="truncate rounded bg-primary/15 px-1 py-0.5 text-[10px] font-medium text-primary"
                        title={it.title}
                      >
                        {it.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Upcoming Schedule ({futureItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {futureItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No scheduled events or task deadlines yet.
              </p>
            ) : (
              futureItems.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-md border border-border p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{item.title}</span>
                    <Badge variant={item.kind === 'event' ? 'primary' : 'outline'}>
                      {item.kind}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatDateTimeInZone(item.date, timezone)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
