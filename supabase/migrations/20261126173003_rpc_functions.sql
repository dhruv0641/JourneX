-- NEXORA Atomic RPC Functions, Analytics Aggregations, and Global Search
-- All user-callable RPCs use SECURITY INVOKER with fixed search_path = '' and rely on RLS + explicit auth.uid() checks.

-- Helper: Safe timezone resolution
create or replace function public.resolve_safe_timezone(p_tz text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tz text := coalesce(nullif(trim(p_tz), ''), 'UTC');
begin
  perform now() at time zone v_tz;
  return v_tz;
exception when others then
  return 'UTC';
end;
$$;

-- 1. Atomic Topic Creation RPC with Idempotency
create or replace function public.create_topic_atomic(
  p_payload jsonb,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_req_hash text;
  v_existing_idem record;
  v_topic_id uuid;
  v_template_id uuid;
  v_name text;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
  v_mod jsonb;
  v_field jsonb;
  v_view jsonb;
  v_widget jsonb;
  v_mod_id uuid;
  v_calc_id uuid;
  v_calc_json jsonb;
  v_modules_out jsonb := '[]'::jsonb;
  v_topic_row public.topics%rowtype;
  v_first_module_id uuid := null;
  v_has_default_view boolean := false;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: authentication required';
  end if;

  v_name := trim(coalesce(p_payload ->> 'name', ''));
  if char_length(v_name) < 1 or char_length(v_name) > 100 then
    raise exception 'VALIDATION_ERROR: Topic name must be between 1 and 100 characters';
  end if;

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    v_req_hash := encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
    select * into v_existing_idem
    from public.idempotency_records
    where user_id = v_user_id
      and operation = 'create_topic'
      and idempotency_key = p_idempotency_key
      and expires_at > now();

    if found then
      if v_existing_idem.request_hash <> v_req_hash then
        raise exception 'IDEMPOTENCY_CONFLICT: Idempotency key reused with different payload';
      end if;
      return v_existing_idem.response_body || jsonb_build_object('idempotent_replay', true);
    end if;
  end if;

  v_template_id := nullif(p_payload ->> 'template_id', '')::uuid;
  v_base_slug := regexp_replace(lower(coalesce(nullif(trim(p_payload ->> 'slug'), ''), v_name)), '[^a-z0-9]+', '-', 'g');
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then
    v_base_slug := 'topic';
  end if;
  v_base_slug := left(v_base_slug, 56);
  v_slug := v_base_slug;

  while exists (
    select 1 from public.topics
    where user_id = v_user_id and slug = v_slug and deleted_at is null
  ) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.topics (
    user_id, template_id, name, slug, description, purpose, category, icon, accent_color,
    is_pinned, is_favorite, settings
  )
  values (
    v_user_id,
    v_template_id,
    v_name,
    v_slug,
    coalesce(p_payload ->> 'description', ''),
    coalesce(p_payload ->> 'purpose', ''),
    coalesce(nullif(trim(p_payload ->> 'category'), ''), 'general'),
    coalesce(nullif(trim(p_payload ->> 'icon'), ''), 'layers'),
    coalesce(nullif(trim(p_payload ->> 'accent_color'), ''), '#2563EB'),
    coalesce((p_payload ->> 'is_pinned')::boolean, false),
    coalesce((p_payload ->> 'is_favorite')::boolean, false),
    coalesce(p_payload -> 'settings', '{}'::jsonb)
  )
  returning * into v_topic_row;

  v_topic_id := v_topic_row.id;

  -- Insert Modules & Fields & Embedded Calculators
  if jsonb_typeof(p_payload -> 'modules') = 'array' then
    for v_mod in select value from jsonb_array_elements(p_payload -> 'modules') loop
      insert into public.topic_modules (
        user_id, topic_id, feature_key, module_key, name, description, icon,
        feature_version, is_enabled, sort_order, config
      )
      values (
        v_user_id,
        v_topic_id,
        v_mod ->> 'feature_key',
        coalesce(nullif(trim(v_mod ->> 'module_key'), ''), v_mod ->> 'feature_key'),
        coalesce(nullif(trim(v_mod ->> 'name'), ''), initcap(replace(v_mod ->> 'feature_key', '_', ' '))),
        coalesce(v_mod ->> 'description', ''),
        coalesce(nullif(trim(v_mod ->> 'icon'), ''), 'box'),
        coalesce((v_mod ->> 'feature_version')::integer, 1),
        coalesce((v_mod ->> 'is_enabled')::boolean, true),
        coalesce((v_mod ->> 'sort_order')::integer, 0),
        coalesce(v_mod -> 'config', '{}'::jsonb)
      )
      returning id into v_mod_id;

      if v_first_module_id is null then
        v_first_module_id := v_mod_id;
      end if;

      v_modules_out := v_modules_out || jsonb_build_array(
        jsonb_build_object(
          'id', v_mod_id,
          'module_key', coalesce(nullif(trim(v_mod ->> 'module_key'), ''), v_mod ->> 'feature_key'),
          'feature_key', v_mod ->> 'feature_key'
        )
      );

      if jsonb_typeof(v_mod -> 'fields') = 'array' then
        for v_field in select value from jsonb_array_elements(v_mod -> 'fields') loop
          insert into public.module_fields (
            user_id, topic_id, module_id, field_key, label, field_type,
            is_required, is_unique, is_visible_in_table, default_value,
            options, validation_rules, visibility_condition, formula_expression, sort_order
          )
          values (
            v_user_id,
            v_topic_id,
            v_mod_id,
            v_field ->> 'field_key',
            v_field ->> 'label',
            v_field ->> 'field_type',
            coalesce((v_field ->> 'is_required')::boolean, false),
            coalesce((v_field ->> 'is_unique')::boolean, false),
            coalesce((v_field ->> 'is_visible_in_table')::boolean, true),
            v_field -> 'default_value',
            coalesce(v_field -> 'options', '[]'::jsonb),
            coalesce(v_field -> 'validation_rules', '{}'::jsonb),
            v_field -> 'visibility_condition',
            v_field ->> 'formula_expression',
            coalesce((v_field ->> 'sort_order')::integer, 0)
          );
        end loop;
      end if;

      if (v_mod ->> 'feature_key') = 'calculators' and jsonb_typeof(v_mod -> 'config' -> 'calculator') = 'object' then
        v_calc_json := v_mod -> 'config' -> 'calculator';
        insert into public.calculator_definitions (
          user_id, topic_id, module_id, name, description, current_version
        )
        values (
          v_user_id,
          v_topic_id,
          v_mod_id,
          coalesce(nullif(trim(v_calc_json ->> 'name'), ''), coalesce(v_mod ->> 'name', 'Calculator')),
          coalesce(v_calc_json ->> 'description', ''),
          1
        )
        returning id into v_calc_id;

        insert into public.calculator_versions (
          user_id, topic_id, calculator_id, version_number,
          inputs_schema, outputs_schema, formulas, chart_config, change_note
        )
        values (
          v_user_id,
          v_topic_id,
          v_calc_id,
          1,
          coalesce(v_calc_json -> 'inputs_schema', '[]'::jsonb),
          coalesce(v_calc_json -> 'outputs_schema', '[]'::jsonb),
          coalesce(v_calc_json -> 'formulas', '[]'::jsonb),
          coalesce(v_calc_json -> 'chart_config', '{}'::jsonb),
          'Initial calculator formula'
        );
      end if;
    end loop;
  end if;

  -- Insert Views
  if jsonb_typeof(p_payload -> 'views') = 'array' and jsonb_array_length(p_payload -> 'views') > 0 then
    for v_view in select value from jsonb_array_elements(p_payload -> 'views') loop
      if coalesce((v_view ->> 'is_default')::boolean, false) then
        v_has_default_view := true;
      end if;
      insert into public.module_views (
        user_id, topic_id, view_type, name, sort_order, is_default, config
      )
      values (
        v_user_id,
        v_topic_id,
        v_view ->> 'view_type',
        v_view ->> 'name',
        coalesce((v_view ->> 'sort_order')::integer, 0),
        coalesce((v_view ->> 'is_default')::boolean, false),
        coalesce(v_view -> 'config', '{}'::jsonb)
      );
    end loop;
  end if;

  if not v_has_default_view then
    insert into public.module_views (user_id, topic_id, view_type, name, sort_order, is_default)
    values (v_user_id, v_topic_id, 'dashboard', 'Overview', 0, true);
  end if;

  -- Insert Topic Dashboard Widgets
  if jsonb_typeof(p_payload -> 'widgets') = 'array' and jsonb_array_length(p_payload -> 'widgets') > 0 then
    for v_widget in select value from jsonb_array_elements(p_payload -> 'widgets') loop
      insert into public.dashboard_widgets (
        user_id, scope, topic_id, widget_type, title, config, layout, sort_order, is_visible
      )
      values (
        v_user_id,
        'topic',
        v_topic_id,
        v_widget ->> 'widget_type',
        v_widget ->> 'title',
        coalesce(v_widget -> 'config', '{}'::jsonb),
        coalesce(v_widget -> 'layout', '{"colSpan": 1, "rowSpan": 1}'::jsonb),
        coalesce((v_widget ->> 'sort_order')::integer, 0),
        coalesce((v_widget ->> 'is_visible')::boolean, true)
      );
    end loop;
  else
    insert into public.dashboard_widgets (user_id, scope, topic_id, widget_type, title, sort_order)
    values
      (v_user_id, 'topic', v_topic_id, 'topic_kpis', 'Key Metrics', 0),
      (v_user_id, 'topic', v_topic_id, 'activity_trend', 'Activity Trend', 1);
  end if;

  insert into public.activity_logs (user_id, topic_id, module_id, source, category, title, details)
  values (
    v_user_id,
    v_topic_id,
    v_first_module_id,
    'automatic',
    'topic_lifecycle',
    'Created topic "' || v_name || '"',
    jsonb_build_object('slug', v_slug, 'category', v_topic_row.category)
  );

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    insert into public.idempotency_records (
      user_id, operation, idempotency_key, request_hash, response_status, response_body
    )
    values (
      v_user_id,
      'create_topic',
      p_idempotency_key,
      v_req_hash,
      201,
      jsonb_build_object(
        'topic', to_jsonb(v_topic_row),
        'modules', v_modules_out
      )
    )
    on conflict (user_id, operation, idempotency_key) do nothing;
  end if;

  return jsonb_build_object(
    'topic', to_jsonb(v_topic_row),
    'modules', v_modules_out,
    'idempotent_replay', false
  );
end;
$$;

-- 2. Atomic Topic Duplication RPC
create or replace function public.duplicate_topic_atomic(
  p_source_topic_id uuid,
  p_new_name text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_src public.topics%rowtype;
  v_new_name text;
  v_payload jsonb;
  v_modules jsonb := '[]'::jsonb;
  v_views jsonb := '[]'::jsonb;
  v_widgets jsonb := '[]'::jsonb;
  v_mod record;
  v_fields jsonb;
  v_calc record;
  v_calc_ver record;
  v_mod_config jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: authentication required';
  end if;

  select * into v_src
  from public.topics
  where id = p_source_topic_id and user_id = v_user_id and deleted_at is null;

  if not found then
    raise exception 'NOT_FOUND: Source topic not found';
  end if;

  v_new_name := coalesce(nullif(trim(p_new_name), ''), left(v_src.name, 88) || ' (Copy)');

  for v_mod in
    select * from public.topic_modules
    where topic_id = v_src.id and user_id = v_user_id
    order by sort_order asc
  loop
    select coalesce(jsonb_agg(jsonb_build_object(
      'field_key', field_key,
      'label', label,
      'field_type', field_type,
      'is_required', is_required,
      'is_unique', is_unique,
      'is_visible_in_table', is_visible_in_table,
      'default_value', default_value,
      'options', options,
      'validation_rules', validation_rules,
      'visibility_condition', visibility_condition,
      'formula_expression', formula_expression,
      'sort_order', sort_order
    ) order by sort_order), '[]'::jsonb)
    into v_fields
    from public.module_fields
    where module_id = v_mod.id and user_id = v_user_id and is_archived = false;

    v_mod_config := v_mod.config;

    if v_mod.feature_key = 'calculators' then
      select * into v_calc
      from public.calculator_definitions
      where module_id = v_mod.id and user_id = v_user_id and is_archived = false
      limit 1;
      if found then
        select * into v_calc_ver
        from public.calculator_versions
        where calculator_id = v_calc.id and version_number = v_calc.current_version
        limit 1;
        if found then
          v_mod_config := v_mod_config || jsonb_build_object(
            'calculator', jsonb_build_object(
              'name', v_calc.name,
              'description', v_calc.description,
              'inputs_schema', v_calc_ver.inputs_schema,
              'outputs_schema', v_calc_ver.outputs_schema,
              'formulas', v_calc_ver.formulas,
              'chart_config', v_calc_ver.chart_config
            )
          );
        end if;
      end if;
    end if;

    v_modules := v_modules || jsonb_build_array(jsonb_build_object(
      'feature_key', v_mod.feature_key,
      'module_key', v_mod.module_key,
      'name', v_mod.name,
      'description', v_mod.description,
      'icon', v_mod.icon,
      'feature_version', v_mod.feature_version,
      'is_enabled', v_mod.is_enabled,
      'sort_order', v_mod.sort_order,
      'config', v_mod_config,
      'fields', v_fields
    ));
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'view_type', view_type,
    'name', name,
    'sort_order', sort_order,
    'is_default', is_default,
    'config', config
  ) order by sort_order), '[]'::jsonb)
  into v_views
  from public.module_views
  where topic_id = v_src.id and user_id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'widget_type', widget_type,
    'title', title,
    'config', config,
    'layout', layout,
    'sort_order', sort_order,
    'is_visible', is_visible
  ) order by sort_order), '[]'::jsonb)
  into v_widgets
  from public.dashboard_widgets
  where topic_id = v_src.id and user_id = v_user_id and scope = 'topic';

  v_payload := jsonb_build_object(
    'name', v_new_name,
    'description', v_src.description,
    'purpose', v_src.purpose,
    'category', v_src.category,
    'icon', v_src.icon,
    'accent_color', v_src.accent_color,
    'template_id', v_src.template_id,
    'settings', v_src.settings,
    'modules', v_modules,
    'views', v_views,
    'widgets', v_widgets
  );

  return public.create_topic_atomic(v_payload, p_idempotency_key);
end;
$$;

-- 3. Time Tracking Start / Pause / Resume / Stop RPCs
create or replace function public.start_time_session_atomic(
  p_topic_id uuid,
  p_module_id uuid,
  p_task_id uuid default null,
  p_description text default '',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_req_hash text;
  v_existing record;
  v_running public.time_sessions%rowtype;
  v_created public.time_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: authentication required';
  end if;

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    v_req_hash := encode(extensions.digest(convert_to(
      jsonb_build_object('topic_id', p_topic_id, 'module_id', p_module_id, 'task_id', p_task_id, 'description', coalesce(p_description, ''))::text,
      'UTF8'
    ), 'sha256'), 'hex');

    select * into v_existing
    from public.idempotency_records
    where user_id = v_user_id
      and operation = 'start_time_session'
      and idempotency_key = p_idempotency_key
      and expires_at > now();

    if found then
      if v_existing.request_hash <> v_req_hash then
        raise exception 'IDEMPOTENCY_CONFLICT: Timer start key reused with different payload';
      end if;
      return v_existing.response_body || jsonb_build_object('idempotent_replay', true);
    end if;
  end if;

  select * into v_running
  from public.time_sessions
  where user_id = v_user_id and status = 'running'
  limit 1;

  if found then
    raise exception 'ACTIVE_TIMER_EXISTS: A timer is already running (%). Pause or stop it first.', v_running.id;
  end if;

  insert into public.time_sessions (
    user_id, topic_id, module_id, task_id, description,
    status, started_at, last_resumed_at, accumulated_seconds, is_manual
  )
  values (
    v_user_id, p_topic_id, p_module_id, p_task_id, coalesce(p_description, ''),
    'running', now(), now(), 0, false
  )
  returning * into v_created;

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    insert into public.idempotency_records (
      user_id, operation, idempotency_key, request_hash, response_status, response_body
    )
    values (
      v_user_id, 'start_time_session', p_idempotency_key, v_req_hash, 201,
      jsonb_build_object('session', to_jsonb(v_created))
    )
    on conflict (user_id, operation, idempotency_key) do nothing;
  end if;

  return jsonb_build_object('session', to_jsonb(v_created), 'idempotent_replay', false);
end;
$$;

create or replace function public.transition_time_session_atomic(
  p_session_id uuid,
  p_action text,
  p_expected_version integer
)
returns public.time_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_row public.time_sessions%rowtype;
  v_delta integer := 0;
  v_updated public.time_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: authentication required';
  end if;

  select * into v_row
  from public.time_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Time session not found';
  end if;

  if v_row.version <> p_expected_version then
    raise exception 'CONFLICT_VERSION_MISMATCH: Expected version %, current version %', p_expected_version, v_row.version;
  end if;

  if p_action = 'pause' then
    if v_row.status <> 'running' then
      raise exception 'INVALID_STATE: Only running timers can be paused';
    end if;
    v_delta := greatest(0, floor(extract(epoch from (now() - coalesce(v_row.last_resumed_at, v_row.started_at))))::integer);
    update public.time_sessions
    set status = 'paused',
        accumulated_seconds = v_row.accumulated_seconds + v_delta,
        last_resumed_at = null,
        version = v_row.version + 1
    where id = v_row.id
    returning * into v_updated;

  elsif p_action = 'resume' then
    if v_row.status <> 'paused' then
      raise exception 'INVALID_STATE: Only paused timers can be resumed';
    end if;
    if exists (select 1 from public.time_sessions where user_id = v_user_id and status = 'running' and id <> v_row.id) then
      raise exception 'ACTIVE_TIMER_EXISTS: Another timer is already running';
    end if;
    update public.time_sessions
    set status = 'running',
        last_resumed_at = now(),
        version = v_row.version + 1
    where id = v_row.id
    returning * into v_updated;

  elsif p_action = 'stop' then
    if v_row.status = 'completed' then
      raise exception 'INVALID_STATE: Timer is already completed';
    end if;
    if v_row.status = 'running' then
      v_delta := greatest(0, floor(extract(epoch from (now() - coalesce(v_row.last_resumed_at, v_row.started_at))))::integer);
    end if;
    update public.time_sessions
    set status = 'completed',
        accumulated_seconds = v_row.accumulated_seconds + v_delta,
        last_resumed_at = null,
        ended_at = now(),
        version = v_row.version + 1
    where id = v_row.id
    returning * into v_updated;

    insert into public.activity_logs (
      user_id, topic_id, module_id, source, category, title, duration_minutes, occurred_at
    )
    values (
      v_user_id,
      v_updated.topic_id,
      v_updated.module_id,
      'automatic',
      'time_tracking',
      coalesce(nullif(trim(v_updated.description), ''), 'Completed focus session'),
      greatest(1, round(v_updated.accumulated_seconds / 60.0)::integer),
      coalesce(v_updated.ended_at, now())
    );
  else
    raise exception 'VALIDATION_ERROR: Unsupported timer action %', p_action;
  end if;

  return v_updated;
end;
$$;

-- 4. Global Dashboard Summary Aggregation RPC (Real Authoritative Data)
create or replace function public.get_global_dashboard_summary(
  p_days integer default 30,
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tz text := public.resolve_safe_timezone(p_timezone);
  v_days integer := greatest(1, least(365, coalesce(p_days, 30)));
  v_local_today date := (now() at time zone v_tz)::date;
  v_start_today timestamptz := (v_local_today::timestamp at time zone v_tz);
  v_start_week timestamptz := ((v_local_today - 6)::timestamp at time zone v_tz);
  v_start_month timestamptz := ((v_local_today - 29)::timestamp at time zone v_tz);
  v_range_start timestamptz := ((v_local_today - (v_days - 1))::timestamp at time zone v_tz);
  v_counts jsonb;
  v_recent_journals jsonb;
  v_upcoming_deadlines jsonb;
  v_recent_activities jsonb;
  v_topic_summaries jsonb;
  v_daily_series jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: authentication required';
  end if;

  select jsonb_build_object(
    'active_topics', (select count(*) from public.topics where user_id = v_user_id and status = 'active' and deleted_at is null),
    'archived_topics', (select count(*) from public.topics where user_id = v_user_id and status = 'archived' and deleted_at is null),
    'tasks_today', (
      select count(*) from public.tasks t
      join public.topics tp on tp.id = t.topic_id and tp.user_id = t.user_id
      where t.user_id = v_user_id and t.deleted_at is null and tp.deleted_at is null and tp.status = 'active'
        and t.due_at is not null and (t.due_at at time zone v_tz)::date = v_local_today
    ),
    'tasks_pending', (
      select count(*) from public.tasks t
      join public.topics tp on tp.id = t.topic_id and tp.user_id = t.user_id
      where t.user_id = v_user_id and t.deleted_at is null and tp.deleted_at is null and tp.status = 'active'
        and t.completed_at is null and t.status <> 'done'
    ),
    'tasks_completed', (
      select count(*) from public.tasks t
      join public.topics tp on tp.id = t.topic_id and tp.user_id = t.user_id
      where t.user_id = v_user_id and t.deleted_at is null and tp.deleted_at is null and tp.status = 'active'
        and (t.completed_at is not null or t.status = 'done')
        and t.updated_at >= v_range_start
    ),
    'tasks_overdue', (
      select count(*) from public.tasks t
      join public.topics tp on tp.id = t.topic_id and tp.user_id = t.user_id
      where t.user_id = v_user_id and t.deleted_at is null and tp.deleted_at is null and tp.status = 'active'
        and t.completed_at is null and t.status <> 'done'
        and t.due_at is not null and t.due_at < now()
    ),
    'seconds_tracked_today', (
      select coalesce(sum(accumulated_seconds), 0) from public.time_sessions
      where user_id = v_user_id and started_at >= v_start_today
    ),
    'seconds_tracked_week', (
      select coalesce(sum(accumulated_seconds), 0) from public.time_sessions
      where user_id = v_user_id and started_at >= v_start_week
    ),
    'seconds_tracked_month', (
      select coalesce(sum(accumulated_seconds), 0) from public.time_sessions
      where user_id = v_user_id and started_at >= v_start_month
    ),
    'goals_active', (
      select count(*) from public.goals
      where user_id = v_user_id and status = 'active'
    ),
    'goals_avg_progress', (
      select coalesce(round(avg(least(100, (current_value / nullif(target_value, 0)) * 100))::numeric, 1), 0)
      from public.goals
      where user_id = v_user_id and status in ('active', 'completed')
    )
  ) into v_counts;

  select coalesce(jsonb_agg(row_to_json(j) order by j.entry_date desc, j.updated_at desc), '[]'::jsonb)
  into v_recent_journals
  from (
    select je.id, je.topic_id, tp.name as topic_name, tp.accent_color, je.title, je.mood, je.entry_date, je.updated_at
    from public.journal_entries je
    join public.topics tp on tp.id = je.topic_id and tp.user_id = je.user_id
    where je.user_id = v_user_id and je.deleted_at is null and tp.deleted_at is null and je.is_draft = false
    order by je.entry_date desc, je.updated_at desc
    limit 5
  ) j;

  select coalesce(jsonb_agg(row_to_json(d) order by d.due_at asc), '[]'::jsonb)
  into v_upcoming_deadlines
  from (
    select t.id, t.topic_id, tp.name as topic_name, tp.accent_color, t.title, t.priority, t.status, t.due_at
    from public.tasks t
    join public.topics tp on tp.id = t.topic_id and tp.user_id = t.user_id
    where t.user_id = v_user_id and t.deleted_at is null and tp.deleted_at is null and tp.status = 'active'
      and t.completed_at is null and t.status <> 'done' and t.due_at is not null
    order by t.due_at asc
    limit 8
  ) d;

  select coalesce(jsonb_agg(row_to_json(a) order by a.occurred_at desc), '[]'::jsonb)
  into v_recent_activities
  from (
    select al.id, al.topic_id, tp.name as topic_name, tp.accent_color, al.source, al.category, al.title, al.duration_minutes, al.occurred_at
    from public.activity_logs al
    join public.topics tp on tp.id = al.topic_id and tp.user_id = al.user_id
    where al.user_id = v_user_id and tp.deleted_at is null
    order by al.occurred_at desc
    limit 10
  ) a;

  select coalesce(jsonb_agg(row_to_json(ts) order by ts.is_pinned desc, ts.sort_order asc, ts.updated_at desc), '[]'::jsonb)
  into v_topic_summaries
  from (
    select
      tp.id,
      tp.name,
      tp.slug,
      tp.description,
      tp.category,
      tp.icon,
      tp.accent_color,
      tp.is_pinned,
      tp.is_favorite,
      tp.status,
      tp.sort_order,
      tp.updated_at,
      tp.version,
      (select coalesce(array_agg(distinct tm.feature_key), '{}'::text[]) from public.topic_modules tm where tm.topic_id = tp.id and tm.is_enabled = true) as enabled_features,
      (select count(*) from public.tasks t where t.topic_id = tp.id and t.deleted_at is null) as total_tasks,
      (select count(*) from public.tasks t where t.topic_id = tp.id and t.deleted_at is null and (t.completed_at is not null or t.status = 'done')) as completed_tasks,
      (select coalesce(sum(s.accumulated_seconds), 0) from public.time_sessions s where s.topic_id = tp.id and s.started_at >= v_range_start) as tracked_seconds,
      (select count(*) from public.journal_entries je where je.topic_id = tp.id and je.deleted_at is null and je.is_draft = false) as journal_count,
      (select count(*) from public.custom_records cr where cr.topic_id = tp.id and cr.deleted_at is null) as record_count,
      (select count(*) from public.calculation_history ch where ch.topic_id = tp.id) as calculation_count,
      (select coalesce(round(avg(least(100, (g.current_value / nullif(g.target_value, 0)) * 100))::numeric, 1), 0) from public.goals g where g.topic_id = tp.id and g.status in ('active', 'completed')) as goal_progress_pct,
      (
        select coalesce(sum(case when lower(coalesce(cr.data ->> 'entry_type', '')) = 'income' then coalesce((cr.data ->> 'amount')::numeric, 0) else 0 end), 0)
        from public.custom_records cr
        join public.topic_modules tm on tm.id = cr.module_id
        where cr.topic_id = tp.id and cr.deleted_at is null and tm.feature_key = 'expense_tracking'
          and (cr.data ->> 'amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
      ) as finance_income,
      (
        select coalesce(sum(case when lower(coalesce(cr.data ->> 'entry_type', 'expense')) = 'expense' then coalesce((cr.data ->> 'amount')::numeric, 0) else 0 end), 0)
        from public.custom_records cr
        join public.topic_modules tm on tm.id = cr.module_id
        where cr.topic_id = tp.id and cr.deleted_at is null and tm.feature_key = 'expense_tracking'
          and (cr.data ->> 'amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
      ) as finance_expense
    from public.topics tp
    where tp.user_id = v_user_id and tp.deleted_at is null
  ) ts;

  select coalesce(jsonb_agg(row_to_json(ds) order by ds.day asc), '[]'::jsonb)
  into v_daily_series
  from (
    select
      g.day::date as day,
      coalesce((
        select round(sum(s.accumulated_seconds) / 60.0, 1)
        from public.time_sessions s
        where s.user_id = v_user_id and (s.started_at at time zone v_tz)::date = g.day::date
      ), 0) as minutes_tracked,
      coalesce((
        select count(*)
        from public.tasks t
        where t.user_id = v_user_id and t.deleted_at is null
          and t.completed_at is not null and (t.completed_at at time zone v_tz)::date = g.day::date
      ), 0) as tasks_completed,
      coalesce((
        select count(*)
        from public.activity_logs al
        where al.user_id = v_user_id and (al.occurred_at at time zone v_tz)::date = g.day::date
      ), 0) as activity_count
    from generate_series(v_local_today - (least(v_days, 90) - 1), v_local_today, interval '1 day') as g(day)
  ) ds;

  return jsonb_build_object(
    'counts', v_counts,
    'recent_journals', v_recent_journals,
    'upcoming_deadlines', v_upcoming_deadlines,
    'recent_activities', v_recent_activities,
    'topic_summaries', v_topic_summaries,
    'daily_series', v_daily_series,
    'timezone', v_tz,
    'days', v_days
  );
end;
$$;

-- 5. Single Topic Analytics Aggregation RPC
create or replace function public.get_topic_analytics_summary(
  p_topic_id uuid,
  p_days integer default 30,
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tz text := public.resolve_safe_timezone(p_timezone);
  v_days integer := greatest(1, least(365, coalesce(p_days, 30)));
  v_local_today date := (now() at time zone v_tz)::date;
  v_range_start timestamptz := ((v_local_today - (v_days - 1))::timestamp at time zone v_tz);
  v_summary jsonb;
  v_daily_series jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: authentication required';
  end if;

  if not exists (select 1 from public.topics where id = p_topic_id and user_id = v_user_id and deleted_at is null) then
    raise exception 'NOT_FOUND: Topic not found';
  end if;

  select jsonb_build_object(
    'total_tasks', (select count(*) from public.tasks where topic_id = p_topic_id and user_id = v_user_id and deleted_at is null),
    'completed_tasks', (select count(*) from public.tasks where topic_id = p_topic_id and user_id = v_user_id and deleted_at is null and (completed_at is not null or status = 'done')),
    'overdue_tasks', (select count(*) from public.tasks where topic_id = p_topic_id and user_id = v_user_id and deleted_at is null and completed_at is null and status <> 'done' and due_at < now()),
    'total_tracked_seconds', (select coalesce(sum(accumulated_seconds), 0) from public.time_sessions where topic_id = p_topic_id and user_id = v_user_id and started_at >= v_range_start),
    'today_tracked_seconds', (select coalesce(sum(accumulated_seconds), 0) from public.time_sessions where topic_id = p_topic_id and user_id = v_user_id and (started_at at time zone v_tz)::date = v_local_today),
    'journal_entries_count', (select count(*) from public.journal_entries where topic_id = p_topic_id and user_id = v_user_id and deleted_at is null and is_draft = false),
    'custom_records_count', (select count(*) from public.custom_records where topic_id = p_topic_id and user_id = v_user_id and deleted_at is null),
    'calculation_runs_count', (select count(*) from public.calculation_history where topic_id = p_topic_id and user_id = v_user_id),
    'active_goals', (select count(*) from public.goals where topic_id = p_topic_id and user_id = v_user_id and status = 'active'),
    'avg_goal_progress_pct', (
      select coalesce(round(avg(least(100, (current_value / nullif(target_value, 0)) * 100))::numeric, 1), 0)
      from public.goals where topic_id = p_topic_id and user_id = v_user_id and status in ('active', 'completed')
    ),
    'habit_checkins_range', (
      select count(*) from public.habit_checkins
      where topic_id = p_topic_id and user_id = v_user_id and checkin_date >= (v_local_today - (v_days - 1))
    )
  ) into v_summary;

  select coalesce(jsonb_agg(row_to_json(ds) order by ds.day asc), '[]'::jsonb)
  into v_daily_series
  from (
    select
      g.day::date as day,
      coalesce((
        select round(sum(s.accumulated_seconds) / 60.0, 1)
        from public.time_sessions s
        where s.topic_id = p_topic_id and s.user_id = v_user_id and (s.started_at at time zone v_tz)::date = g.day::date
      ), 0) as minutes_tracked,
      coalesce((
        select count(*)
        from public.tasks t
        where t.topic_id = p_topic_id and t.user_id = v_user_id and t.deleted_at is null
          and t.completed_at is not null and (t.completed_at at time zone v_tz)::date = g.day::date
      ), 0) as tasks_completed,
      coalesce((
        select count(*)
        from public.custom_records cr
        where cr.topic_id = p_topic_id and cr.user_id = v_user_id and cr.deleted_at is null
          and (cr.occurred_at at time zone v_tz)::date = g.day::date
      ), 0) as records_logged
    from generate_series(v_local_today - (least(v_days, 90) - 1), v_local_today, interval '1 day') as g(day)
  ) ds;

  return jsonb_build_object(
    'summary', v_summary,
    'daily_series', v_daily_series,
    'timezone', v_tz,
    'days', v_days
  );
end;
$$;

-- 6. Global Indexed Search RPC
create or replace function public.global_search_records(
  p_query text,
  p_limit integer default 25
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_q text := trim(coalesce(p_query, ''));
  v_escaped text;
  v_lim integer := greatest(1, least(50, coalesce(p_limit, 25)));
  v_results jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED: authentication required';
  end if;

  if char_length(v_q) < 1 then
    return '[]'::jsonb;
  end if;

  v_escaped := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  into v_results
  from (
    (
      select 'topic'::text as entity_type, tp.id as entity_id, tp.id as topic_id, tp.name as title,
             tp.category as subtitle, '/topics/' || tp.slug as href, tp.updated_at as sort_ts
      from public.topics tp
      where tp.user_id = v_user_id and tp.deleted_at is null
        and (tp.name ilike v_escaped escape '\' or tp.description ilike v_escaped escape '\')
      order by tp.updated_at desc
      limit 8
    )
    union all
    (
      select 'task'::text as entity_type, t.id as entity_id, t.topic_id, t.title,
             tp.name || ' • ' || t.status as subtitle, '/topics/' || tp.slug || '?tab=tasks' as href, t.updated_at as sort_ts
      from public.tasks t
      join public.topics tp on tp.id = t.topic_id and tp.user_id = t.user_id
      where t.user_id = v_user_id and t.deleted_at is null and tp.deleted_at is null
        and (t.title ilike v_escaped escape '\' or t.description ilike v_escaped escape '\')
      order by t.updated_at desc
      limit 8
    )
    union all
    (
      select 'journal'::text as entity_type, je.id as entity_id, je.topic_id,
             coalesce(nullif(trim(je.title), ''), 'Journal Entry (' || je.entry_date::text || ')') as title,
             tp.name as subtitle, '/topics/' || tp.slug || '?tab=journal' as href, je.updated_at as sort_ts
      from public.journal_entries je
      join public.topics tp on tp.id = je.topic_id and tp.user_id = je.user_id
      where je.user_id = v_user_id and je.deleted_at is null and tp.deleted_at is null
        and (je.title ilike v_escaped escape '\' or je.content_text ilike v_escaped escape '\')
      order by je.updated_at desc
      limit 8
    )
    union all
    (
      select 'record'::text as entity_type, cr.id as entity_id, cr.topic_id,
             coalesce(nullif(trim(cr.title), ''), 'Record') as title,
             tp.name as subtitle, '/topics/' || tp.slug || '?tab=records' as href, cr.updated_at as sort_ts
      from public.custom_records cr
      join public.topics tp on tp.id = cr.topic_id and tp.user_id = cr.user_id
      where cr.user_id = v_user_id and cr.deleted_at is null and tp.deleted_at is null
        and (cr.title ilike v_escaped escape '\' or cr.data::text ilike v_escaped escape '\')
      order by cr.updated_at desc
      limit 6
    )
    union all
    (
      select 'calculator'::text as entity_type, cd.id as entity_id, cd.topic_id, cd.name as title,
             tp.name as subtitle, '/topics/' || tp.slug || '?tab=calculators' as href, cd.updated_at as sort_ts
      from public.calculator_definitions cd
      join public.topics tp on tp.id = cd.topic_id and tp.user_id = cd.user_id
      where cd.user_id = v_user_id and cd.is_archived = false and tp.deleted_at is null
        and cd.name ilike v_escaped escape '\'
      order by cd.updated_at desc
      limit 6
    )
    union all
    (
      select 'tag'::text as entity_type, tg.id as entity_id, null::uuid as topic_id, '#' || tg.name as title,
             'Tag' as subtitle, '/dashboard?tag=' || tg.name as href, tg.created_at as sort_ts
      from public.tags tg
      where tg.user_id = v_user_id and tg.name ilike v_escaped escape '\'
      order by tg.created_at desc
      limit 5
    )
  ) r
  limit v_lim;

  return v_results;
end;
$$;

grant execute on function public.resolve_safe_timezone(text) to authenticated;
grant execute on function public.create_topic_atomic(jsonb, text) to authenticated;
grant execute on function public.duplicate_topic_atomic(uuid, text, text) to authenticated;
grant execute on function public.start_time_session_atomic(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.transition_time_session_atomic(uuid, text, integer) to authenticated;
grant execute on function public.get_global_dashboard_summary(integer, text) to authenticated;
grant execute on function public.get_topic_analytics_summary(uuid, integer, text) to authenticated;
grant execute on function public.global_search_records(text, integer) to authenticated;
