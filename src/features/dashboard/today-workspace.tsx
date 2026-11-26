'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, Layers, Pin } from 'lucide-react';
import { TopicIcon } from '@/components/shared/topic-icon';
import { createClient } from '@/lib/supabase/client';
import { formatDateInZone, formatDurationSeconds } from '@/lib/utilities/dates';
import { fetchGlobalDashboardSummary } from '@/services/modules.service';
import type { GlobalDashboardSummary } from '@/types/domain';

function ActivityWeek({
  series,
  localDate,
}: {
  series: GlobalDashboardSummary['daily_series'];
  localDate: string;
}) {
  const byDay = new Map(series.map((row) => [row.day.slice(0, 10), Number(row.activity_count)]));
  const end = new Date(localDate + 'T12:00:00Z').getTime();
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(end - (6 - i) * 86400000);
    const day = date.toISOString().slice(0, 10);
    return {
      day,
      label: date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
      count: byDay.get(day) ?? 0,
    };
  });
  const peak = Math.max(1, ...week.map((d) => d.count));
  return (
    <figure className="week-history">
      <figcaption>Activity · Last 7 days</figcaption>
      <ol>
        {week.map(({ day, label, count }) => (
          <li key={day} title={`${day}: ${count} activities`}>
            <span className="sr-only">
              {day}: {count} activities
            </span>
            <span aria-hidden="true">{count}</span>
            <div aria-hidden="true" className="week-column">
              <i style={{ height: `${(count * 100) / peak}%` }} />
            </div>
            <span aria-hidden="true">{label}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function TodayWorkspace({
  userId,
  timezone,
  initialSummary,
  initialDate,
}: {
  userId: string;
  timezone: string;
  initialSummary: GlobalDashboardSummary;
  initialDate: string;
}) {
  const { data: summary = initialSummary } = useQuery({
    queryKey: ['dashboard-summary', userId, 7, timezone],
    queryFn: () => fetchGlobalDashboardSummary(createClient(), 7, timezone),
    initialData: initialSummary,
  });
  const topics = summary.topic_summaries
    .filter((topic) => topic.status === 'active')
    .sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at),
    );
  const deadlines = summary.upcoming_deadlines;
  const localDate = summary.daily_series.at(-1)?.day.slice(0, 10) ?? initialDate;
  const dateLabel = formatDateInZone(localDate + 'T12:00:00Z', 'UTC', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return (
    <div className="today-workspace">
      <header className="desk-masthead">
        <div>
          <p className="desk-dateline">{dateLabel}</p>
          <h1>Today</h1>
        </div>
      </header>
      <section className="daily-brief" aria-label="Daily summary">
        <div className="daily-metrics">
          <div>
            <p>
              <Clock size={15} aria-hidden="true" />
              Focus today
            </p>
            <strong>{formatDurationSeconds(summary.counts.seconds_tracked_today)}</strong>
          </div>
          <div>
            <p>
              <CalendarDays size={15} aria-hidden="true" />
              Tasks today
            </p>
            <strong>{summary.counts.tasks_today}</strong>
          </div>
        </div>
        <ActivityWeek series={summary.daily_series} localDate={localDate} />
        <Link href="/review" className="brief-review">
          Open review <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </section>
      <div className="desk-columns">
        <section aria-labelledby="desk-topics">
          <div className="desk-section-heading">
            <h2 id="desk-topics">Your topics</h2>
            <Link href="/topics">
              View all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="desk-list">
            {topics.slice(0, 5).map((topic) => (
              <Link
                key={topic.id}
                className="desk-entry"
                href={`/topics/${topic.slug}`}
                prefetch={false}
              >
                <span className="desk-icon" style={{ borderInlineStartColor: topic.accent_color }}>
                  <TopicIcon name={topic.icon} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{topic.name}</strong>
                  <span className="text-xs capitalize text-muted-foreground">{topic.category}</span>
                </span>
                {topic.is_pinned && <Pin size={15} aria-label="Pinned" />}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            ))}
            {!topics.length && (
              <div className="desk-first-topic">
                <Layers size={23} aria-hidden="true" />
                <h3>Start your first topic</h3>
                <p>Choose a project, class, or habit to organize here.</p>
                <Link className="desk-inline-link" href="/topics/new">
                  Choose a template <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </section>
        <section aria-labelledby="desk-agenda">
          <div className="desk-section-heading">
            <h2 id="desk-agenda">Upcoming</h2>
            <CalendarDays size={19} aria-hidden="true" className="text-accent" />
          </div>
          <div className="desk-list">
            {deadlines.slice(0, 5).map((item) => {
              const topic = topics.find((t) => t.id === item.topic_id);
              const row = (
                <>
                  <span className="min-w-0 flex-1">
                    <strong className="block break-words">{item.title}</strong>
                    <span className="text-xs text-muted-foreground">{item.topic_name}</span>
                  </span>
                  <time className="text-xs font-medium" dateTime={item.due_at}>
                    {formatDateInZone(item.due_at, timezone)}
                  </time>
                </>
              );
              return topic ? (
                <Link
                  key={item.id}
                  className="desk-entry"
                  href={`/topics/${topic.slug}?tab=tasks`}
                  prefetch={false}
                >
                  {row}
                </Link>
              ) : (
                <div className="desk-entry" key={item.id}>
                  {row}
                </div>
              );
            })}
            {!deadlines.length && (
              <div className="desk-first-topic">
                <h3>No upcoming deadlines</h3>
                <p>Tasks with a due date will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
