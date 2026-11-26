import type { Database } from '@/types/database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row'];
export type TopicTemplateRow = Database['public']['Tables']['topic_templates']['Row'];
export type TopicRow = Database['public']['Tables']['topics']['Row'];
export type TopicModuleRow = Database['public']['Tables']['topic_modules']['Row'];
export type ModuleFieldRow = Database['public']['Tables']['module_fields']['Row'];
export type ModuleViewRow = Database['public']['Tables']['module_views']['Row'];
export type CustomRecordRow = Database['public']['Tables']['custom_records']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskChecklistItemRow = Database['public']['Tables']['task_checklist_items']['Row'];
export type JournalEntryRow = Database['public']['Tables']['journal_entries']['Row'];
export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
export type TimeSessionRow = Database['public']['Tables']['time_sessions']['Row'];
export type GoalRow = Database['public']['Tables']['goals']['Row'];
export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitCheckinRow = Database['public']['Tables']['habit_checkins']['Row'];
export type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row'];
export type CalculatorDefinitionRow = Database['public']['Tables']['calculator_definitions']['Row'];
export type CalculatorVersionRow = Database['public']['Tables']['calculator_versions']['Row'];
export type CalculationHistoryRow = Database['public']['Tables']['calculation_history']['Row'];
export type DashboardWidgetRow = Database['public']['Tables']['dashboard_widgets']['Row'];
export type SavedFilterRow = Database['public']['Tables']['saved_filters']['Row'];
export type TagRow = Database['public']['Tables']['tags']['Row'];
export type AttachmentRow = Database['public']['Tables']['attachments']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export interface TopicSummaryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  accent_color: string;
  is_pinned: boolean;
  is_favorite: boolean;
  status: 'active' | 'archived';
  sort_order: number;
  updated_at: string;
  version: number;
  enabled_features: string[];
  total_tasks: number;
  completed_tasks: number;
  tracked_seconds: number;
  journal_count: number;
  record_count: number;
  calculation_count: number;
  goal_progress_pct: number;
  finance_income: number;
  finance_expense: number;
}

export interface GlobalDashboardSummary {
  counts: {
    active_topics: number;
    archived_topics: number;
    tasks_today: number;
    tasks_pending: number;
    tasks_completed: number;
    tasks_overdue: number;
    seconds_tracked_today: number;
    seconds_tracked_week: number;
    seconds_tracked_month: number;
    goals_active: number;
    goals_avg_progress: number;
  };
  recent_journals: Array<{
    id: string;
    topic_id: string;
    topic_name: string;
    accent_color: string;
    title: string;
    mood: string | null;
    entry_date: string;
    updated_at: string;
  }>;
  upcoming_deadlines: Array<{
    id: string;
    topic_id: string;
    topic_name: string;
    accent_color: string;
    title: string;
    priority: string;
    status: string;
    due_at: string;
  }>;
  recent_activities: Array<{
    id: string;
    topic_id: string;
    topic_name: string;
    accent_color: string;
    source: string;
    category: string;
    title: string;
    duration_minutes: number | null;
    occurred_at: string;
  }>;
  topic_summaries: TopicSummaryItem[];
  daily_series: Array<{
    day: string;
    minutes_tracked: number;
    tasks_completed: number;
    activity_count: number;
  }>;
  timezone: string;
  days: number;
}

export interface TopicAnalyticsSummary {
  summary: {
    total_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    total_tracked_seconds: number;
    today_tracked_seconds: number;
    journal_entries_count: number;
    custom_records_count: number;
    calculation_runs_count: number;
    active_goals: number;
    avg_goal_progress_pct: number;
    habit_checkins_range: number;
  };
  daily_series: Array<{
    day: string;
    minutes_tracked: number;
    tasks_completed: number;
    records_logged: number;
  }>;
  timezone: string;
  days: number;
}

export interface GlobalSearchResultItem {
  entity_type: 'topic' | 'task' | 'journal' | 'record' | 'calculator' | 'tag';
  entity_id: string;
  topic_id: string | null;
  title: string;
  subtitle: string;
  href: string;
  sort_ts: string;
}
