import type { z } from 'zod';

export type FeatureKey =
  | 'tasks'
  | 'lists'
  | 'journal'
  | 'notes'
  | 'activity_logs'
  | 'time_tracking'
  | 'custom_tables'
  | 'custom_forms'
  | 'calculators'
  | 'expense_tracking'
  | 'goals'
  | 'habits'
  | 'calendar'
  | 'attachments'
  | 'statistics'
  | 'charts';

export type ViewType =
  | 'dashboard'
  | 'list'
  | 'table'
  | 'kanban'
  | 'calendar'
  | 'timeline'
  | 'gallery'
  | 'charts'
  | 'activity';

export type CustomFieldType =
  | 'short_text'
  | 'long_text'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'duration'
  | 'dropdown'
  | 'multi_select'
  | 'checkbox'
  | 'rating'
  | 'url'
  | 'email'
  | 'tags'
  | 'attachments'
  | 'formula';

export interface ConfigQuestion {
  key: string;
  label: string;
  type: 'boolean' | 'select' | 'multi_select' | 'text' | 'number' | 'tags';
  options?: string[];
  defaultValue: unknown;
  helperText?: string;
}

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  aggregation: 'count' | 'sum' | 'avg' | 'pct';
  description: string;
}

export interface CustomFieldDraft {
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  is_required: boolean;
  is_unique?: boolean;
  is_visible_in_table?: boolean;
  default_value?: unknown;
  options?: string[];
  validation_rules?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  visibility_condition?: {
    dependsOnFieldKey: string;
    operator: 'eq' | 'neq' | 'truthy';
    value?: unknown;
  } | null;
  formula_expression?: string | null;
  sort_order: number;
}

export interface FeatureDefinition<TConfig = Record<string, unknown>> {
  key: FeatureKey;
  version: number;
  name: string;
  description: string;
  icon: string;
  category: 'execution' | 'knowledge' | 'tracking' | 'computation' | 'visualization' | 'files';
  allowMultiple: boolean;
  dependencies: FeatureKey[];
  supportedViews: ViewType[];
  defaultView: ViewType;
  supportedFieldTypes: CustomFieldType[];
  configSchema: z.ZodType<TConfig>;
  defaultConfig: TConfig;
  questionnaire: ConfigQuestion[];
  analyticsMetrics: MetricDefinition[];
}
