'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatDateTimeInZone, getLocalDateKey } from '@/lib/utilities/dates';
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
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
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

  const monthDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const key = getLocalDateKey(d, timezone);
      const dayItems = upcomingItems.filter(
        (item) => getLocalDateKey(new Date(item.date), timezone) === key,
      );
      return { day: i + 1, key, items: dayItems };
    });
  }, [upcomingItems, timezone]);

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
          <form onSubmit={handleAddEvent} className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <Label htmlFor="cal-title" className="sr-only">
                Event title
              </Label>
              <Input
                id="cal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mock test slot or review session…"
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                type="datetime-local"
                aria-label="Start date and time"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                type="number"
                min={0}
                aria-label="Reminder minutes before"
                value={reminderMin}
                onChange={(e) => setReminderMin(e.target.value)}
                placeholder="Reminder (min)"
              />
            </div>
            <Button type="submit" disabled={saving} className="sm:col-span-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Schedule
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5">
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
            <CardTitle>Upcoming Schedule ({upcomingItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {upcomingItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No scheduled events or task deadlines yet.
              </p>
            ) : (
              upcomingItems.slice(0, 10).map((item) => (
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
