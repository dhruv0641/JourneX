-- NEXORA Initial Database Schema Migration
-- Enforces PostgreSQL 17 best practices: UUID PKs, timestamptz, numeric precision,
-- composite FKs preventing cross-topic/cross-user corruption, OCC version fields,
-- and targeted composite + trigram indexes.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Shared updated_at helper trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1)
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2. User Preferences (app_name configurable per user)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_name text not null default 'NEXORA' check (char_length(trim(app_name)) between 1 and 40),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  date_format text not null default 'MMM d, yyyy',
  time_format text not null default '24h' check (time_format in ('12h', '24h')),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  default_dashboard_range text not null default '30d' check (default_dashboard_range in ('7d', '30d', '90d', 'all')),
  compact_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1)
);

create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

-- Auto-create profile and preferences on user registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 3. Topic Templates
create table if not exists public.topic_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text not null,
  category text not null,
  icon text not null default 'layers',
  accent_color text not null default '#2563EB' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_system boolean not null default false,
  owner_id uuid references auth.users(id) on delete cascade,
  definition jsonb not null,
  schema_version integer not null default 1 check (schema_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_templates_owner_check check (
    (is_system = true and owner_id is null) or
    (is_system = false and owner_id is not null)
  )
);

create unique index if not exists topic_templates_system_slug_uidx
  on public.topic_templates (slug) where is_system = true;
create unique index if not exists topic_templates_owner_slug_uidx
  on public.topic_templates (owner_id, slug) where owner_id is not null;
create index if not exists topic_templates_owner_id_idx on public.topic_templates (owner_id);

create trigger trg_topic_templates_updated_at
before update on public.topic_templates
for each row execute function public.set_updated_at();

-- 4. Topics
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.topic_templates(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  description text not null default '',
  purpose text not null default '',
  category text not null default 'general',
  icon text not null default 'layers',
  accent_color text not null default '#2563EB' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  sort_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint topics_id_user_unique unique (id, user_id)
);

create unique index if not exists topics_user_slug_active_uidx
  on public.topics (user_id, slug) where deleted_at is null;
create index if not exists topics_user_status_idx
  on public.topics (user_id, status, sort_order) where deleted_at is null;
create index if not exists topics_template_id_idx on public.topics (template_id);
create index if not exists topics_name_trgm_idx
  on public.topics using gin (name extensions.gin_trgm_ops);

create trigger trg_topics_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

-- 5. Topic Modules
create table if not exists public.topic_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  feature_key text not null,
  module_key text not null check (module_key ~ '^[a-z0-9_-]+$'),
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '',
  icon text not null default 'box',
  feature_version integer not null default 1 check (feature_version >= 1),
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint topic_modules_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade,
  constraint topic_modules_topic_key_unique unique (topic_id, module_key),
  constraint topic_modules_id_topic_user_unique unique (id, topic_id, user_id)
);

create index if not exists topic_modules_user_topic_idx
  on public.topic_modules (user_id, topic_id, sort_order);

create trigger trg_topic_modules_updated_at
before update on public.topic_modules
for each row execute function public.set_updated_at();

-- 6. Module Fields
create table if not exists public.module_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (char_length(trim(label)) between 1 and 80),
  field_type text not null check (field_type in (
    'short_text', 'long_text', 'integer', 'decimal', 'currency', 'percentage',
    'date', 'datetime', 'duration', 'dropdown', 'multi_select', 'checkbox',
    'rating', 'url', 'email', 'tags', 'attachments', 'formula'
  )),
  is_required boolean not null default false,
  is_unique boolean not null default false,
  is_visible_in_table boolean not null default true,
  default_value jsonb,
  options jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  visibility_condition jsonb,
  formula_expression text,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint module_fields_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade,
  constraint module_fields_module_key_unique unique (module_id, field_key)
);

create index if not exists module_fields_module_order_idx
  on public.module_fields (module_id, sort_order) where is_archived = false;
create index if not exists module_fields_user_topic_idx
  on public.module_fields (user_id, topic_id);

create trigger trg_module_fields_updated_at
before update on public.module_fields
for each row execute function public.set_updated_at();

-- 7. Module Views
create table if not exists public.module_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid,
  view_type text not null check (view_type in (
    'dashboard', 'list', 'table', 'kanban', 'calendar', 'timeline', 'gallery', 'charts', 'activity'
  )),
  name text not null check (char_length(trim(name)) between 1 and 80),
  sort_order integer not null default 0,
  is_default boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint module_views_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade,
  constraint module_views_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade
);

create index if not exists module_views_topic_order_idx
  on public.module_views (topic_id, sort_order);
create index if not exists module_views_user_idx on public.module_views (user_id);

create trigger trg_module_views_updated_at
before update on public.module_views
for each row execute function public.set_updated_at();

-- 8. Custom Records
create table if not exists public.custom_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  import_hash text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint custom_records_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade
);

create unique index if not exists custom_records_import_hash_uidx
  on public.custom_records (module_id, import_hash)
  where import_hash is not null and deleted_at is null;
create index if not exists custom_records_module_occurred_idx
  on public.custom_records (module_id, occurred_at desc) where deleted_at is null;
create index if not exists custom_records_user_topic_idx
  on public.custom_records (user_id, topic_id) where deleted_at is null;
create index if not exists custom_records_title_trgm_idx
  on public.custom_records using gin (title extensions.gin_trgm_ops);
create index if not exists custom_records_data_gin_idx
  on public.custom_records using gin (data);

create trigger trg_custom_records_updated_at
before update on public.custom_records
for each row execute function public.set_updated_at();

-- 9. Tasks & Subtask Checklist Items
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_at timestamptz,
  completed_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  recurrence_rule jsonb,
  custom_data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint tasks_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade,
  constraint tasks_id_topic_user_unique unique (id, topic_id, user_id)
);

create index if not exists tasks_user_topic_status_idx
  on public.tasks (user_id, topic_id, status, due_at) where deleted_at is null;
create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_at) where deleted_at is null and completed_at is null;
create index if not exists tasks_module_idx
  on public.tasks (module_id, sort_order) where deleted_at is null;
create index if not exists tasks_title_trgm_idx
  on public.tasks using gin (title extensions.gin_trgm_ops);

create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  task_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_checklist_task_fk foreign key (task_id, topic_id, user_id)
    references public.tasks(id, topic_id, user_id) on delete cascade
);

create index if not exists task_checklist_items_task_idx
  on public.task_checklist_items (task_id, sort_order);
create index if not exists task_checklist_items_user_idx
  on public.task_checklist_items (user_id);

create trigger trg_task_checklist_items_updated_at
before update on public.task_checklist_items
for each row execute function public.set_updated_at();

-- 10. Journal Entries
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  title text not null default '',
  content_html text not null default '',
  content_text text not null default '',
  category text,
  mood text,
  entry_date date not null default current_date,
  is_draft boolean not null default false,
  template_name text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint journal_entries_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade
);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc) where deleted_at is null;
create index if not exists journal_entries_topic_date_idx
  on public.journal_entries (topic_id, entry_date desc) where deleted_at is null;
create index if not exists journal_entries_text_trgm_idx
  on public.journal_entries using gin (content_text extensions.gin_trgm_ops);
create index if not exists journal_entries_title_trgm_idx
  on public.journal_entries using gin (title extensions.gin_trgm_ops);

create trigger trg_journal_entries_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

-- 11. Activity Logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  category text not null default 'general',
  title text not null check (char_length(trim(title)) between 1 and 240),
  details jsonb not null default '{}'::jsonb,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint activity_logs_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade,
  constraint activity_logs_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete set null
);

create index if not exists activity_logs_user_occurred_idx
  on public.activity_logs (user_id, occurred_at desc);
create index if not exists activity_logs_topic_occurred_idx
  on public.activity_logs (topic_id, occurred_at desc);

-- 12. Time Sessions
create table if not exists public.time_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  task_id uuid,
  description text not null default '',
  status text not null default 'completed' check (status in ('running', 'paused', 'completed')),
  started_at timestamptz not null default now(),
  last_resumed_at timestamptz,
  ended_at timestamptz,
  accumulated_seconds integer not null default 0 check (accumulated_seconds >= 0),
  is_manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint time_sessions_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade,
  constraint time_sessions_task_fk foreign key (task_id, topic_id, user_id)
    references public.tasks(id, topic_id, user_id) on delete set null
);

-- Enforce at most one active running timer per user to prevent race-condition duplicates
create unique index if not exists time_sessions_one_running_per_user_uidx
  on public.time_sessions (user_id) where status = 'running';
create index if not exists time_sessions_user_started_idx
  on public.time_sessions (user_id, started_at desc);
create index if not exists time_sessions_topic_started_idx
  on public.time_sessions (topic_id, started_at desc);

create trigger trg_time_sessions_updated_at
before update on public.time_sessions
for each row execute function public.set_updated_at();

-- 13. Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly', 'custom')),
  target_value numeric(18,4) not null check (target_value > 0),
  current_value numeric(18,4) not null default 0 check (current_value >= 0),
  unit text not null default '',
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint goals_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade
);

create index if not exists goals_user_topic_status_idx
  on public.goals (user_id, topic_id, status);

create trigger trg_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

-- 14. Habits & Check-ins
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  schedule_type text not null default 'daily' check (schedule_type in ('daily', 'weekdays', 'custom')),
  schedule_days smallint[] not null default '{0,1,2,3,4,5,6}'::smallint[],
  target_count_per_day integer not null default 1 check (target_count_per_day > 0),
  unit text not null default 'times',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint habits_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade,
  constraint habits_id_topic_user_unique unique (id, topic_id, user_id)
);

create index if not exists habits_user_topic_idx on public.habits (user_id, topic_id);

create trigger trg_habits_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  habit_id uuid not null,
  checkin_date date not null,
  value numeric(12,2) not null default 1 check (value >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_checkins_habit_fk foreign key (habit_id, topic_id, user_id)
    references public.habits(id, topic_id, user_id) on delete cascade,
  constraint habit_checkins_unique_occurrence unique (habit_id, checkin_date)
);

create index if not exists habit_checkins_user_date_idx
  on public.habit_checkins (user_id, checkin_date desc);

create trigger trg_habit_checkins_updated_at
before update on public.habit_checkins
for each row execute function public.set_updated_at();

-- 15. Calendar Events
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid,
  task_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  recurrence_rule jsonb,
  reminder_minutes integer check (reminder_minutes is null or reminder_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint calendar_events_range_check check (ends_at >= starts_at),
  constraint calendar_events_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade,
  constraint calendar_events_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete set null,
  constraint calendar_events_task_fk foreign key (task_id, topic_id, user_id)
    references public.tasks(id, topic_id, user_id) on delete set null
);

create index if not exists calendar_events_user_starts_idx
  on public.calendar_events (user_id, starts_at);
create index if not exists calendar_events_topic_starts_idx
  on public.calendar_events (topic_id, starts_at);

create trigger trg_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

-- 16. Custom Calculators, Versions & History
create table if not exists public.calculator_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  module_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  current_version integer not null default 1 check (current_version >= 1),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint calc_def_module_fk foreign key (module_id, topic_id, user_id)
    references public.topic_modules(id, topic_id, user_id) on delete cascade,
  constraint calc_def_id_topic_user_unique unique (id, topic_id, user_id)
);

create index if not exists calculator_definitions_user_topic_idx
  on public.calculator_definitions (user_id, topic_id);
create index if not exists calculator_definitions_name_trgm_idx
  on public.calculator_definitions using gin (name extensions.gin_trgm_ops);

create trigger trg_calculator_definitions_updated_at
before update on public.calculator_definitions
for each row execute function public.set_updated_at();

create table if not exists public.calculator_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  calculator_id uuid not null,
  version_number integer not null check (version_number >= 1),
  inputs_schema jsonb not null,
  outputs_schema jsonb not null,
  formulas jsonb not null,
  chart_config jsonb not null default '{}'::jsonb,
  change_note text not null default '',
  created_at timestamptz not null default now(),
  constraint calc_versions_def_fk foreign key (calculator_id, topic_id, user_id)
    references public.calculator_definitions(id, topic_id, user_id) on delete cascade,
  constraint calc_versions_unique_num unique (calculator_id, version_number),
  constraint calc_versions_id_calc_unique unique (id, calculator_id, topic_id, user_id)
);

create index if not exists calculator_versions_user_idx on public.calculator_versions (user_id);

create table if not exists public.calculation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  calculator_id uuid not null,
  calculator_version_id uuid not null,
  inputs jsonb not null,
  outputs jsonb not null,
  label text not null default '',
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint calc_history_ver_fk foreign key (calculator_version_id, calculator_id, topic_id, user_id)
    references public.calculator_versions(id, calculator_id, topic_id, user_id) on delete cascade
);

create index if not exists calculation_history_calc_time_idx
  on public.calculation_history (calculator_id, calculated_at desc);
create index if not exists calculation_history_user_topic_idx
  on public.calculation_history (user_id, topic_id);

-- 17. Dashboard Widgets & Saved Filters
create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('global', 'topic')),
  topic_id uuid,
  widget_type text not null,
  title text not null check (char_length(trim(title)) between 1 and 100),
  config jsonb not null default '{}'::jsonb,
  layout jsonb not null default '{"colSpan": 1, "rowSpan": 1}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version >= 1),
  constraint dashboard_widgets_scope_topic_check check (
    (scope = 'global' and topic_id is null) or
    (scope = 'topic' and topic_id is not null)
  ),
  constraint dashboard_widgets_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade
);

create index if not exists dashboard_widgets_user_scope_idx
  on public.dashboard_widgets (user_id, scope, topic_id, sort_order);

create trigger trg_dashboard_widgets_updated_at
before update on public.dashboard_widgets
for each row execute function public.set_updated_at();

create table if not exists public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid,
  module_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 80),
  filter_config jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_filters_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade
);

create index if not exists saved_filters_user_topic_idx
  on public.saved_filters (user_id, topic_id);

create trigger trg_saved_filters_updated_at
before update on public.saved_filters
for each row execute function public.set_updated_at();

-- 18. Tags & Tag Assignments
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50),
  normalized_name text generated always as (lower(trim(name))) stored,
  color text not null default '#64748B' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  constraint tags_user_norm_unique unique (user_id, normalized_name),
  constraint tags_id_user_unique unique (id, user_id)
);

create index if not exists tags_name_trgm_idx
  on public.tags using gin (name extensions.gin_trgm_ops);

create table if not exists public.tag_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id uuid not null,
  entity_type text not null check (entity_type in ('topic', 'task', 'journal_entry', 'custom_record')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint tag_assignments_tag_fk foreign key (tag_id, user_id)
    references public.tags(id, user_id) on delete cascade,
  constraint tag_assignments_unique unique (user_id, tag_id, entity_type, entity_id)
);

create index if not exists tag_assignments_entity_idx
  on public.tag_assignments (user_id, entity_type, entity_id);

-- 19. Attachments
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null,
  entity_type text not null check (entity_type in ('topic', 'task', 'journal_entry', 'custom_record')),
  entity_id uuid not null,
  bucket_id text not null default 'nexora-attachments',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  constraint attachments_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade,
  constraint attachments_bucket_path_unique unique (bucket_id, storage_path)
);

create index if not exists attachments_entity_idx
  on public.attachments (user_id, entity_type, entity_id);

-- 20. Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid,
  kind text not null default 'info',
  title text not null,
  body text not null default '',
  action_url text,
  is_read boolean not null default false,
  scheduled_for timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_topic_fk foreign key (topic_id, user_id)
    references public.topics(id, user_id) on delete cascade
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, scheduled_for desc);

-- 21. Security Audit Events (distinct from user-facing activity_logs)
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_user_created_idx
  on public.audit_events (user_id, created_at desc);

-- 22. Idempotency Records
create table if not exists public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer not null default 200,
  response_body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint idempotency_user_op_key_unique unique (user_id, operation, idempotency_key)
);

create index if not exists idempotency_expires_idx on public.idempotency_records (expires_at);
