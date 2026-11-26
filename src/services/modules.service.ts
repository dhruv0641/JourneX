import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateFormulaSet, type FormulaDefinition } from '@/engine/formula-engine/evaluator';
import { htmlToPlainText, sanitizeFileName, sanitizeRichHtml } from '@/lib/security/sanitize';
import { AppConflictError, hashRequestPayload } from '@/lib/validation/common';
import type { Database, Json } from '@/types/database.types';
import type {
  ActivityLogRow,
  AttachmentRow,
  CalculationHistoryRow,
  CalculatorDefinitionRow,
  CalculatorVersionRow,
  CalendarEventRow,
  CustomRecordRow,
  DashboardWidgetRow,
  GlobalDashboardSummary,
  GlobalSearchResultItem,
  GoalRow,
  HabitCheckinRow,
  HabitRow,
  JournalEntryRow,
  TaskChecklistItemRow,
  TaskRow,
  TimeSessionRow,
  TopicAnalyticsSummary,
} from '@/types/domain';

/* ===================== DASHBOARD & SEARCH ===================== */

export async function fetchGlobalDashboardSummary(
  supabase: SupabaseClient<Database>,
  days: number = 30,
  timezone: string = 'UTC',
): Promise<GlobalDashboardSummary> {
  const { data, error } = await supabase.rpc('get_global_dashboard_summary', {
    p_days: days,
    p_timezone: timezone,
  });
  if (error) throw new Error(error.message);
  return data as unknown as GlobalDashboardSummary;
}

export async function fetchTopicAnalyticsSummary(
  supabase: SupabaseClient<Database>,
  topicId: string,
  days: number = 30,
  timezone: string = 'UTC',
): Promise<TopicAnalyticsSummary> {
  const { data, error } = await supabase.rpc('get_topic_analytics_summary', {
    p_topic_id: topicId,
    p_days: days,
    p_timezone: timezone,
  });
  if (error) throw new Error(error.message);
  return data as unknown as TopicAnalyticsSummary;
}

export async function runGlobalSearch(
  supabase: SupabaseClient<Database>,
  query: string,
  limit: number = 25,
): Promise<GlobalSearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data, error } = await supabase.rpc('global_search_records', {
    p_query: trimmed,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data as unknown as GlobalSearchResultItem[]) ?? [];
}

export async function listGlobalDashboardWidgets(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DashboardWidgetRow[]> {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('user_id', userId)
    .eq('scope', 'global')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveGlobalDashboardWidgets(
  supabase: SupabaseClient<Database>,
  userId: string,
  widgets: Array<{
    widget_type: string;
    title: string;
    sort_order: number;
    is_visible: boolean;
    layout: { colSpan: number; rowSpan: number };
    config?: Record<string, unknown>;
  }>,
): Promise<DashboardWidgetRow[]> {
  const { error: delErr } = await supabase
    .from('dashboard_widgets')
    .delete()
    .eq('user_id', userId)
    .eq('scope', 'global');
  if (delErr) throw new Error(delErr.message);

  if (widgets.length === 0) return [];

  const { data, error } = await supabase
    .from('dashboard_widgets')
    .insert(
      widgets.map((w, idx) => ({
        user_id: userId,
        scope: 'global',
        topic_id: null,
        widget_type: w.widget_type,
        title: w.title,
        sort_order: idx,
        is_visible: w.is_visible,
        layout: w.layout as NonNullable<Json>,
        config: (w.config ?? {}) as NonNullable<Json>,
      })),
    )
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* ===================== TASKS & CHECKLISTS ===================== */

export async function listTopicTasks(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  options?: { moduleId?: string; status?: string; priority?: string; search?: string; page?: number; pageSize?: number },
): Promise<{ tasks: TaskRow[]; checklistsByTask: Record<string, TaskChecklistItemRow[]>; total: number }> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.moduleId) query = query.eq('module_id', options.moduleId);
  if (options?.status && options.status !== 'all') query = query.eq('status', options.status);
  if (options?.priority && options.priority !== 'all') query = query.eq('priority', options.priority);
  if (options?.search?.trim()) query = query.ilike('title', `%${options.search.trim()}%`);

  const { data: tasks, count, error } = await query;
  if (error) throw new Error(error.message);

  const taskList = tasks ?? [];
  const checklistsByTask: Record<string, TaskChecklistItemRow[]> = {};

  if (taskList.length > 0) {
    const { data: items, error: cErr } = await supabase
      .from('task_checklist_items')
      .select('*')
      .eq('user_id', userId)
      .in('task_id', taskList.map((t) => t.id))
      .order('sort_order', { ascending: true });
    if (cErr) throw new Error(cErr.message);
    for (const item of items ?? []) {
      checklistsByTask[item.task_id] ??= [];
      checklistsByTask[item.task_id]!.push(item);
    }
  }

  return { tasks: taskList, checklistsByTask, total: count ?? taskList.length };
}

export async function createTask(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    topic_id: string;
    module_id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_at?: string | null;
    estimated_minutes?: number | null;
    recurrence_rule?: Record<string, unknown> | null;
  },
): Promise<TaskRow> {
  const status = input.status ?? 'todo';
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      title: input.title.trim(),
      description: input.description ?? '',
      status,
      priority: input.priority ?? 'medium',
      due_at: input.due_at ?? null,
      completed_at: status === 'done' ? new Date().toISOString() : null,
      estimated_minutes: input.estimated_minutes ?? null,
      recurrence_rule: (input.recurrence_rule ?? null) as Json,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await supabase.from('activity_logs').insert({
    user_id: userId,
    topic_id: input.topic_id,
    module_id: input.module_id,
    source: 'automatic',
    category: 'tasks',
    title: `Created task "${data.title}"`,
  });

  return data;
}

export async function updateTaskWithVersion(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskId: string,
  patch: Partial<Pick<TaskRow, 'title' | 'description' | 'status' | 'priority' | 'due_at' | 'completed_at' | 'estimated_minutes' | 'actual_minutes' | 'sort_order'>>,
  expectedVersion: number,
): Promise<TaskRow> {
  const nextPatch = { ...patch };
  if (patch.status !== undefined && patch.completed_at === undefined) {
    nextPatch.completed_at = patch.status === 'done' ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...nextPatch, version: expectedVersion + 1 })
    .eq('id', taskId)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const { data: latest } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    throw new AppConflictError('This task was updated in another session.', latest);
  }
  return data;
}

export async function softDeleteTask(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskId: string,
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function addChecklistItem(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  taskId: string,
  title: string,
): Promise<TaskChecklistItemRow> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({ user_id: userId, topic_id: topicId, task_id: taskId, title: title.trim() })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleChecklistItem(
  supabase: SupabaseClient<Database>,
  userId: string,
  itemId: string,
  isCompleted: boolean,
): Promise<TaskChecklistItemRow> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .update({ is_completed: isCompleted })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ===================== JOURNAL & NOTES ===================== */

export async function listJournalEntries(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  moduleId?: string,
  search?: string,
): Promise<JournalEntryRow[]> {
  let query = supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  if (moduleId) query = query.eq('module_id', moduleId);
  if (search?.trim()) {
    const q = search.trim();
    query = query.or(`title.ilike.%${q}%,content_text.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveJournalEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    id?: string;
    topic_id: string;
    module_id: string;
    title: string;
    content_html: string;
    category?: string | null;
    mood?: string | null;
    entry_date?: string;
    is_draft?: boolean;
    template_name?: string | null;
    expectedVersion?: number;
  },
): Promise<JournalEntryRow> {
  const cleanHtml = sanitizeRichHtml(input.content_html);
  const plainText = htmlToPlainText(cleanHtml);

  if (input.id && input.expectedVersion !== undefined) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        title: input.title.trim(),
        content_html: cleanHtml,
        content_text: plainText,
        category: input.category ?? null,
        mood: input.mood ?? null,
        entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
        is_draft: input.is_draft ?? false,
        template_name: input.template_name ?? null,
        version: input.expectedVersion + 1,
      })
      .eq('id', input.id)
      .eq('user_id', userId)
      .eq('version', input.expectedVersion)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      const { data: latest } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', input.id)
        .maybeSingle();
      throw new AppConflictError('This journal entry was edited in another session.', latest);
    }
    return data;
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      title: input.title.trim(),
      content_html: cleanHtml,
      content_text: plainText,
      category: input.category ?? null,
      mood: input.mood ?? null,
      entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
      is_draft: input.is_draft ?? false,
      template_name: input.template_name ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  if (!input.is_draft) {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      source: 'automatic',
      category: 'journal',
      title: `Published journal "${data.title || data.entry_date}"`,
    });
  }

  return data;
}

export async function deleteJournalEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  entryId: string,
): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/* ===================== ACTIVITY LOGS & TIME SESSIONS ===================== */

export async function listActivityLogs(
  supabase: SupabaseClient<Database>,
  userId: string,
  options?: { topicId?: string; category?: string; limit?: number },
): Promise<ActivityLogRow[]> {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(options?.limit ?? 60);

  if (options?.topicId) query = query.eq('topic_id', options.topicId);
  if (options?.category && options.category !== 'all') query = query.eq('category', options.category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createActivityLog(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    topic_id: string;
    module_id?: string | null;
    category?: string;
    title: string;
    duration_minutes?: number | null;
    occurred_at?: string;
    details?: Record<string, unknown>;
  },
): Promise<ActivityLogRow> {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id ?? null,
      source: 'manual',
      category: input.category ?? 'general',
      title: input.title.trim(),
      duration_minutes: input.duration_minutes ?? null,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
      details: (input.details ?? {}) as NonNullable<Json>,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listTimeSessions(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId?: string,
): Promise<TimeSessionRow[]> {
  let query = supabase
    .from('time_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(60);
  if (topicId) query = query.eq('topic_id', topicId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function startTimeSessionAtomic(
  supabase: SupabaseClient<Database>,
  input: { topic_id: string; module_id: string; task_id?: string | null; description?: string; idempotencyKey?: string },
): Promise<TimeSessionRow> {
  const { data, error } = await supabase.rpc('start_time_session_atomic', {
    p_topic_id: input.topic_id,
    p_module_id: input.module_id,
    p_task_id: input.task_id ?? undefined,
    p_description: input.description ?? '',
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error(error.message);
  return (data as unknown as { session: TimeSessionRow }).session;
}

export async function transitionTimeSessionAtomic(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  action: 'pause' | 'resume' | 'stop',
  expectedVersion: number,
): Promise<TimeSessionRow> {
  const { data, error } = await supabase.rpc('transition_time_session_atomic', {
    p_session_id: sessionId,
    p_action: action,
    p_expected_version: expectedVersion,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createManualTimeSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    topic_id: string;
    module_id: string;
    description: string;
    durationMinutes: number;
    startedAt?: string;
  },
): Promise<TimeSessionRow> {
  const start = input.startedAt ? new Date(input.startedAt) : new Date();
  const seconds = Math.max(60, Math.round(input.durationMinutes * 60));
  const end = new Date(start.getTime() + seconds * 1000);

  const { data, error } = await supabase
    .from('time_sessions')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      description: input.description.trim() || 'Manual time entry',
      status: 'completed',
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      accumulated_seconds: seconds,
      is_manual: true,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await supabase.from('activity_logs').insert({
    user_id: userId,
    topic_id: input.topic_id,
    module_id: input.module_id,
    source: 'automatic',
    category: 'time_tracking',
    title: data.description,
    duration_minutes: Math.max(1, Math.round(seconds / 60)),
    occurred_at: data.started_at,
  });

  return data;
}

/* ===================== CUSTOM RECORDS & CSV BATCH IMPORT ===================== */

export async function listCustomRecords(
  supabase: SupabaseClient<Database>,
  userId: string,
  moduleId: string,
  options?: { page?: number; pageSize?: number; search?: string },
): Promise<{ records: CustomRecordRow[]; total: number }> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('custom_records')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .range(from, to);

  if (options?.search?.trim()) {
    query = query.ilike('title', `%${options.search.trim()}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { records: data ?? [], total: count ?? 0 };
}

export async function createCustomRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    topic_id: string;
    module_id: string;
    title: string;
    data: Record<string, unknown>;
    occurred_at?: string;
    import_hash?: string | null;
  },
): Promise<CustomRecordRow> {
  const { data, error } = await supabase
    .from('custom_records')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      title: input.title.trim(),
      data: input.data as NonNullable<Json>,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
      import_hash: input.import_hash ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCustomRecordWithVersion(
  supabase: SupabaseClient<Database>,
  userId: string,
  recordId: string,
  patch: { title?: string; data?: Record<string, unknown>; occurred_at?: string },
  expectedVersion: number,
): Promise<CustomRecordRow> {
  const { data, error } = await supabase
    .from('custom_records')
    .update({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.data !== undefined ? { data: patch.data as NonNullable<Json> } : {}),
      ...(patch.occurred_at !== undefined ? { occurred_at: patch.occurred_at } : {}),
      version: expectedVersion + 1,
    })
    .eq('id', recordId)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new AppConflictError('This record was modified in another session.');
  return data;
}

export async function deleteCustomRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  recordId: string,
): Promise<void> {
  const { error } = await supabase
    .from('custom_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function importCustomRecordsBatch(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  moduleId: string,
  rows: Array<{ title: string; data: Record<string, unknown>; occurred_at?: string }>,
): Promise<{ inserted: number; skippedDuplicates: number }> {
  const BATCH_SIZE = 50;
  let inserted = 0;
  let skippedDuplicates = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      user_id: userId,
      topic_id: topicId,
      module_id: moduleId,
      title: r.title.trim(),
      data: r.data as NonNullable<Json>,
      occurred_at: r.occurred_at ?? new Date().toISOString(),
      import_hash: hashRequestPayload({ moduleId, title: r.title.trim(), data: r.data }),
    }));

    const hashes = chunk.map((c) => c.import_hash);
    const { data: existing } = await supabase
      .from('custom_records')
      .select('import_hash')
      .eq('module_id', moduleId)
      .eq('user_id', userId)
      .in('import_hash', hashes)
      .is('deleted_at', null);

    const existingSet = new Set((existing ?? []).map((e) => e.import_hash).filter(Boolean));
    const uniqueToInsert = chunk.filter((c) => !existingSet.has(c.import_hash));
    skippedDuplicates += chunk.length - uniqueToInsert.length;

    if (uniqueToInsert.length > 0) {
      const { error } = await supabase.from('custom_records').insert(uniqueToInsert);
      if (error) throw new Error(error.message);
      inserted += uniqueToInsert.length;
    }
  }

  return { inserted, skippedDuplicates };
}

/* ===================== CALCULATORS ===================== */

export async function listCalculatorHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
  calculatorId: string,
): Promise<CalculationHistoryRow[]> {
  const { data, error } = await supabase
    .from('calculation_history')
    .select('*')
    .eq('user_id', userId)
    .eq('calculator_id', calculatorId)
    .order('calculated_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createOrUpdateCalculator(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    calculatorId?: string;
    topic_id: string;
    module_id: string;
    name: string;
    description?: string;
    inputs_schema: Array<{ key: string; label: string; type: string; unit?: string; defaultValue: number; min?: number; max?: number }>;
    outputs_schema: Array<{ key: string; label: string; unit?: string; precision: number; monetary?: boolean }>;
    formulas: FormulaDefinition[];
    change_note?: string;
  },
): Promise<{ definition: CalculatorDefinitionRow; version: CalculatorVersionRow }> {
  // Validate formulas strictly using AST evaluator before saving
  const sampleInputs: Record<string, number> = {};
  for (const field of input.inputs_schema) {
    sampleInputs[field.key] = Number.isFinite(field.defaultValue) ? field.defaultValue : 1;
  }
  evaluateFormulaSet(input.formulas, sampleInputs);

  if (input.calculatorId) {
    const { data: def, error: dErr } = await supabase
      .from('calculator_definitions')
      .select('*')
      .eq('id', input.calculatorId)
      .eq('user_id', userId)
      .single();
    if (dErr || !def) throw new Error(dErr?.message ?? 'Calculator not found');

    const nextVer = def.current_version + 1;
    const { data: ver, error: vErr } = await supabase
      .from('calculator_versions')
      .insert({
        user_id: userId,
        topic_id: input.topic_id,
        calculator_id: def.id,
        version_number: nextVer,
        inputs_schema: input.inputs_schema as unknown as NonNullable<Json>,
        outputs_schema: input.outputs_schema as unknown as NonNullable<Json>,
        formulas: input.formulas as unknown as NonNullable<Json>,
        change_note: input.change_note ?? `Updated to v${nextVer}`,
      })
      .select('*')
      .single();
    if (vErr) throw new Error(vErr.message);

    const { data: updatedDef, error: uErr } = await supabase
      .from('calculator_definitions')
      .update({
        name: input.name.trim(),
        description: input.description ?? '',
        current_version: nextVer,
        version: def.version + 1,
      })
      .eq('id', def.id)
      .eq('user_id', userId)
      .eq('version', def.version)
      .select('*')
      .single();
    if (uErr) throw new Error(uErr.message);

    return { definition: updatedDef, version: ver };
  }

  const { data: createdDef, error: cdErr } = await supabase
    .from('calculator_definitions')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      name: input.name.trim(),
      description: input.description ?? '',
      current_version: 1,
    })
    .select('*')
    .single();
  if (cdErr) throw new Error(cdErr.message);

  const { data: createdVer, error: cvErr } = await supabase
    .from('calculator_versions')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      calculator_id: createdDef.id,
      version_number: 1,
      inputs_schema: input.inputs_schema as unknown as NonNullable<Json>,
      outputs_schema: input.outputs_schema as unknown as NonNullable<Json>,
      formulas: input.formulas as unknown as NonNullable<Json>,
      change_note: input.change_note ?? 'Initial version',
    })
    .select('*')
    .single();
  if (cvErr) throw new Error(cvErr.message);

  return { definition: createdDef, version: createdVer };
}

export async function saveCalculationRun(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    topic_id: string;
    calculator_id: string;
    calculator_version_id: string;
    inputs: Record<string, number>;
    formulas: FormulaDefinition[];
    label?: string;
  },
): Promise<CalculationHistoryRow> {
  const outputs = evaluateFormulaSet(input.formulas, input.inputs);
  const { data, error } = await supabase
    .from('calculation_history')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      calculator_id: input.calculator_id,
      calculator_version_id: input.calculator_version_id,
      inputs: input.inputs as NonNullable<Json>,
      outputs: outputs as NonNullable<Json>,
      label: input.label?.trim() ?? '',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ===================== GOALS, HABITS & CALENDAR ===================== */

export async function listGoals(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createGoal(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    topic_id: string;
    module_id: string;
    title: string;
    period_type: 'daily' | 'weekly' | 'monthly' | 'custom';
    target_value: number;
    current_value?: number;
    unit?: string;
    end_date?: string | null;
  },
): Promise<GoalRow> {
  const current = input.current_value ?? 0;
  const status = current >= input.target_value ? 'completed' : 'active';
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      title: input.title.trim(),
      period_type: input.period_type,
      target_value: input.target_value,
      current_value: current,
      unit: input.unit ?? '',
      end_date: input.end_date ?? null,
      status,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateGoalProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: string,
  currentValue: number,
  targetValue: number,
  expectedVersion: number,
): Promise<GoalRow> {
  const nextStatus = currentValue >= targetValue ? 'completed' : 'active';
  const { data, error } = await supabase
    .from('goals')
    .update({
      current_value: Math.max(0, currentValue),
      status: nextStatus,
      version: expectedVersion + 1,
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new AppConflictError('Goal updated concurrently.');
  return data;
}

export async function deleteGoal(
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: string,
): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', goalId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function listHabitsAndCheckins(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
): Promise<{ habits: HabitRow[]; checkins: HabitCheckinRow[] }> {
  const [habitsRes, checkinsRes] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .order('checkin_date', { ascending: false })
      .limit(400),
  ]);
  if (habitsRes.error) throw new Error(habitsRes.error.message);
  if (checkinsRes.error) throw new Error(checkinsRes.error.message);
  return { habits: habitsRes.data ?? [], checkins: checkinsRes.data ?? [] };
}

export async function createHabit(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: { topic_id: string; module_id: string; title: string; schedule_type?: 'daily' | 'weekdays' | 'custom' },
): Promise<HabitRow> {
  const scheduleDays =
    input.schedule_type === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id,
      title: input.title.trim(),
      schedule_type: input.schedule_type ?? 'daily',
      schedule_days: scheduleDays,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleHabitCheckin(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  habitId: string,
  checkinDate: string,
  checked: boolean,
): Promise<void> {
  if (checked) {
    const { error } = await supabase.from('habit_checkins').upsert(
      {
        user_id: userId,
        topic_id: topicId,
        habit_id: habitId,
        checkin_date: checkinDate,
        value: 1,
      },
      { onConflict: 'habit_id,checkin_date' },
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('habit_checkins')
      .delete()
      .eq('habit_id', habitId)
      .eq('checkin_date', checkinDate)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
}

export async function listCalendarEvents(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
): Promise<CalendarEventRow[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .order('starts_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCalendarEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    topic_id: string;
    module_id?: string | null;
    title: string;
    description?: string;
    starts_at: string;
    ends_at: string;
    reminder_minutes?: number | null;
  },
): Promise<CalendarEventRow> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      topic_id: input.topic_id,
      module_id: input.module_id ?? null,
      title: input.title.trim(),
      description: input.description ?? '',
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      reminder_minutes: input.reminder_minutes ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  if (input.reminder_minutes !== null && input.reminder_minutes !== undefined) {
    await supabase.from('notifications').insert({
      user_id: userId,
      topic_id: input.topic_id,
      kind: 'reminder',
      title: `Reminder: ${data.title}`,
      body: `Scheduled for ${new Date(data.starts_at).toLocaleString()}`,
      scheduled_for: new Date(
        new Date(data.starts_at).getTime() - input.reminder_minutes * 60_000,
      ).toISOString(),
    });
  }

  return data;
}

/* ===================== ATTACHMENTS (PRIVATE BUCKET + SIGNED URLS) ===================== */

export async function listAttachments(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
): Promise<AttachmentRow[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function uploadTopicAttachment(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  file: File,
  entityType: 'topic' | 'task' | 'journal_entry' | 'custom_record' = 'topic',
  entityId?: string,
): Promise<AttachmentRow> {
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error('File must be between 1 byte and 10 MB.');
  }
  const safeName = sanitizeFileName(file.name);
  const targetEntityId = entityId ?? topicId;
  const path = `${userId}/${topicId}/${entityType}/${targetEntityId}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from('nexora-attachments')
    .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
  if (upErr) throw new Error(upErr.message);

  const { data, error: dbErr } = await supabase
    .from('attachments')
    .insert({
      user_id: userId,
      topic_id: topicId,
      entity_type: entityType,
      entity_id: targetEntityId,
      bucket_id: 'nexora-attachments',
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
    })
    .select('*')
    .single();
  if (dbErr) throw new Error(dbErr.message);
  return data;
}

export async function getAttachmentSignedUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('nexora-attachments')
    .createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Unable to generate signed download link');
  }
  return data.signedUrl;
}

export async function deleteAttachment(
  supabase: SupabaseClient<Database>,
  userId: string,
  attachment: AttachmentRow,
): Promise<void> {
  await supabase.storage.from(attachment.bucket_id).remove([attachment.storage_path]);
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachment.id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/* ===================== EXPORT ALL USER DATA ===================== */

export async function exportWorkspaceBundle(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Record<string, unknown>> {
  const [
    profile,
    preferences,
    topics,
    modules,
    fields,
    views,
    tasks,
    journals,
    records,
    sessions,
    goals,
    habits,
    checkins,
    calculators,
    calcHistory,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('topics').select('*').eq('user_id', userId).is('deleted_at', null),
    supabase.from('topic_modules').select('*').eq('user_id', userId),
    supabase.from('module_fields').select('*').eq('user_id', userId),
    supabase.from('module_views').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId).is('deleted_at', null),
    supabase.from('journal_entries').select('*').eq('user_id', userId).is('deleted_at', null),
    supabase.from('custom_records').select('*').eq('user_id', userId).is('deleted_at', null),
    supabase.from('time_sessions').select('*').eq('user_id', userId),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('habit_checkins').select('*').eq('user_id', userId),
    supabase.from('calculator_definitions').select('*').eq('user_id', userId),
    supabase.from('calculation_history').select('*').eq('user_id', userId),
  ]);

  return {
    exported_at: new Date().toISOString(),
    schema_version: 1,
    profile: profile.data,
    preferences: preferences.data,
    topics: topics.data ?? [],
    modules: modules.data ?? [],
    fields: fields.data ?? [],
    views: views.data ?? [],
    tasks: tasks.data ?? [],
    journal_entries: journals.data ?? [],
    custom_records: records.data ?? [],
    time_sessions: sessions.data ?? [],
    goals: goals.data ?? [],
    habits: habits.data ?? [],
    habit_checkins: checkins.data ?? [],
    calculators: calculators.data ?? [],
    calculation_history: calcHistory.data ?? [],
  };
}
