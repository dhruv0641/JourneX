'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Clock, Plus } from 'lucide-react';
import { EmptyState } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatDateTimeInZone } from '@/lib/utilities/dates';
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
  initialLogs: ActivityLogRow[];
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id ?? '');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: logs = initialLogs } = useQuery({
    queryKey: ['activity-logs', userId, topicFilter],
    queryFn: () =>
      listActivityLogs(createClient(), userId, {
        topicId: topicFilter === 'all' ? undefined : topicFilter,
        limit: 80,
      }),
    initialData: topicFilter === 'all' ? initialLogs : undefined,
  });

  const topicMap = new Map(topics.map((t) => [t.id, t]));

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
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Timeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unified operational stream of manual entries and automatic topic milestones.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Label htmlFor="activityTopicFilter" className="sr-only">
            Filter by topic
          </Label>
          <NativeSelect
            id="activityTopicFilter"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
          >
            <option value="all">All Topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {topics.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Log Quick Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogActivity} className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <Label htmlFor="logTopic" className="sr-only">
                  Topic
                </Label>
                <NativeSelect
                  id="logTopic"
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="logTitle" className="sr-only">
                  Activity summary
                </Label>
                <Input
                  id="logTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Completed reading section 2 practice…"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  aria-label="Duration in minutes"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Min"
                  className="w-24"
                />
                <Button type="submit" disabled={saving} className="flex-1">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Log
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {logs.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-5 w-5" aria-hidden="true" />}
          title="No activity logged yet"
          description="Create a topic, complete tasks, track focus sessions, or log a manual entry to build your timeline."
          action={
            <Link
              href="/topics/new"
              className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Create Topic
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {logs.map((entry) => {
            const topic = topicMap.get(entry.topic_id);
            return (
              <Card key={entry.id}>
                <CardContent className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {topic ? (
                        <Link
                          href={`/topics/${topic.slug}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: topic.accent_color }}
                            aria-hidden="true"
                          />
                          {topic.name}
                        </Link>
                      ) : null}
                      <Badge variant={entry.source === 'manual' ? 'primary' : 'outline'}>
                        {entry.source}
                      </Badge>
                      <Badge variant="default">{entry.category}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">{entry.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground tabular-nums">
                    {entry.duration_minutes ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {entry.duration_minutes}m
                      </span>
                    ) : null}
                    <span>{formatDateTimeInZone(entry.occurred_at, timezone)}</span>
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
