'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Clock, Plus } from 'lucide-react';
import { EmptyState } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatDateInZone } from '@/lib/utilities/dates';
import { createActivityLog, listActivityLogs } from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { ActivityLogRow, TopicRow } from '@/types/domain';

export function ActivityFeedClient({
  userId,
  timezone,
  topics,
  initialLogs,
}: {
  userId: string;
  timezone: string;
  topics: TopicRow[];
  initialLogs?: ActivityLogRow[];
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [logging, setLogging] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id ?? '');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    data: logs = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['activity-logs', userId, topicFilter],
    queryFn: () =>
      listActivityLogs(createClient(), userId, {
        topicId: topicFilter === 'all' ? undefined : topicFilter,
        limit: 80,
      }),
    initialData: topicFilter === 'all' ? initialLogs : undefined,
  });

  const topicMap = new Map(topics.map((t) => [t.id, t]));

  const days = new Map<string, ActivityLogRow[]>();
  for (const entry of logs) {
    const day = formatDateInZone(entry.occurred_at, timezone, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const group = days.get(day);
    if (group) group.push(entry);
    else days.set(day, [entry]);
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTopicId || !title.trim()) return;
    setSaving(true);
    try {
      await createActivityLog(createClient(), userId, {
        topic_id: selectedTopicId,
        title: title.trim(),
        category: 'manual_log',
        duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      });
      setTitle('');
      setDurationMinutes('');
      setLogging(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activity-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ]);
      pushToast({ kind: 'success', title: 'Activity recorded' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Unable to log activity',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl tracking-tight">Activity timeline</h1>
        {topics.length > 0 && (
          <Dialog open={logging} onOpenChange={setLogging}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} aria-hidden="true" /> Log activity
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Log activity"
              description="Add a moment to your topic’s timeline."
            >
              <form onSubmit={handleLogActivity} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="logTitle">Activity summary</Label>
                  <Input
                    id="logTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What did you work on?"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="logTopic">Topic</Label>
                  <NativeSelect
                    id="logTopic"
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                  >
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="log-duration">Duration in minutes (optional)</Label>
                  <Input
                    id="log-duration"
                    type="number"
                    min={0}
                    max={1440}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Saving…' : 'Save activity'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <Label htmlFor="activityTopicFilter">Show activity from</Label>
        <NativeSelect
          id="activityTopicFilter"
          className="sm:w-56"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      {isPending ? (
        <p role="status">Loading activity…</p>
      ) : isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <span>Activity couldn’t load.</span>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Activity size={20} aria-hidden="true" />}
          title="No activity here yet"
          description={
            topics.length
              ? 'Log an activity or complete a task to start this timeline.'
              : 'Create a topic to start tracking your work.'
          }
          action={
            !topics.length && (
              <Link
                href="/topics/new"
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Create topic
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-7">
          {Array.from(days, ([day, entries]) => (
            <section key={day} className="grid gap-x-6 gap-y-3 md:grid-cols-[10rem_1fr]">
              <h2 className="pt-1 text-sm font-semibold leading-relaxed">{day}</h2>
              <ol className="divide-y divide-border border-l border-border pl-5">
                {entries.map((entry) => {
                  const topic = topicMap.get(entry.topic_id);
                  return (
                    <li key={entry.id} className="relative space-y-1 py-3 first:pt-0">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.55rem] top-4 size-2 rounded-full bg-primary ring-4 ring-background"
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={entry.occurred_at}>
                          {formatDateInZone(entry.occurred_at, timezone, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                        {entry.duration_minutes != null && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} aria-hidden="true" />
                            {entry.duration_minutes} min
                          </span>
                        )}
                      </div>
                      <p className="break-words text-base font-semibold">{entry.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {topic && (
                          <Link
                            href={`/topics/${topic.slug}`}
                            className="inline-flex min-h-8 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: topic.accent_color }}
                              aria-hidden="true"
                            />
                            {topic.name}
                          </Link>
                        )}
                        <Badge variant="outline">{entry.source}</Badge>
                        <span>{entry.category.replaceAll('_', ' ')}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
