'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckSquare,
  Clock,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  NotebookPen,
  Pin,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/state-views';
import { TopicIcon } from '@/components/shared/topic-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, NativeSelect } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import {
  formatDateInZone,
  formatDateTimeInZone,
  formatDurationSeconds,
} from '@/lib/utilities/dates';
import {
  fetchGlobalDashboardSummary,
  saveGlobalDashboardWidgets,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { DashboardWidgetRow, GlobalDashboardSummary, TopicSummaryItem } from '@/types/domain';

import { AnalyticsChartCard } from '@/components/charts/analytics-charts';

interface WidgetPref {
  id: string;
  widget_type: string;
  title: string;
  is_visible: boolean;
  sort_order: number;
}

const DEFAULT_WIDGETS: WidgetPref[] = [
  {
    id: 'w-kpis',
    widget_type: 'kpis',
    title: 'Workspace Metrics',
    is_visible: true,
    sort_order: 0,
  },
  {
    id: 'w-chart',
    widget_type: 'activity_chart',
    title: 'Activity & Focus Trend',
    is_visible: true,
    sort_order: 1,
  },
  {
    id: 'w-topics',
    widget_type: 'topics_grid',
    title: 'Active & Pinned Topics',
    is_visible: true,
    sort_order: 2,
  },
  {
    id: 'w-deadlines',
    widget_type: 'deadlines_and_journals',
    title: 'Upcoming Deadlines & Journals',
    is_visible: true,
    sort_order: 3,
  },
  {
    id: 'w-timeline',
    widget_type: 'recent_activity',
    title: 'Recent Topic Activity',
    is_visible: true,
    sort_order: 4,
  },
];

function SortableWidgetFrame({
  widget,
  customizing,
  isFirst,
  isLast,
  onMove,
  onToggleVisibility,
  children,
}: {
  widget: WidgetPref;
  customizing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggleVisibility: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: widget.id,
    disabled: !customizing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!widget.is_visible && !customizing) return null;

  return (
    <div ref={setNodeRef} style={style} className={!widget.is_visible ? 'opacity-50' : ''}>
      {customizing ? (
        <div className="mb-2 flex items-center justify-between rounded-md border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Drag ${widget.title}`}
              className="cursor-grab text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="font-semibold">{widget.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={isFirst}
              aria-label="Move widget up"
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={isLast}
              aria-label="Move widget down"
              onClick={() => onMove(1)}
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={widget.is_visible ? 'Hide widget' : 'Show widget'}
              onClick={onToggleVisibility}
            >
              {widget.is_visible ? (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function TopicDomainCard({ topic }: { topic: TopicSummaryItem }) {
  const features = topic.enabled_features ?? [];
  const isFinance = features.includes('expense_tracking');
  const isCalc = features.includes('calculators');
  const hasTasks = features.includes('tasks');
  const hasTime = features.includes('time_tracking');
  const hasRecords = features.includes('custom_tables') || features.includes('custom_forms');
  const hasGoals = features.includes('goals');

  const taskPct =
    topic.total_tasks > 0 ? Math.round((topic.completed_tasks / topic.total_tasks) * 100) : 0;

  return (
    <Link
      href={`/topics/${topic.slug}`}
      className="group block min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: topic.accent_color }}
          >
            <TopicIcon name={topic.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold group-hover:text-primary">{topic.name}</h3>
            <p className="text-xs capitalize text-muted-foreground">{topic.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {topic.is_pinned ? (
            <Pin className="h-3.5 w-3.5 text-primary" aria-label="Pinned" />
          ) : null}
          {topic.is_favorite ? (
            <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-label="Favorite" />
          ) : null}
        </div>
      </div>

      {/* Domain-aware metrics tailored to enabled modules */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-border pt-3 text-xs">
        {isFinance ? (
          <>
            <div>
              <span className="text-muted-foreground">Income / Expense</span>
              <p className="mt-0.5 font-mono font-semibold tabular-nums">
                +${topic.finance_income.toFixed(0)} / -${topic.finance_expense.toFixed(0)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Net Balance</span>
              <p className="mt-0.5 font-mono font-semibold tabular-nums">
                ${(topic.finance_income - topic.finance_expense).toFixed(2)}
              </p>
            </div>
          </>
        ) : (
          <>
            {hasTime ? (
              <div>
                <span className="text-muted-foreground">Study / Focus Time</span>
                <p className="mt-0.5 font-mono font-semibold tabular-nums">
                  {formatDurationSeconds(topic.tracked_seconds)}
                </p>
              </div>
            ) : null}
            {hasTasks ? (
              <div>
                <span className="text-muted-foreground">Tasks ({taskPct}%)</span>
                <p className="mt-0.5 font-mono font-semibold tabular-nums">
                  {topic.completed_tasks} / {topic.total_tasks}
                </p>
              </div>
            ) : null}
            {hasRecords ? (
              <div>
                <span className="text-muted-foreground">Logged Records</span>
                <p className="mt-0.5 font-mono font-semibold tabular-nums">{topic.record_count}</p>
              </div>
            ) : null}
            {isCalc ? (
              <div>
                <span className="text-muted-foreground">Calculations</span>
                <p className="mt-0.5 font-mono font-semibold tabular-nums">
                  {topic.calculation_count}
                </p>
              </div>
            ) : null}
            {hasGoals ? (
              <div>
                <span className="text-muted-foreground">Goal Progress</span>
                <p className="mt-0.5 font-mono font-semibold tabular-nums">
                  {topic.goal_progress_pct}%
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Link>
  );
}

export function GlobalDashboardClient({
  userId,
  appName,
  timezone,
  initialDays,
  initialSummary,
  initialWidgets,
}: {
  userId: string;
  appName: string;
  timezone: string;
  initialDays: number;
  initialSummary: GlobalDashboardSummary;
  initialWidgets: DashboardWidgetRow[];
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [days, setDays] = useState(initialDays);
  const [topicFilter, setTopicFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [customizing, setCustomizing] = useState(false);

  const [widgets, setWidgets] = useState<WidgetPref[]>(() =>
    initialWidgets.length > 0
      ? initialWidgets.map((w) => ({
          id: w.id,
          widget_type: w.widget_type,
          title: w.title,
          is_visible: w.is_visible,
          sort_order: w.sort_order,
        }))
      : DEFAULT_WIDGETS,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: summary = initialSummary } = useQuery({
    queryKey: ['dashboard-summary', userId, days, timezone],
    queryFn: () => fetchGlobalDashboardSummary(createClient(), days, timezone),
    initialData: days === initialDays ? initialSummary : undefined,
  });

  const activeTopics = useMemo(() => {
    const q = topicFilter.trim().toLowerCase();
    return (summary.topic_summaries ?? []).filter((t) => {
      if (t.status !== 'active') return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [summary.topic_summaries, topicFilter, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set((summary.topic_summaries ?? []).map((t) => t.category));
    return Array.from(set);
  }, [summary.topic_summaries]);

  const chartData = useMemo(
    () =>
      (summary.daily_series ?? []).map((d) => ({
        day: d.day.slice(5),
        minutes: Number(d.minutes_tracked),
        tasks: Number(d.tasks_completed),
        events: Number(d.activity_count),
      })),
    [summary.daily_series],
  );

  async function persistWidgets(nextWidgets: WidgetPref[]) {
    setWidgets(nextWidgets);
    try {
      await saveGlobalDashboardWidgets(
        createClient(),
        userId,
        nextWidgets.map((w, idx) => ({
          widget_type: w.widget_type,
          title: w.title,
          sort_order: idx,
          is_visible: w.is_visible,
          layout: { colSpan: 1, rowSpan: 1 },
        })),
      );
      pushToast({ kind: 'success', title: 'Dashboard layout saved' });
    } catch {
      pushToast({ kind: 'error', title: 'Failed saving widget preferences' });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex((w) => w.id === active.id);
    const newIndex = widgets.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(widgets, oldIndex, newIndex).map((w, idx) => ({
      ...w,
      sort_order: idx,
    }));
    void persistWidgets(reordered);
  }

  function renderWidgetBody(widgetType: string) {
    switch (widgetType) {
      case 'kpis':
        return (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
            {[
              {
                label: 'Active topics',
                icon: Layers,
                value: summary.counts.active_topics,
                detail: `${summary.counts.archived_topics} archived`,
              },
              {
                label: 'Tasks today',
                icon: CheckSquare,
                value: summary.counts.tasks_today,
                detail: `${summary.counts.tasks_pending} pending · ${summary.counts.tasks_overdue} overdue`,
              },
              {
                label: 'Focus today',
                icon: Clock,
                value: formatDurationSeconds(summary.counts.seconds_tracked_today),
                detail: `7d: ${formatDurationSeconds(summary.counts.seconds_tracked_week)} · 30d: ${formatDurationSeconds(summary.counts.seconds_tracked_month)}`,
              },
              {
                label: 'Tasks completed',
                icon: CalendarClock,
                value: summary.counts.tasks_completed,
                detail: `${summary.counts.goals_avg_progress}% average goal progress`,
              },
            ].map(({ label, icon: Icon, value, detail }) => (
              <Card key={label}>
                <CardContent className="flex h-full flex-col items-start gap-1 p-3.5 sm:p-5">
                  <Icon size={18} className="mb-1.5 text-accent" aria-hidden="true" />
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="break-words font-serif text-[clamp(1.4rem,3vw,2.2rem)] leading-tight tabular-nums">
                    {value}
                  </p>
                  <p className="mt-auto pt-1 text-xs leading-relaxed text-muted-foreground">
                    {detail}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'activity_chart':
        return (
          <AnalyticsChartCard
            title={`Workspace Activity — Last ${days} Days`}
            subtitle="Time tracked, tasks completed, and logged events across active topics"
            data={chartData}
            xKey="day"
            series={[
              { key: 'minutes', label: 'Minutes Tracked' },
              { key: 'tasks', label: 'Tasks Completed' },
              { key: 'events', label: 'Activity Events' },
            ]}
          />
        );

      case 'topics_grid':
        return (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Your Topics ({activeTopics.length})</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Filter dashboard topics"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  placeholder="Filter topics…"
                  className="w-44"
                />
                <NativeSelect
                  aria-label="Filter dashboard by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-36"
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {activeTopics.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-5 w-5" aria-hidden="true" />}
                title="Create your first topic mini-app"
                description="Use the dynamic topic builder to launch IELTS prep, personal finance, AI engineering, or any custom workspace."
                action={
                  <Link
                    href="/topics/new"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Topic
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeTopics.map((topic) => (
                  <TopicDomainCard key={topic.id} topic={topic} />
                ))}
              </div>
            )}
          </section>
        );

      case 'deadlines_and_journals':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.upcoming_deadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending task deadlines.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {summary.upcoming_deadlines.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.title}</p>
                          <p className="text-xs text-muted-foreground">{d.topic_name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={d.priority === 'urgent' ? 'destructive' : 'outline'}>
                            {d.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatDateInZone(d.due_at, timezone)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-primary" aria-hidden="true" />
                  Recent Journal Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.recent_journals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No journal entries published yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {summary.recent_journals.map((j) => (
                      <div
                        key={j.id}
                        className="flex items-center justify-between gap-2 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{j.title || j.entry_date}</p>
                          <p className="text-xs text-muted-foreground">
                            {j.topic_name} {j.mood ? `• ${j.mood}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {formatDateInZone(j.entry_date, timezone)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'recent_activity':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.recent_activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Activity across your topics will appear here automatically.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {summary.recent_activities.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.topic_name} • {a.category}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDateTimeInZone(a.occurred_at, timezone)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <section className="border-b border-border pb-5">
        <p className="desk-dateline mb-1" translate="no">
          {appName}
        </p>
        <h1 className="break-words font-serif text-3xl tracking-tight text-foreground sm:text-5xl">
          Workspace review
        </h1>
        <div className="mt-5 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <NativeSelect
            aria-label="Global date range"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            className="min-h-11 w-full sm:w-40"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 365 days</option>
          </NativeSelect>
          <Button
            variant={customizing ? 'default' : 'outline'}
            size="touch"
            aria-pressed={customizing}
            aria-label={customizing ? 'Finish customizing widgets' : 'Customize widgets'}
            onClick={() => setCustomizing((prev) => !prev)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {customizing ? 'Done' : 'Customize'}
          </Button>
          {customizing ? (
            <Button variant="ghost" size="sm" onClick={() => void persistWidgets(DEFAULT_WIDGETS)}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          ) : null}
          <Link
            href="/topics/new"
            className="hidden min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Topic
          </Link>
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          <div className="min-w-0 space-y-6">
            {widgets.map((widget, idx) => (
              <SortableWidgetFrame
                key={widget.id}
                widget={widget}
                customizing={customizing}
                isFirst={idx === 0}
                isLast={idx === widgets.length - 1}
                onMove={(dir) => {
                  const nextIdx = idx + dir;
                  if (nextIdx < 0 || nextIdx >= widgets.length) return;
                  void persistWidgets(arrayMove(widgets, idx, nextIdx));
                }}
                onToggleVisibility={() => {
                  const next = widgets.map((w) =>
                    w.id === widget.id ? { ...w, is_visible: !w.is_visible } : w,
                  );
                  void persistWidgets(next);
                }}
              >
                {renderWidgetBody(widget.widget_type)}
              </SortableWidgetFrame>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
