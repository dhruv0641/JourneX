'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  CheckSquare,
  Clock,
  FileText,
  Pin,
  Settings,
  Star,
  Target,
} from 'lucide-react';
import { Skeleton } from '@/components/shared/state-views';
import { TopicIcon } from '@/components/shared/topic-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarModule } from '@/features/calendar/calendar-module';
import { CalculatorsModule } from '@/features/calculators/calculators-module';
import { CustomRecordsModule } from '@/features/custom-records/custom-records-module';
import { GoalsModule, HabitsModule } from '@/features/goals/goals-habits-module';
import { JournalModule } from '@/features/journal/journal-module';
import { TasksModule } from '@/features/tasks/tasks-module';
import { TimeTrackingModule } from '@/features/time-tracking/time-tracking-module';
import { AttachmentsModule } from '@/features/topics/attachments-module';
import { TopicSettingsPanel } from '@/features/topics/topic-settings-panel';
import { createClient } from '@/lib/supabase/client';
import { formatDurationSeconds } from '@/lib/utilities/dates';
import { fetchTopicAnalyticsSummary } from '@/services/modules.service';
import { fetchTopicDetailBySlug, type TopicDetailBundle } from '@/services/topics.service';
import type { TopicAnalyticsSummary, TopicModuleRow } from '@/types/domain';

const AnalyticsChartCard = dynamic(
  () => import('@/components/charts/analytics-charts').then((m) => m.AnalyticsChartCard),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

export function TopicWorkspaceClient({
  userId,
  timezone,
  initialBundle,
  initialAnalytics,
  initialTab,
}: {
  userId: string;
  timezone: string;
  initialBundle: TopicDetailBundle;
  initialAnalytics: TopicAnalyticsSummary;
  initialTab?: string;
}) {
  const { data: bundle = initialBundle, refetch: refetchBundle } = useQuery({
    queryKey: ['topic-detail', initialBundle.topic.slug],
    queryFn: async () => {
      const fresh = await fetchTopicDetailBySlug(
        createClient(),
        userId,
        initialBundle.topic.slug,
      );
      return fresh ?? initialBundle;
    },
    initialData: initialBundle,
  });

  const { data: analytics = initialAnalytics } = useQuery({
    queryKey: ['topic-analytics', bundle.topic.id, timezone],
    queryFn: () => fetchTopicAnalyticsSummary(createClient(), bundle.topic.id, 30, timezone),
    initialData: initialAnalytics,
  });

  const enabledModules = bundle.modules.filter((m) => m.is_enabled);
  const defaultTab = initialTab || 'overview';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const chartSeries = analytics.daily_series.map((d) => ({
    day: d.day.slice(5),
    minutes: Number(d.minutes_tracked),
    tasks: Number(d.tasks_completed),
    records: Number(d.records_logged),
  }));

  function renderModule(mod: TopicModuleRow) {
    const modFields = bundle.fields.filter((f) => f.module_id === mod.id);
    switch (mod.feature_key) {
      case 'tasks':
        return (
          <TasksModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            module={mod}
            timezone={timezone}
          />
        );
      case 'journal':
      case 'notes':
        return (
          <JournalModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            module={mod}
            timezone={timezone}
          />
        );
      case 'time_tracking':
        return (
          <TimeTrackingModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            module={mod}
            timezone={timezone}
          />
        );
      case 'custom_tables':
      case 'custom_forms':
      case 'lists':
      case 'expense_tracking':
        return (
          <CustomRecordsModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            module={mod}
            fields={modFields}
            timezone={timezone}
          />
        );
      case 'calculators':
        return (
          <CalculatorsModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            module={mod}
            calculators={bundle.calculators}
            versions={bundle.calculatorVersions}
            timezone={timezone}
            onReloadTopic={() => void refetchBundle()}
          />
        );
      case 'goals':
        return (
          <GoalsModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            module={mod}
          />
        );
      case 'habits':
        return (
          <HabitsModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            module={mod}
            timezone={timezone}
          />
        );
      case 'calendar':
        return (
          <CalendarModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            moduleId={mod.id}
            timezone={timezone}
          />
        );
      case 'attachments':
        return (
          <AttachmentsModule
            key={mod.id}
            userId={userId}
            topicId={bundle.topic.id}
            timezone={timezone}
          />
        );
      case 'charts':
      case 'statistics':
        return (
          <AnalyticsChartCard
            key={mod.id}
            title={mod.name}
            subtitle="30-day authoritative PostgreSQL trend"
            data={chartSeries}
            xKey="day"
            series={[
              { key: 'minutes', label: 'Minutes Tracked' },
              { key: 'tasks', label: 'Tasks Done' },
              { key: 'records', label: 'Records Logged' },
            ]}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Topic Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: bundle.topic.accent_color }}
          >
            <TopicIcon name={bundle.topic.icon} className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {bundle.topic.name}
              </h1>
              <Badge variant="outline" className="capitalize">
                {bundle.topic.category}
              </Badge>
              {bundle.topic.status === 'archived' ? (
                <Badge variant="warning">
                  <Archive className="h-3 w-3" aria-hidden="true" />
                  Archived
                </Badge>
              ) : null}
              {bundle.topic.is_pinned ? (
                <Pin className="h-3.5 w-3.5 text-primary" aria-label="Pinned" />
              ) : null}
              {bundle.topic.is_favorite ? (
                <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-label="Favorite" />
              ) : null}
            </div>
            {bundle.topic.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{bundle.topic.description}</p>
            ) : null}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => setActiveTab('configure')}>
          <Settings className="h-4 w-4" aria-hidden="true" />
          Customize Topic
        </Button>
      </div>

      {/* Topic Workspace Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {enabledModules.map((mod) => (
            <TabsTrigger key={mod.id} value={mod.id}>
              <TopicIcon name={mod.icon} className="h-3.5 w-3.5" />
              {mod.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Real KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tasks Completed</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {analytics.summary.completed_tasks} / {analytics.summary.total_tasks}
                  </p>
                </div>
                <CheckSquare className="h-5 w-5 text-primary" aria-hidden="true" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">30-Day Focus Time</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {formatDurationSeconds(analytics.summary.total_tracked_seconds)}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Entries &amp; Logs</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {analytics.summary.custom_records_count + analytics.summary.journal_entries_count}
                  </p>
                </div>
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Goal Progress</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {analytics.summary.avg_goal_progress_pct}%
                  </p>
                </div>
                <Target className="h-5 w-5 text-primary" aria-hidden="true" />
              </CardContent>
            </Card>
          </div>

          <AnalyticsChartCard
            title={`${bundle.topic.name} — 30-Day Activity & Study Trend`}
            subtitle="Calculated from persisted PostgreSQL sessions, tasks, and custom records"
            data={chartSeries}
            xKey="day"
            series={[
              { key: 'minutes', label: 'Minutes Tracked' },
              { key: 'tasks', label: 'Tasks Completed' },
              { key: 'records', label: 'Records Logged' },
            ]}
          />

          {/* Quick Module Previews inside Overview */}
          <div className="space-y-6">
            {enabledModules
              .filter((m) => !['charts', 'statistics', 'activity_logs'].includes(m.feature_key))
              .slice(0, 3)
              .map((m) => (
                <div key={m.id} className="rounded-xl border border-border bg-card/50 p-4">
                  {renderModule(m)}
                </div>
              ))}
          </div>
        </TabsContent>

        {enabledModules.map((mod) => (
          <TabsContent key={mod.id} value={mod.id}>
            {renderModule(mod)}
          </TabsContent>
        ))}

        <TabsContent value="files">
          <AttachmentsModule userId={userId} topicId={bundle.topic.id} timezone={timezone} />
        </TabsContent>

        <TabsContent value="configure">
          <TopicSettingsPanel
            userId={userId}
            bundle={bundle}
            onReload={() => void refetchBundle()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
