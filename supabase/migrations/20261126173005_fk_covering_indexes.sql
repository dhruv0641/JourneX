-- Covering indexes matching composite foreign key column order for optimal JOIN and CASCADE performance

create index if not exists idx_topic_modules_topic_user_fk on public.topic_modules (topic_id, user_id);
create index if not exists idx_module_fields_mod_topic_user_fk on public.module_fields (module_id, topic_id, user_id);
create index if not exists idx_module_views_topic_user_fk on public.module_views (topic_id, user_id);
create index if not exists idx_module_views_mod_topic_user_fk on public.module_views (module_id, topic_id, user_id);
create index if not exists idx_custom_records_mod_topic_user_fk on public.custom_records (module_id, topic_id, user_id);
create index if not exists idx_tasks_mod_topic_user_fk on public.tasks (module_id, topic_id, user_id);
create index if not exists idx_task_checklist_task_topic_user_fk on public.task_checklist_items (task_id, topic_id, user_id);
create index if not exists idx_journal_mod_topic_user_fk on public.journal_entries (module_id, topic_id, user_id);
create index if not exists idx_activity_logs_topic_user_fk on public.activity_logs (topic_id, user_id);
create index if not exists idx_activity_logs_mod_topic_user_fk on public.activity_logs (module_id, topic_id, user_id);
create index if not exists idx_time_sessions_mod_topic_user_fk on public.time_sessions (module_id, topic_id, user_id);
create index if not exists idx_time_sessions_task_topic_user_fk on public.time_sessions (task_id, topic_id, user_id);
create index if not exists idx_goals_mod_topic_user_fk on public.goals (module_id, topic_id, user_id);
create index if not exists idx_habits_mod_topic_user_fk on public.habits (module_id, topic_id, user_id);
create index if not exists idx_habit_checkins_habit_topic_user_fk on public.habit_checkins (habit_id, topic_id, user_id);
create index if not exists idx_calendar_events_topic_user_fk on public.calendar_events (topic_id, user_id);
create index if not exists idx_calendar_events_mod_topic_user_fk on public.calendar_events (module_id, topic_id, user_id);
create index if not exists idx_calendar_events_task_topic_user_fk on public.calendar_events (task_id, topic_id, user_id);
create index if not exists idx_calc_def_mod_topic_user_fk on public.calculator_definitions (module_id, topic_id, user_id);
create index if not exists idx_calc_ver_def_topic_user_fk on public.calculator_versions (calculator_id, topic_id, user_id);
create index if not exists idx_calc_hist_ver_calc_topic_user_fk on public.calculation_history (calculator_version_id, calculator_id, topic_id, user_id);
create index if not exists idx_dashboard_widgets_topic_user_fk on public.dashboard_widgets (topic_id, user_id);
create index if not exists idx_saved_filters_topic_user_fk on public.saved_filters (topic_id, user_id);
create index if not exists idx_tag_assignments_tag_user_fk on public.tag_assignments (tag_id, user_id);
create index if not exists idx_attachments_topic_user_fk on public.attachments (topic_id, user_id);
create index if not exists idx_notifications_topic_user_fk on public.notifications (topic_id, user_id);
