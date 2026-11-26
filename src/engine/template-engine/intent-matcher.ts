import type { CustomFieldDraft, FeatureKey, ViewType } from '@/engine/feature-registry/types';

export interface IntentRecommendation {
  matchedProfile: string | null;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  recommendedTemplateSlug: string;
  recommendedModules: FeatureKey[];
  recommendedFields: Record<string, CustomFieldDraft[]>;
  recommendedViews: Array<{ view_type: ViewType; name: string; is_default: boolean }>;
  suggestedCalculator?: {
    name: string;
    description: string;
    inputs_schema: Array<{ key: string; label: string; type: string; unit?: string; defaultValue: number; min?: number; max?: number }>;
    outputs_schema: Array<{ key: string; label: string; unit?: string; precision: number; monetary?: boolean }>;
    formulas: Array<{ key: string; expression: string; precision: number; monetary?: boolean }>;
  };
  detectedKeywords: string[];
}

interface DomainRule {
  id: string;
  label: string;
  templateSlug: string;
  keywords: string[];
  categories: string[];
  modules: FeatureKey[];
  fields: Record<string, CustomFieldDraft[]>;
  views: Array<{ view_type: ViewType; name: string; is_default: boolean }>;
  suggestedCalculator?: IntentRecommendation['suggestedCalculator'];
}

const DOMAIN_RULES: DomainRule[] = [
  {
    id: 'ielts',
    label: 'Language Exam / IELTS Preparation',
    templateSlug: 'ielts-preparation',
    keywords: ['ielts', 'toefl', 'band', 'reading', 'listening', 'writing', 'speaking', 'exam', 'mock test', 'english'],
    categories: ['education', 'language'],
    modules: ['custom_tables', 'tasks', 'time_tracking', 'goals', 'journal', 'calculators', 'charts'],
    fields: {
      custom_tables: [
        { field_key: 'skill', label: 'Skill', field_type: 'dropdown', is_required: true, options: ['Reading', 'Listening', 'Writing', 'Speaking', 'Full Mock'], sort_order: 0 },
        { field_key: 'score', label: 'Band Score', field_type: 'decimal', is_required: true, validation_rules: { min: 0, max: 9 }, sort_order: 1 },
        { field_key: 'duration_min', label: 'Duration (min)', field_type: 'integer', is_required: true, validation_rules: { min: 1, max: 600 }, sort_order: 2 },
        { field_key: 'source', label: 'Practice Source', field_type: 'short_text', is_required: false, sort_order: 3 },
      ],
    },
    views: [
      { view_type: 'dashboard', name: 'Overview', is_default: true },
      { view_type: 'table', name: 'Practice Log', is_default: false },
      { view_type: 'list', name: 'Tasks', is_default: false },
      { view_type: 'charts', name: 'Score Trends', is_default: false },
    ],
    suggestedCalculator: {
      name: 'IELTS Overall Band Calculator',
      description: 'Calculates official IELTS band score rounded to nearest 0.5',
      inputs_schema: [
        { key: 'listening', label: 'Listening', type: 'decimal', unit: 'band', defaultValue: 7.5, min: 0, max: 9 },
        { key: 'reading', label: 'Reading', type: 'decimal', unit: 'band', defaultValue: 7.5, min: 0, max: 9 },
        { key: 'writing', label: 'Writing', type: 'decimal', unit: 'band', defaultValue: 7.0, min: 0, max: 9 },
        { key: 'speaking', label: 'Speaking', type: 'decimal', unit: 'band', defaultValue: 7.0, min: 0, max: 9 },
      ],
      outputs_schema: [
        { key: 'raw_average', label: 'Raw Average', unit: 'band', precision: 2 },
        { key: 'official_band', label: 'Official Band', unit: 'band', precision: 1 },
      ],
      formulas: [
        { key: 'raw_average', expression: '(listening + reading + writing + speaking) / 4', precision: 2 },
        { key: 'official_band', expression: 'round(raw_average * 2, 0) / 2', precision: 1 },
      ],
    },
  },
  {
    id: 'finance',
    label: 'Personal Finance & Budget Management',
    templateSlug: 'personal-finance',
    keywords: ['finance', 'expense', 'budget', 'income', 'salary', 'saving', 'money', 'spending', 'cashflow', 'tax', 'ledger'],
    categories: ['finance', 'business'],
    modules: ['expense_tracking', 'goals', 'calculators', 'tasks', 'charts', 'statistics'],
    fields: {
      expense_tracking: [
        { field_key: 'entry_type', label: 'Type', field_type: 'dropdown', is_required: true, options: ['income', 'expense'], sort_order: 0 },
        { field_key: 'amount', label: 'Amount', field_type: 'currency', is_required: true, validation_rules: { min: 0 }, sort_order: 1 },
        { field_key: 'category', label: 'Category', field_type: 'dropdown', is_required: true, options: ['Salary', 'Housing', 'Food', 'Transport', 'Software', 'Savings', 'Other'], sort_order: 2 },
        { field_key: 'notes', label: 'Notes', field_type: 'short_text', is_required: false, sort_order: 3 },
      ],
    },
    views: [
      { view_type: 'dashboard', name: 'Financial Overview', is_default: true },
      { view_type: 'table', name: 'Transactions', is_default: false },
      { view_type: 'charts', name: 'Cashflow Charts', is_default: false },
    ],
  },
  {
    id: 'engineering',
    label: 'Learning & Software Engineering',
    templateSlug: 'learning-engineering',
    keywords: ['ai', 'engineering', 'cybersecurity', 'coding', 'code', 'software', 'system', 'roadmap', 'learn', 'study', 'project', 'certification'],
    categories: ['engineering', 'education', 'technology'],
    modules: ['tasks', 'custom_tables', 'journal', 'time_tracking', 'goals', 'attachments'],
    fields: {
      custom_tables: [
        { field_key: 'resource_title', label: 'Resource / Module', field_type: 'short_text', is_required: true, sort_order: 0 },
        { field_key: 'resource_type', label: 'Format', field_type: 'dropdown', is_required: true, options: ['Course', 'Paper', 'Lab', 'Book', 'Docs'], sort_order: 1 },
        { field_key: 'status', label: 'Progress', field_type: 'dropdown', is_required: true, options: ['Queued', 'In Progress', 'Completed'], sort_order: 2 },
        { field_key: 'url', label: 'Reference URL', field_type: 'url', is_required: false, sort_order: 3 },
      ],
    },
    views: [
      { view_type: 'dashboard', name: 'Overview', is_default: true },
      { view_type: 'kanban', name: 'Board', is_default: false },
      { view_type: 'table', name: 'Resources', is_default: false },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness & Health Tracking',
    templateSlug: 'productivity',
    keywords: ['fitness', 'workout', 'gym', 'run', 'running', 'weight', 'calories', 'health', 'training', 'cardio', 'strength'],
    categories: ['health', 'fitness', 'lifestyle'],
    modules: ['habits', 'goals', 'custom_tables', 'time_tracking', 'charts', 'journal'],
    fields: {
      custom_tables: [
        { field_key: 'workout_type', label: 'Session Type', field_type: 'dropdown', is_required: true, options: ['Strength', 'Cardio', 'Mobility', 'Recovery'], sort_order: 0 },
        { field_key: 'duration_min', label: 'Duration (min)', field_type: 'integer', is_required: true, validation_rules: { min: 1 }, sort_order: 1 },
        { field_key: 'intensity', label: 'RPE / Rating', field_type: 'rating', is_required: false, sort_order: 2 },
      ],
    },
    views: [
      { view_type: 'dashboard', name: 'Overview', is_default: true },
      { view_type: 'table', name: 'Workout Log', is_default: false },
      { view_type: 'calendar', name: 'Schedule', is_default: false },
    ],
  },
  {
    id: 'calculator',
    label: 'Custom Calculator & Modeling',
    templateSlug: 'custom-calculator',
    keywords: ['calculator', 'formula', 'calculate', 'roi', 'bmi', 'mortgage', 'compound', 'margin', 'conversion', 'estimator'],
    categories: ['computation', 'math', 'finance'],
    modules: ['calculators', 'charts', 'custom_tables'],
    fields: {},
    views: [
      { view_type: 'dashboard', name: 'Calculator', is_default: true },
      { view_type: 'charts', name: 'History Trends', is_default: false },
    ],
  },
  {
    id: 'jobs',
    label: 'Job Applications & Career Pipeline',
    templateSlug: 'productivity',
    keywords: ['job', 'career', 'interview', 'application', 'resume', 'cv', 'recruiter', 'offer', 'company'],
    categories: ['career', 'business'],
    modules: ['custom_tables', 'tasks', 'calendar', 'notes', 'attachments'],
    fields: {
      custom_tables: [
        { field_key: 'company', label: 'Company', field_type: 'short_text', is_required: true, sort_order: 0 },
        { field_key: 'role', label: 'Role', field_type: 'short_text', is_required: true, sort_order: 1 },
        { field_key: 'stage', label: 'Stage', field_type: 'dropdown', is_required: true, options: ['Saved', 'Applied', 'Screen', 'Technical', 'Offer', 'Closed'], sort_order: 2 },
        { field_key: 'applied_on', label: 'Applied Date', field_type: 'date', is_required: false, sort_order: 3 },
        { field_key: 'job_url', label: 'Posting URL', field_type: 'url', is_required: false, sort_order: 4 },
      ],
    },
    views: [
      { view_type: 'dashboard', name: 'Overview', is_default: true },
      { view_type: 'table', name: 'Applications', is_default: false },
      { view_type: 'list', name: 'Prep Tasks', is_default: false },
    ],
  },
  {
    id: 'productivity',
    label: 'Daily Productivity & Habits',
    templateSlug: 'productivity',
    keywords: ['productivity', 'habit', 'daily', 'routine', 'focus', 'planner', 'todo', 'journal', 'goal'],
    categories: ['productivity', 'personal'],
    modules: ['tasks', 'habits', 'goals', 'time_tracking', 'journal', 'calendar'],
    fields: {},
    views: [
      { view_type: 'dashboard', name: 'Overview', is_default: true },
      { view_type: 'list', name: 'Tasks', is_default: false },
      { view_type: 'calendar', name: 'Calendar', is_default: false },
    ],
  },
];

/**
 * Deterministic intent discovery engine (zero external paid APIs).
 * Scores keywords, category signals, and explicit description hints.
 * Falls back cleanly to a generic modular builder when intent is ambiguous.
 */
export function discoverTopicRequirements(input: {
  name: string;
  description?: string;
  purpose?: string;
  category?: string;
  selectedTemplateSlug?: string | null;
}): IntentRecommendation {
  const combined = `${input.name} ${input.description ?? ''} ${input.purpose ?? ''} ${input.category ?? ''}`
    .toLowerCase()
    .trim();

  // Explicit modifier signals from natural language description
  const modifierSignals: Array<{ terms: string[]; module: FeatureKey }> = [
    { terms: ['task', 'todo', 'checklist', 'kanban', 'sprint', 'milestone'], module: 'tasks' },
    { terms: ['journal', 'diary', 'reflection', 'write'], module: 'journal' },
    { terms: ['note', 'wiki', 'docs', 'summary'], module: 'notes' },
    { terms: ['timer', 'time track', 'hours', 'pomodoro', 'stopwatch', 'study time'], module: 'time_tracking' },
    { terms: ['calculator', 'formula', 'compute', 'estimator'], module: 'calculators' },
    { terms: ['expense', 'budget', 'income', 'spending', 'cost', 'invoice'], module: 'expense_tracking' },
    { terms: ['habit', 'streak', 'check-in', 'daily routine'], module: 'habits' },
    { terms: ['goal', 'target', 'kpi', 'objective'], module: 'goals' },
    { terms: ['calendar', 'schedule', 'deadline', 'reminder', 'event'], module: 'calendar' },
    { terms: ['table', 'spreadsheet', 'tracker', 'csv', 'log', 'database'], module: 'custom_tables' },
    { terms: ['chart', 'graph', 'trend', 'analytics', 'score'], module: 'charts' },
    { terms: ['file', 'upload', 'pdf', 'attachment'], module: 'attachments' },
  ];

  const extraModules = new Set<FeatureKey>();
  const detectedKeywords = new Set<string>();

  for (const sig of modifierSignals) {
    for (const term of sig.terms) {
      if (combined.includes(term)) {
        extraModules.add(sig.module);
        detectedKeywords.add(term);
      }
    }
  }

  let bestRule: DomainRule | null = null;
  let bestScore = 0;

  for (const rule of DOMAIN_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        score += kw.includes(' ') ? 3 : 2;
        detectedKeywords.add(kw);
      }
    }
    if (input.category && rule.categories.includes(input.category.toLowerCase())) {
      score += 2;
    }
    if (input.selectedTemplateSlug && input.selectedTemplateSlug === rule.templateSlug) {
      score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (bestRule && bestScore >= 2) {
    const mergedModules = Array.from(new Set([...bestRule.modules, ...extraModules]));
    return {
      matchedProfile: bestRule.label,
      confidence: bestScore >= 4 ? 'high' : 'medium',
      explanation: `Matched "${bestRule.label}" based on detected keywords (${Array.from(detectedKeywords).slice(0, 5).join(', ')}). All module choices remain fully editable.`,
      recommendedTemplateSlug: bestRule.templateSlug,
      recommendedModules: mergedModules,
      recommendedFields: bestRule.fields,
      recommendedViews: bestRule.views,
      suggestedCalculator: bestRule.suggestedCalculator,
      detectedKeywords: Array.from(detectedKeywords),
    };
  }

  // Fallback generic modular builder
  const fallbackModules: FeatureKey[] =
    extraModules.size > 0
      ? Array.from(new Set<FeatureKey>([...extraModules, 'activity_logs']))
      : ['tasks', 'notes', 'custom_tables', 'time_tracking', 'statistics'];

  return {
    matchedProfile: null,
    confidence: 'low',
    explanation:
      'No narrow domain preset matched strongly — initialized a flexible generic workspace so you can select exact modules, fields, and views below.',
    recommendedTemplateSlug: 'blank',
    recommendedModules: fallbackModules,
    recommendedFields: {},
    recommendedViews: [
      { view_type: 'dashboard', name: 'Overview', is_default: true },
      { view_type: 'list', name: 'Items', is_default: false },
    ],
    detectedKeywords: Array.from(detectedKeywords),
  };
}
