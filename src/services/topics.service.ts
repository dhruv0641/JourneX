import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomFieldDraft, FeatureKey, ViewType } from '@/engine/feature-registry/types';
import { AppConflictError } from '@/lib/validation/common';
import type { Database, Json } from '@/types/database.types';
import type {
  CalculatorDefinitionRow,
  CalculatorVersionRow,
  DashboardWidgetRow,
  ModuleFieldRow,
  ModuleViewRow,
  TopicModuleRow,
  TopicRow,
  TopicTemplateRow,
} from '@/types/domain';

export interface CreateTopicModuleInput {
  feature_key: FeatureKey;
  module_key: string;
  name: string;
  description?: string;
  icon?: string;
  feature_version?: number;
  is_enabled?: boolean;
  sort_order: number;
  config?: Record<string, unknown>;
  fields?: CustomFieldDraft[];
}

export interface CreateTopicPayload {
  name: string;
  slug?: string;
  description?: string;
  purpose?: string;
  category?: string;
  icon?: string;
  accent_color?: string;
  template_id?: string | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
  settings?: Record<string, unknown>;
  modules: CreateTopicModuleInput[];
  views: Array<{
    view_type: ViewType;
    name: string;
    sort_order: number;
    is_default: boolean;
    config?: Record<string, unknown>;
  }>;
  widgets?: Array<{
    widget_type: string;
    title: string;
    sort_order: number;
    config?: Record<string, unknown>;
  }>;
}

export interface TopicDetailBundle {
  topic: TopicRow;
  modules: TopicModuleRow[];
  fields: ModuleFieldRow[];
  views: ModuleViewRow[];
  widgets: DashboardWidgetRow[];
  calculators: CalculatorDefinitionRow[];
  calculatorVersions: CalculatorVersionRow[];
}

export async function listTopicTemplates(
  supabase: SupabaseClient<Database>,
): Promise<TopicTemplateRow[]> {
  const { data, error } = await supabase
    .from('topic_templates')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTopics(
  supabase: SupabaseClient<Database>,
  userId: string,
  status?: 'active' | 'archived',
): Promise<TopicRow[]> {
  let query = supabase
    .from('topics')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchTopicDetailBySlug(
  supabase: SupabaseClient<Database>,
  userId: string,
  slug: string,
): Promise<TopicDetailBundle | null> {
  const { data, error } = await supabase
    .from('topics')
    .select(
      '*, topic_modules(*, module_fields(*), calculator_definitions(*, calculator_versions(*))), module_views(*), dashboard_widgets(*)',
    )
    .eq('user_id', userId)
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { topic_modules, module_views, dashboard_widgets, ...topic } = data;
  const modules = topic_modules.map(
    ({ module_fields: _moduleFields, calculator_definitions: _calculatorDefinitions, ...module }) =>
      module,
  );
  const fields = topic_modules
    .flatMap((module) => module.module_fields)
    .filter((field) => !field.is_archived)
    .sort((a, b) => a.sort_order - b.sort_order);
  const calculators = topic_modules
    .flatMap((module) => module.calculator_definitions)
    .filter((calculator) => !calculator.is_archived)
    .map(({ calculator_versions: _calculatorVersions, ...calculator }) => calculator);
  const calculatorVersions = topic_modules
    .flatMap((module) => module.calculator_definitions)
    .flatMap((calculator) => calculator.calculator_versions)
    .sort((a, b) => b.version_number - a.version_number);

  return {
    topic,
    modules: modules.sort((a, b) => a.sort_order - b.sort_order),
    fields,
    views: module_views.sort((a, b) => a.sort_order - b.sort_order),
    widgets: dashboard_widgets
      .filter((widget) => widget.scope === 'topic')
      .sort((a, b) => a.sort_order - b.sort_order),
    calculators,
    calculatorVersions,
  };
}

export async function createTopicAtomic(
  supabase: SupabaseClient<Database>,
  payload: CreateTopicPayload,
  idempotencyKey?: string,
): Promise<{
  topic: TopicRow;
  modules: Array<{ id: string; module_key: string; feature_key: string }>;
  idempotent_replay: boolean;
}> {
  const { data, error } = await supabase.rpc('create_topic_atomic', {
    p_payload: payload as unknown as Json,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw new Error(error.message);
  return data as unknown as {
    topic: TopicRow;
    modules: Array<{ id: string; module_key: string; feature_key: string }>;
    idempotent_replay: boolean;
  };
}

export async function duplicateTopicAtomic(
  supabase: SupabaseClient<Database>,
  sourceTopicId: string,
  newName?: string,
  idempotencyKey?: string,
): Promise<{ topic: TopicRow }> {
  const { data, error } = await supabase.rpc('duplicate_topic_atomic', {
    p_source_topic_id: sourceTopicId,
    p_new_name: newName,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw new Error(error.message);
  return data as unknown as { topic: TopicRow };
}

export async function updateTopicWithVersion(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  patch: Partial<
    Pick<
      TopicRow,
      | 'name'
      | 'description'
      | 'purpose'
      | 'category'
      | 'icon'
      | 'accent_color'
      | 'is_pinned'
      | 'is_favorite'
      | 'status'
      | 'archived_at'
      | 'settings'
    >
  >,
  expectedVersion: number,
): Promise<TopicRow> {
  const { data, error } = await supabase
    .from('topics')
    .update({ ...patch, version: expectedVersion + 1 })
    .eq('id', topicId)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const { data: latest } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .eq('user_id', userId)
      .maybeSingle();
    throw new AppConflictError('This topic was updated in another tab or device.', latest);
  }
  return data;
}

export async function softDeleteTopic(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  expectedVersion: number,
): Promise<void> {
  const { data, error } = await supabase
    .from('topics')
    .update({ deleted_at: new Date().toISOString(), version: expectedVersion + 1 })
    .eq('id', topicId)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new AppConflictError('Topic modified concurrently before deletion.');
}

export async function updateTopicModuleWithVersion(
  supabase: SupabaseClient<Database>,
  userId: string,
  moduleId: string,
  patch: Partial<
    Pick<TopicModuleRow, 'name' | 'description' | 'is_enabled' | 'sort_order' | 'config'>
  >,
  expectedVersion: number,
): Promise<TopicModuleRow> {
  const { data, error } = await supabase
    .from('topic_modules')
    .update({ ...patch, version: expectedVersion + 1 })
    .eq('id', moduleId)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new AppConflictError('Module configuration was modified elsewhere.');
  return data;
}

export async function addTopicModule(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  input: CreateTopicModuleInput,
): Promise<TopicModuleRow> {
  const { data, error } = await supabase
    .from('topic_modules')
    .insert({
      user_id: userId,
      topic_id: topicId,
      feature_key: input.feature_key,
      module_key: input.module_key,
      name: input.name,
      description: input.description ?? '',
      icon: input.icon ?? 'box',
      feature_version: input.feature_version ?? 1,
      is_enabled: input.is_enabled ?? true,
      sort_order: input.sort_order,
      config: (input.config ?? {}) as NonNullable<Json>,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  if (input.fields && input.fields.length > 0) {
    const fieldRows = input.fields.map((f) => ({
      user_id: userId,
      topic_id: topicId,
      module_id: data.id,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      is_required: f.is_required,
      is_unique: f.is_unique ?? false,
      is_visible_in_table: f.is_visible_in_table ?? true,
      default_value: (f.default_value ?? null) as Json,
      options: (f.options ?? []) as NonNullable<Json>,
      validation_rules: (f.validation_rules ?? {}) as NonNullable<Json>,
      visibility_condition: (f.visibility_condition ?? null) as Json,
      formula_expression: f.formula_expression ?? null,
      sort_order: f.sort_order,
    }));
    const { error: fErr } = await supabase.from('module_fields').insert(fieldRows);
    if (fErr) throw new Error(fErr.message);
  }
  return data;
}

export async function upsertModuleField(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  moduleId: string,
  field: CustomFieldDraft & { id?: string },
): Promise<ModuleFieldRow> {
  if (field.id) {
    const { data, error } = await supabase
      .from('module_fields')
      .update({
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        is_visible_in_table: field.is_visible_in_table ?? true,
        options: (field.options ?? []) as NonNullable<Json>,
        validation_rules: (field.validation_rules ?? {}) as NonNullable<Json>,
        formula_expression: field.formula_expression ?? null,
        sort_order: field.sort_order,
      })
      .eq('id', field.id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('module_fields')
    .insert({
      user_id: userId,
      topic_id: topicId,
      module_id: moduleId,
      field_key: field.field_key,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required,
      is_visible_in_table: field.is_visible_in_table ?? true,
      options: (field.options ?? []) as NonNullable<Json>,
      validation_rules: (field.validation_rules ?? {}) as NonNullable<Json>,
      formula_expression: field.formula_expression ?? null,
      sort_order: field.sort_order,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveModuleField(
  supabase: SupabaseClient<Database>,
  userId: string,
  fieldId: string,
): Promise<void> {
  const { error } = await supabase
    .from('module_fields')
    .update({ is_archived: true })
    .eq('id', fieldId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function saveTopicViews(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  views: Array<{
    id?: string;
    view_type: ViewType;
    name: string;
    sort_order: number;
    is_default: boolean;
  }>,
): Promise<ModuleViewRow[]> {
  // Replace non-destructive view metadata cleanly
  const { error: delErr } = await supabase
    .from('module_views')
    .delete()
    .eq('topic_id', topicId)
    .eq('user_id', userId);
  if (delErr) throw new Error(delErr.message);

  const { data, error } = await supabase
    .from('module_views')
    .insert(
      views.map((v, idx) => ({
        user_id: userId,
        topic_id: topicId,
        view_type: v.view_type,
        name: v.name,
        sort_order: idx,
        is_default: v.is_default,
      })),
    )
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
