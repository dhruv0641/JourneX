import { z } from 'zod';
import type {
  CustomFieldType,
  FeatureDefinition,
  FeatureKey,
  ViewType,
} from '@/engine/feature-registry/types';

export const ALL_CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  'short_text',
  'long_text',
  'integer',
  'decimal',
  'currency',
  'percentage',
  'date',
  'datetime',
  'duration',
  'dropdown',
  'multi_select',
  'checkbox',
  'rating',
  'url',
  'email',
  'tags',
  'attachments',
  'formula',
];

export const ALL_VIEW_TYPES: Array<{ type: ViewType; label: string; description: string }> = [
  { type: 'dashboard', label: 'Overview', description: 'KPI cards, summaries, and trend widgets' },
  { type: 'list', label: 'List', description: 'Focused item list with quick filters' },
  { type: 'table', label: 'Table', description: 'Structured spreadsheet table with sorting & CSV export' },
  { type: 'kanban', label: 'Kanban', description: 'Status columns with drag-and-keyboard cards' },
  { type: 'calendar', label: 'Calendar', description: 'Monthly, weekly, and daily schedule grid' },
  { type: 'timeline', label: 'Timeline', description: 'Chronological stream of milestones & sessions' },
  { type: 'gallery', label: 'Gallery', description: 'Visual card & attachment grid' },
  { type: 'charts', label: 'Charts', description: 'Interactive charts with accessible table fallback' },
  { type: 'activity', label: 'Activity', description: 'Manual and automatic operational activity log' },
];

const genericObjectSchema = z.record(z.string(), z.unknown());

const tasksConfigSchema = z.object({
  statuses: z.array(z.string().min(1)).min(2).default(['todo', 'in_progress', 'done']),
  enableSubtasks: z.boolean().default(true),
  enableEstimatedTime: z.boolean().default(true),
  enableRecurring: z.boolean().default(true),
  enableKanban: z.boolean().default(true),
  enablePriorities: z.boolean().default(true),
  preferredView: z.enum(['list', 'kanban', 'calendar']).default('list'),
});

const journalConfigSchema = z.object({
  enableMood: z.boolean().default(true),
  categories: z.array(z.string()).default(['Reflection', 'Progress', 'Review']),
  defaultTemplate: z.string().default('Daily Check-in'),
  enableAttachments: z.boolean().default(true),
  autosaveDrafts: z.boolean().default(true),
});

const timeTrackingConfigSchema = z.object({
  allowManualEntries: z.boolean().default(true),
  requireDescription: z.boolean().default(false),
  dailyTargetMinutes: z.number().int().min(0).max(1440).default(60),
});

const customTableConfigSchema = z.object({
  enableCsvImport: z.boolean().default(true),
  enableCsvExport: z.boolean().default(true),
  pageSize: z.number().int().min(10).max(100).default(25),
});

const expenseTrackingConfigSchema = z.object({
  currency: z.string().min(1).max(8).default('USD'),
  monthlyBudget: z.number().min(0).default(0),
  enableCategories: z.boolean().default(true),
});

const calculatorConfigSchema = z.object({
  precision: z.number().int().min(0).max(6).default(2),
  saveHistory: z.boolean().default(true),
  showHistoryChart: z.boolean().default(true),
  calculator: genericObjectSchema.optional(),
});

const goalsConfigSchema = z.object({
  defaultPeriod: z.enum(['daily', 'weekly', 'monthly', 'custom']).default('weekly'),
  showProgressBars: z.boolean().default(true),
});

const habitsConfigSchema = z.object({
  defaultSchedule: z.enum(['daily', 'weekdays', 'custom']).default('daily'),
  showHeatmap: z.boolean().default(true),
});

const calendarConfigSchema = z.object({
  defaultMode: z.enum(['month', 'week', 'day']).default('month'),
  enableReminders: z.boolean().default(true),
});

const statisticsConfigSchema = z.object({
  defaultRangeDays: z.number().int().min(1).max(365).default(30),
  aggregationMode: z.enum(['sum', 'avg', 'count']).default('sum'),
});

const chartsConfigSchema = z.object({
  defaultChartType: z.enum(['line', 'bar', 'area', 'donut', 'scatter']).default('area'),
  showDataTableToggle: z.boolean().default(true),
});

export const FEATURE_REGISTRY: Record<FeatureKey, FeatureDefinition> = {
  tasks: {
    key: 'tasks',
    version: 1,
    name: 'Tasks & Kanban',
    description: 'Manage tasks, subtasks, checklists, priorities, due dates, recurring schedules, and Kanban boards.',
    icon: 'check-square',
    category: 'execution',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['list', 'kanban', 'calendar', 'dashboard'],
    defaultView: 'list',
    supportedFieldTypes: ['short_text', 'date', 'dropdown', 'checkbox', 'duration', 'tags'],
    configSchema: tasksConfigSchema,
    defaultConfig: tasksConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'preferredView',
        label: 'Default task view',
        type: 'select',
        options: ['list', 'kanban', 'calendar'],
        defaultValue: 'list',
      },
      {
        key: 'enableSubtasks',
        label: 'Enable subtask checklists',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableEstimatedTime',
        label: 'Track estimated & actual minutes',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableRecurring',
        label: 'Support recurring tasks',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'total_tasks', label: 'Total Tasks', unit: 'tasks', aggregation: 'count', description: 'Active non-deleted tasks in topic' },
      { key: 'completed_tasks', label: 'Completed Tasks', unit: 'tasks', aggregation: 'count', description: 'Tasks marked done' },
      { key: 'completion_rate', label: 'Completion Rate', unit: '%', aggregation: 'pct', description: 'Completed divided by total tasks' },
    ],
  },
  lists: {
    key: 'lists',
    version: 1,
    name: 'Structured Lists',
    description: 'Lightweight checklists, reading queues, and categorized item collections.',
    icon: 'list-checks',
    category: 'execution',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['list', 'table', 'gallery'],
    defaultView: 'list',
    supportedFieldTypes: ALL_CUSTOM_FIELD_TYPES,
    configSchema: customTableConfigSchema,
    defaultConfig: customTableConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'enableCsvExport',
        label: 'Enable CSV export',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'list_items', label: 'List Items', unit: 'items', aggregation: 'count', description: 'Total items in list' },
    ],
  },
  journal: {
    key: 'journal',
    version: 1,
    name: 'Journal & Reflections',
    description: 'Rich-text daily entries with mood tracking, categories, templates, draft autosaving, and attachments.',
    icon: 'notebook-pen',
    category: 'knowledge',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['list', 'timeline', 'calendar'],
    defaultView: 'list',
    supportedFieldTypes: ['short_text', 'long_text', 'date', 'dropdown', 'tags', 'attachments'],
    configSchema: journalConfigSchema,
    defaultConfig: journalConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'enableMood',
        label: 'Track entry mood',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'autosaveDrafts',
        label: 'Enable automatic draft saving',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'defaultTemplate',
        label: 'Default reflection prompt',
        type: 'text',
        defaultValue: 'Daily Check-in',
      },
    ],
    analyticsMetrics: [
      { key: 'journal_entries', label: 'Journal Entries', unit: 'entries', aggregation: 'count', description: 'Published journal entries' },
    ],
  },
  notes: {
    key: 'notes',
    version: 1,
    name: 'Knowledge Notes',
    description: 'Structured reference notes, snippets, and tagged documentation inside a topic.',
    icon: 'file-text',
    category: 'knowledge',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['list', 'gallery'],
    defaultView: 'list',
    supportedFieldTypes: ['short_text', 'long_text', 'tags', 'attachments'],
    configSchema: journalConfigSchema,
    defaultConfig: { ...journalConfigSchema.parse({}), enableMood: false, defaultTemplate: 'Reference Note' },
    questionnaire: [
      {
        key: 'enableAttachments',
        label: 'Allow note attachments',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'notes_count', label: 'Notes', unit: 'notes', aggregation: 'count', description: 'Saved topic notes' },
    ],
  },
  activity_logs: {
    key: 'activity_logs',
    version: 1,
    name: 'Activity Logs',
    description: 'Chronological stream of manual logs and automatic workspace events with duration and category filters.',
    icon: 'activity',
    category: 'tracking',
    allowMultiple: false,
    dependencies: [],
    supportedViews: ['activity', 'timeline', 'charts'],
    defaultView: 'activity',
    supportedFieldTypes: ['short_text', 'datetime', 'duration', 'dropdown'],
    configSchema: genericObjectSchema,
    defaultConfig: {},
    questionnaire: [],
    analyticsMetrics: [
      { key: 'activity_count', label: 'Activity Events', unit: 'events', aggregation: 'count', description: 'Logged events' },
    ],
  },
  time_tracking: {
    key: 'time_tracking',
    version: 1,
    name: 'Time Tracking',
    description: 'Cross-device synced focus timer (start, pause, resume, stop) plus manual session logging.',
    icon: 'clock',
    category: 'tracking',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['list', 'timeline', 'charts', 'dashboard'],
    defaultView: 'list',
    supportedFieldTypes: ['duration', 'datetime', 'short_text'],
    configSchema: timeTrackingConfigSchema,
    defaultConfig: timeTrackingConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'dailyTargetMinutes',
        label: 'Daily focus target (minutes)',
        type: 'number',
        defaultValue: 60,
      },
      {
        key: 'allowManualEntries',
        label: 'Allow manual time log entries',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'tracked_hours', label: 'Tracked Time', unit: 'hrs', aggregation: 'sum', description: 'Total tracked duration' },
    ],
  },
  custom_tables: {
    key: 'custom_tables',
    version: 1,
    name: 'Custom Tables & Fields',
    description: 'Configurable database-backed tables supporting 18 typed fields, sorting, filtering, and CSV import/export.',
    icon: 'table-2',
    category: 'tracking',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['table', 'list', 'gallery', 'charts'],
    defaultView: 'table',
    supportedFieldTypes: ALL_CUSTOM_FIELD_TYPES,
    configSchema: customTableConfigSchema,
    defaultConfig: customTableConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'enableCsvImport',
        label: 'Enable validated CSV import',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableCsvExport',
        label: 'Enable CSV/JSON export',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'custom_records', label: 'Table Records', unit: 'rows', aggregation: 'count', description: 'Stored custom rows' },
    ],
  },
  custom_forms: {
    key: 'custom_forms',
    version: 1,
    name: 'Custom Forms',
    description: 'Validated entry forms with conditional field visibility and automatic table storage.',
    icon: 'clipboard-list',
    category: 'tracking',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['list', 'table'],
    defaultView: 'list',
    supportedFieldTypes: ALL_CUSTOM_FIELD_TYPES,
    configSchema: customTableConfigSchema,
    defaultConfig: customTableConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'enableCsvExport',
        label: 'Allow exporting form submissions',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'submissions', label: 'Form Submissions', unit: 'entries', aggregation: 'count', description: 'Submitted form entries' },
    ],
  },
  calculators: {
    key: 'calculators',
    version: 1,
    name: 'Custom Calculators',
    description: 'Secure AST-validated multi-input formula engine with formula versioning, history, and charts.',
    icon: 'calculator',
    category: 'computation',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['dashboard', 'charts', 'table'],
    defaultView: 'dashboard',
    supportedFieldTypes: ['integer', 'decimal', 'currency', 'percentage', 'formula'],
    configSchema: calculatorConfigSchema,
    defaultConfig: calculatorConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'precision',
        label: 'Default decimal precision',
        type: 'number',
        defaultValue: 2,
      },
      {
        key: 'saveHistory',
        label: 'Save calculation runs to history',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'showHistoryChart',
        label: 'Display historical result trend chart',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'calculation_runs', label: 'Calculation Runs', unit: 'runs', aggregation: 'count', description: 'Saved formula evaluations' },
    ],
  },
  expense_tracking: {
    key: 'expense_tracking',
    version: 1,
    name: 'Expense & Cashflow Tracking',
    description: 'Track income, expenses, categories, budgets, and net balance with exact decimal precision.',
    icon: 'wallet',
    category: 'tracking',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['table', 'charts', 'dashboard'],
    defaultView: 'table',
    supportedFieldTypes: ['dropdown', 'currency', 'date', 'short_text', 'long_text'],
    configSchema: expenseTrackingConfigSchema,
    defaultConfig: expenseTrackingConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'currency',
        label: 'Currency code',
        type: 'select',
        options: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
        defaultValue: 'USD',
      },
      {
        key: 'monthlyBudget',
        label: 'Monthly spending budget',
        type: 'number',
        defaultValue: 2000,
      },
    ],
    analyticsMetrics: [
      { key: 'net_balance', label: 'Net Balance', unit: 'currency', aggregation: 'sum', description: 'Income minus expenses' },
    ],
  },
  goals: {
    key: 'goals',
    version: 1,
    name: 'Goals & Milestones',
    description: 'Measure daily, weekly, monthly, or custom numeric targets and track percentage completion.',
    icon: 'target',
    category: 'execution',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['dashboard', 'list', 'charts'],
    defaultView: 'list',
    supportedFieldTypes: ['integer', 'decimal', 'percentage', 'date'],
    configSchema: goalsConfigSchema,
    defaultConfig: goalsConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'defaultPeriod',
        label: 'Default goal cadence',
        type: 'select',
        options: ['daily', 'weekly', 'monthly', 'custom'],
        defaultValue: 'weekly',
      },
    ],
    analyticsMetrics: [
      { key: 'avg_goal_progress', label: 'Goal Progress', unit: '%', aggregation: 'avg', description: 'Average completion across active goals' },
    ],
  },
  habits: {
    key: 'habits',
    version: 1,
    name: 'Habit Tracking & Streaks',
    description: 'Daily and scheduled habits with duplicate-proof check-ins, streak calculations, and calendar heatmaps.',
    icon: 'flame',
    category: 'tracking',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['dashboard', 'calendar', 'list'],
    defaultView: 'list',
    supportedFieldTypes: ['checkbox', 'integer', 'date'],
    configSchema: habitsConfigSchema,
    defaultConfig: habitsConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'defaultSchedule',
        label: 'Default schedule',
        type: 'select',
        options: ['daily', 'weekdays', 'custom'],
        defaultValue: 'daily',
      },
      {
        key: 'showHeatmap',
        label: 'Display calendar consistency heatmap',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'habit_checkins', label: 'Habit Check-ins', unit: 'check-ins', aggregation: 'count', description: 'Completed scheduled occurrences' },
    ],
  },
  calendar: {
    key: 'calendar',
    version: 1,
    name: 'Calendar & Reminders',
    description: 'Daily, weekly, and monthly event grids combining scheduled events, task deadlines, and in-app reminders.',
    icon: 'calendar',
    category: 'execution',
    allowMultiple: false,
    dependencies: [],
    supportedViews: ['calendar', 'timeline', 'list'],
    defaultView: 'calendar',
    supportedFieldTypes: ['datetime', 'date', 'short_text'],
    configSchema: calendarConfigSchema,
    defaultConfig: calendarConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'defaultMode',
        label: 'Default calendar view',
        type: 'select',
        options: ['month', 'week', 'day'],
        defaultValue: 'month',
      },
      {
        key: 'enableReminders',
        label: 'Create in-app reminder notifications',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    analyticsMetrics: [
      { key: 'upcoming_events', label: 'Scheduled Events', unit: 'events', aggregation: 'count', description: 'Upcoming calendar events' },
    ],
  },
  attachments: {
    key: 'attachments',
    version: 1,
    name: 'Files & Attachments',
    description: 'Private Supabase Storage file uploads with signed downloads and size/MIME validation.',
    icon: 'paperclip',
    category: 'files',
    allowMultiple: false,
    dependencies: [],
    supportedViews: ['gallery', 'list'],
    defaultView: 'gallery',
    supportedFieldTypes: ['attachments'],
    configSchema: genericObjectSchema,
    defaultConfig: {},
    questionnaire: [],
    analyticsMetrics: [
      { key: 'attachment_count', label: 'Attachments', unit: 'files', aggregation: 'count', description: 'Uploaded topic attachments' },
    ],
  },
  statistics: {
    key: 'statistics',
    version: 1,
    name: 'Statistics & KPIs',
    description: 'Real-time PostgreSQL aggregated metrics, comparisons, and customizable topic KPI widgets.',
    icon: 'gauge',
    category: 'visualization',
    allowMultiple: false,
    dependencies: [],
    supportedViews: ['dashboard', 'charts'],
    defaultView: 'dashboard',
    supportedFieldTypes: ['integer', 'decimal', 'currency', 'percentage'],
    configSchema: statisticsConfigSchema,
    defaultConfig: statisticsConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'defaultRangeDays',
        label: 'Default metrics window (days)',
        type: 'number',
        defaultValue: 30,
      },
    ],
    analyticsMetrics: [],
  },
  charts: {
    key: 'charts',
    version: 1,
    name: 'Analytics & Charts',
    description: 'Interactive line, bar, area, donut, scatter, and heatmap visualizations with accessible table fallback.',
    icon: 'bar-chart-3',
    category: 'visualization',
    allowMultiple: true,
    dependencies: [],
    supportedViews: ['charts', 'dashboard'],
    defaultView: 'charts',
    supportedFieldTypes: ['integer', 'decimal', 'currency', 'percentage', 'date'],
    configSchema: chartsConfigSchema,
    defaultConfig: chartsConfigSchema.parse({}),
    questionnaire: [
      {
        key: 'defaultChartType',
        label: 'Default visualization type',
        type: 'select',
        options: ['area', 'line', 'bar', 'donut', 'scatter'],
        defaultValue: 'area',
      },
    ],
    analyticsMetrics: [],
  },
};

export function getFeatureList(): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY);
}

export function getFeatureDefinition(key: FeatureKey): FeatureDefinition {
  return FEATURE_REGISTRY[key];
}

export function getSupportedViewsForModules(moduleKeys: FeatureKey[]): ViewType[] {
  const viewSet = new Set<ViewType>(['dashboard', 'activity']);
  for (const key of moduleKeys) {
    const def = FEATURE_REGISTRY[key];
    if (def) {
      def.supportedViews.forEach((v) => viewSet.add(v));
    }
  }
  return Array.from(viewSet);
}
