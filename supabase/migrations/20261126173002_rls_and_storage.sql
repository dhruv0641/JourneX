-- NEXORA Row-Level Security, Role Grants, Storage Bucket, and Realtime Policies

-- Explicit schema & table grants for authenticated role (anon cannot access user tables)
grant usage on schema public to authenticated;
revoke all on all tables in schema public from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.topic_templates to authenticated;
grant select, insert, update, delete on public.topics to authenticated;
grant select, insert, update, delete on public.topic_modules to authenticated;
grant select, insert, update, delete on public.module_fields to authenticated;
grant select, insert, update, delete on public.module_views to authenticated;
grant select, insert, update, delete on public.custom_records to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_checklist_items to authenticated;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.activity_logs to authenticated;
grant select, insert, update, delete on public.time_sessions to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.habit_checkins to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.calculator_definitions to authenticated;
grant select, insert, delete on public.calculator_versions to authenticated;
grant select, insert, delete on public.calculation_history to authenticated;
grant select, insert, update, delete on public.dashboard_widgets to authenticated;
grant select, insert, update, delete on public.saved_filters to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, delete on public.tag_assignments to authenticated;
grant select, insert, delete on public.attachments to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert on public.audit_events to authenticated;
grant select, insert, delete on public.idempotency_records to authenticated;

-- Enable & force RLS on every table
do $$
declare
  tbl text;
  user_owned_tables text[] := array[
    'user_preferences', 'topics', 'topic_modules', 'module_fields', 'module_views',
    'custom_records', 'tasks', 'task_checklist_items', 'journal_entries', 'activity_logs',
    'time_sessions', 'goals', 'habits', 'habit_checkins', 'calendar_events',
    'calculator_definitions', 'calculator_versions', 'calculation_history',
    'dashboard_widgets', 'saved_filters', 'tags', 'tag_assignments', 'attachments',
    'notifications', 'audit_events', 'idempotency_records'
  ];
begin
  -- profiles uses id = auth.uid()
  alter table public.profiles enable row level security;
  alter table public.profiles force row level security;

  drop policy if exists profiles_select_own on public.profiles;
  create policy profiles_select_own on public.profiles
    for select to authenticated using ((select auth.uid()) = id);

  drop policy if exists profiles_insert_own on public.profiles;
  create policy profiles_insert_own on public.profiles
    for insert to authenticated with check ((select auth.uid()) = id);

  drop policy if exists profiles_update_own on public.profiles;
  create policy profiles_update_own on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

  -- topic_templates allows reading system templates + managing own templates
  alter table public.topic_templates enable row level security;
  alter table public.topic_templates force row level security;

  drop policy if exists topic_templates_select on public.topic_templates;
  create policy topic_templates_select on public.topic_templates
    for select to authenticated
    using (is_system = true or (select auth.uid()) = owner_id);

  drop policy if exists topic_templates_insert on public.topic_templates;
  create policy topic_templates_insert on public.topic_templates
    for insert to authenticated
    with check (is_system = false and (select auth.uid()) = owner_id);

  drop policy if exists topic_templates_update on public.topic_templates;
  create policy topic_templates_update on public.topic_templates
    for update to authenticated
    using (is_system = false and (select auth.uid()) = owner_id)
    with check (is_system = false and (select auth.uid()) = owner_id);

  drop policy if exists topic_templates_delete on public.topic_templates;
  create policy topic_templates_delete on public.topic_templates
    for delete to authenticated
    using (is_system = false and (select auth.uid()) = owner_id);

  -- Standard strict per-user RLS policies
  foreach tbl in array user_owned_tables loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      tbl || '_select_own', tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      tbl || '_insert_own', tbl
    );

    if tbl not in ('calculator_versions', 'calculation_history', 'tag_assignments', 'attachments', 'audit_events', 'idempotency_records') then
      execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
        tbl || '_update_own', tbl
      );
    end if;

    if tbl not in ('user_preferences', 'audit_events') then
      execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
        tbl || '_delete_own', tbl
      );
    end if;
  end loop;
end $$;

-- Private Storage Bucket for Attachments (10 MB max, curated safe MIME types)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nexora-attachments',
  'nexora-attachments',
  false,
  10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/csv', 'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nexora_attachments_select_own" on storage.objects;
create policy "nexora_attachments_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'nexora-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "nexora_attachments_insert_own" on storage.objects;
create policy "nexora_attachments_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'nexora-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "nexora_attachments_update_own" on storage.objects;
create policy "nexora_attachments_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'nexora-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'nexora-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "nexora_attachments_delete_own" on storage.objects;
create policy "nexora_attachments_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'nexora-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Selective Realtime Publication for multi-device workspace sync
do $$
declare
  rt_tbl text;
  rt_tables text[] := array['topics', 'topic_modules', 'tasks', 'journal_entries', 'time_sessions', 'habit_checkins', 'notifications'];
begin
  foreach rt_tbl in array rt_tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = rt_tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', rt_tbl);
    end if;
  end loop;
end $$;
