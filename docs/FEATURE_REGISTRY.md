# Feature Registry — NEXORA Modular Engine

The Feature Registry (`src/engine/feature-registry/`) is the single source of truth defining every module capability in NEXORA. The Dynamic Topic Builder, Template Engine, View Router, and Analytics Engine read module definitions from this registry rather than scattering hardcoded conditionals.

## 1. Registered Feature Catalog

| Feature Key | Version | Multi-Instance | Supported Views | Core Storage Backing | Analytics Capabilities |
|---|---|---|---|---|---|
| `tasks` | `1` | Yes | `list`, `kanban`, `calendar`, `dashboard` | `tasks`, `task_checklist_items` | Task count, completion %, overdue count, est vs actual min |
| `lists` | `1` | Yes | `list`, `table`, `gallery` | `custom_records` + `module_fields` | Item count, grouped status/category breakdown |
| `journal` | `1` | Yes | `list`, `timeline`, `calendar` | `journal_entries` | Entry count, writing cadence, mood distribution |
| `notes` | `1` | Yes | `list`, `gallery` | `journal_entries` (`is_note`) / `custom_records` | Note count, tag breakdown |
| `activity_logs` | `1` | Yes | `activity`, `timeline`, `charts` | `activity_logs` | Daily/weekly/monthly counts, total duration |
| `time_tracking` | `1` | Yes | `list`, `timeline`, `charts`, `dashboard` | `time_sessions` | Total tracked seconds/hours, daily/weekly trends |
| `custom_tables` | `1` | Yes | `table`, `list`, `gallery`, `charts` | `custom_records` + `module_fields` | Numeric sum/avg/min/max, grouped distributions |
| `custom_forms` | `1` | Yes | `list`, `table` | `custom_records` + `module_fields` | Submission volume, field aggregations |
| `calculators` | `1` | Yes | `dashboard`, `charts`, `table` | `calculator_definitions`, `calculator_versions`, `calculation_history` | Historical output trends, comparison table |
| `expense_tracking` | `1` | Yes | `table`, `charts`, `dashboard` | `custom_records` (typed currency/category schema) | Total income, expense, net balance, category breakdown |
| `goals` | `1` | Yes | `dashboard`, `list`, `charts` | `goals` | Completion %, target vs current progress |
| `habits` | `1` | Yes | `dashboard`, `calendar`, `list` | `habits`, `habit_checkins` | Current streak, longest streak, completion %, heatmap |
| `calendar` | `1` | Yes | `calendar`, `timeline`, `list` | `calendar_events` + task deadlines | Upcoming events, daily schedule load |
| `attachments` | `1` | Yes | `gallery`, `list` | `attachments` + Supabase Storage | Storage count & bytes used |
| `statistics` | `1` | Yes | `dashboard`, `charts` | Aggregated across topic modules | Custom KPI cards & comparison indicators |
| `charts` | `1` | Yes | `charts`, `dashboard` | Aggregated across topic modules | Line, bar, area, donut, scatter, heatmap + a11y table |

*(Note: `kanban`, `checklists`, `reminders`, `progress_tracking`, `custom_fields`, and `custom_dashboards` map cleanly onto capabilities & views exposed across `tasks`, `custom_tables`, `calendar`, `goals`, and `statistics`/`dashboard_widgets` inside the unified registry so users can toggle and configure every single requested capability in Step 3 & Step 4 of the Topic Builder!)*

## 2. Feature Contract Interface

Every feature definition in `src/engine/feature-registry/registry.ts` implements:

```ts
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
```

## 3. Supported Custom Field Types (`18` types)

`short_text`, `long_text`, `integer`, `decimal`, `currency`, `percentage`, `date`, `datetime`, `duration`, `dropdown`, `multi_select`, `checkbox`, `rating`, `url`, `email`, `tags`, `attachments`, `formula`.

## 4. Extension Procedure

To add a new module type without rewriting unrelated modules:
1. Create a typed module descriptor in `src/engine/feature-registry/definitions/<feature>.ts` with Zod config schema, questionnaire prompts, and metric definitions.
2. Register it in `src/engine/feature-registry/registry.ts`.
3. Map its renderer component inside `src/features/topics/module-renderer-map.tsx`.
4. Add unit tests for config validation and metric definitions; existing topics continue running unmodified via `feature_version`.
