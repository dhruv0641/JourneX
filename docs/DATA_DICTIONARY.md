# Data Dictionary — JournalX PostgreSQL Schema

Every table lives in the `public` schema (unless noted), enables/forces RLS, and uses `uuid` primary keys (`gen_random_uuid()`) and `timestamptz` timestamps.

## 1. `profiles`
| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `uuid` | `PK`, `FK -> auth.users(id) ON DELETE CASCADE` | User identity ID |
| `email` | `text` | `NOT NULL` | Synced user email |
| `full_name` | `text` | `NOT NULL DEFAULT ''` | Display name |
| `avatar_url` | `text` | `NULL` | Optional profile avatar storage key |
| `timezone` | `text` | `NOT NULL DEFAULT 'UTC'` | IANA timezone for date boundaries & display |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last update timestamp |
| `version` | `integer` | `NOT NULL DEFAULT 1` | Optimistic concurrency version |

## 2. `user_preferences`
| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `user_id` | `uuid` | `PK`, `FK -> auth.users(id) ON DELETE CASCADE` | Owner user ID |
| `app_name` | `text` | `NOT NULL DEFAULT 'JournalX' CHECK (char_length(trim(app_name)) BETWEEN 1 AND 40)` | Configurable OS display name |
| `theme` | `text` | `NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system'))` | Preferred theme |
| `date_format` | `text` | `NOT NULL DEFAULT 'MMM d, yyyy'` | Date formatting preference |
| `time_format` | `text` | `NOT NULL DEFAULT '24h' CHECK (time_format IN ('12h','24h'))` | Clock format |
| `week_starts_on` | `smallint` | `NOT NULL DEFAULT 1 CHECK (week_starts_on BETWEEN 0 AND 6)` | Week start day (0=Sun..6=Sat) |
| `default_dashboard_range` | `text` | `NOT NULL DEFAULT '30d' CHECK (default_dashboard_range IN ('7d','30d','90d','all'))` | Default dashboard date filter |
| `compact_mode` | `boolean` | `NOT NULL DEFAULT false` | Compact density toggle |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last update timestamp |
| `version` | `integer` | `NOT NULL DEFAULT 1` | Optimistic concurrency version |

## 3. `topic_templates`
| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `uuid` | `PK` | Template ID |
| `slug` | `text` | `NOT NULL` | Stable template identifier |
| `name` | `text` | `NOT NULL` | Template display name |
| `description` | `text` | `NOT NULL` | Summary of included modules & purpose |
| `category` | `text` | `NOT NULL` | Template domain category |
| `icon` | `text` | `NOT NULL DEFAULT 'layers'` | Lucide icon identifier |
| `accent_color` | `text` | `NOT NULL DEFAULT '#2563EB'` | Hex accent color |
| `is_system` | `boolean` | `NOT NULL DEFAULT false` | True for global read-only system templates |
| `owner_id` | `uuid` | `NULL`, `FK -> auth.users(id) ON DELETE CASCADE` | Owner for user-imported templates (`NULL` when `is_system = true`) |
| `definition` | `jsonb` | `NOT NULL` | Complete modular template blueprint |
| `schema_version` | `integer` | `NOT NULL DEFAULT 1` | Template schema version |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Update timestamp |

## 4. `topics`
| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `uuid` | `PK` | Topic ID |
| `user_id` | `uuid` | `NOT NULL`, `FK -> auth.users(id) ON DELETE CASCADE` | Owner user ID |
| `template_id` | `uuid` | `NULL`, `FK -> topic_templates(id) ON DELETE SET NULL` | Source template reference |
| `name` | `text` | `NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100)` | Topic name |
| `slug` | `text` | `NOT NULL CHECK (slug ~ '^[a-z0-9-]+$')` | URL-safe slug |
| `description` | `text` | `NOT NULL DEFAULT ''` | Topic description |
| `purpose` | `text` | `NOT NULL DEFAULT ''` | Topic purpose statement |
| `category` | `text` | `NOT NULL DEFAULT 'general'` | Category tag |
| `icon` | `text` | `NOT NULL DEFAULT 'layers'` | Lucide icon name |
| `accent_color` | `text` | `NOT NULL DEFAULT '#2563EB' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$')` | Topic hex accent color |
| `is_pinned` | `boolean` | `NOT NULL DEFAULT false` | Pinned to dashboard/sidebar |
| `is_favorite` | `boolean` | `NOT NULL DEFAULT false` | Favorited topic |
| `status` | `text` | `NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived'))` | Lifecycle status |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Display ordering |
| `settings` | `jsonb` | `NOT NULL DEFAULT '{}'` | Topic-level settings & analytics prefs |
| `archived_at` | `timestamptz` | `NULL` | Archive timestamp |
| `deleted_at` | `timestamptz` | `NULL` | Soft-delete timestamp |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Update timestamp |
| `version` | `integer` | `NOT NULL DEFAULT 1` | OCC version |

## 5. `topic_modules`
| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `uuid` | `PK` | Module instance ID |
| `user_id` | `uuid` | `NOT NULL` | Owner user ID |
| `topic_id` | `uuid` | `NOT NULL`, composite FK `-> topics(id, user_id) ON DELETE CASCADE` | Parent topic |
| `feature_key` | `text` | `NOT NULL` | Registry feature key (e.g., `tasks`, `calculator`, `custom_table`) |
| `module_key` | `text` | `NOT NULL` | Unique instance key within topic (allows multiple instances) |
| `name` | `text` | `NOT NULL` | User-facing module title |
| `description` | `text` | `NOT NULL DEFAULT ''` | Module description |
| `icon` | `text` | `NOT NULL DEFAULT 'box'` | Lucide icon |
| `feature_version` | `integer` | `NOT NULL DEFAULT 1` | Registry schema version |
| `is_enabled` | `boolean` | `NOT NULL DEFAULT true` | Toggled off preserves existing data |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Tab/sidebar order |
| `config` | `jsonb` | `NOT NULL DEFAULT '{}'` | Validated feature configuration JSON |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Update timestamp |
| `version` | `integer` | `NOT NULL DEFAULT 1` | OCC version |

## 6. `module_fields`
| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `uuid` | `PK` | Field ID |
| `user_id` | `uuid` | `NOT NULL` | Owner user ID |
| `topic_id` | `uuid` | `NOT NULL` | Parent topic ID |
| `module_id` | `uuid` | `NOT NULL`, composite FK `-> topic_modules(id, topic_id, user_id) ON DELETE CASCADE` | Parent module ID |
| `field_key` | `text` | `NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]*$')` | Immutable storage key inside `custom_records.data` |
| `label` | `text` | `NOT NULL` | Editable display label |
| `field_type` | `text` | `NOT NULL` | Supported field type from registry |
| `is_required` | `boolean` | `NOT NULL DEFAULT false` | Required field enforcement |
| `is_unique` | `boolean` | `NOT NULL DEFAULT false` | Uniqueness hint/check |
| `is_visible_in_table` | `boolean` | `NOT NULL DEFAULT true` | Default column visibility |
| `default_value` | `jsonb` | `NULL` | Default value JSON |
| `options` | `jsonb` | `NOT NULL DEFAULT '[]'` | Select/multi-select options |
| `validation_rules` | `jsonb` | `NOT NULL DEFAULT '{}'` | Min/max/pattern constraints |
| `visibility_condition` | `jsonb` | `NULL` | Conditional field visibility rule |
| `formula_expression` | `text` | `NULL` | Safe formula expression for `formula` fields |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Form & column ordering |
| `is_archived` | `boolean` | `NOT NULL DEFAULT false` | Soft field retirement preserving historical data |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Update timestamp |
| `version` | `integer` | `NOT NULL DEFAULT 1` | OCC version |

## 7. `module_views`
| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `uuid` | `PK` | View ID |
| `user_id` | `uuid` | `NOT NULL` | Owner user ID |
| `topic_id` | `uuid` | `NOT NULL`, composite FK `-> topics(id, user_id)` | Parent topic |
| `module_id` | `uuid` | `NULL`, composite FK `-> topic_modules(id, topic_id, user_id)` | Optional linked module (`NULL` for topic-wide views) |
| `view_type` | `text` | `NOT NULL CHECK (view_type IN ('dashboard','list','table','kanban','calendar','timeline','gallery','charts','activity'))` | View renderer type |
| `name` | `text` | `NOT NULL` | Custom view label |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Tab ordering |
| `is_default` | `boolean` | `NOT NULL DEFAULT false` | Default view on topic open |
| `config` | `jsonb` | `NOT NULL DEFAULT '{}'` | Columns, sort, grouping, chart settings |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Update timestamp |
| `version` | `integer` | `NOT NULL DEFAULT 1` | OCC version |

## 8. `custom_records`
Stores rows for `custom_table`, `custom_form`, `expense_tracker`, `lists`, `notes`, and structured practice logs using validated JSONB keyed by `module_fields.field_key`.
- Columns: `id`, `user_id`, `topic_id`, `module_id` (composite FK), `title text`, `data jsonb`, `occurred_at timestamptz`, `import_hash text`, `deleted_at timestamptz`, `created_at`, `updated_at`, `version`.

## 9. `tasks` & `task_checklist_items`
- `tasks`: `id`, `user_id`, `topic_id`, `module_id` (composite FK), `title`, `description`, `status` (`todo`, `in_progress`, `blocked`, `done`, or custom configured status), `priority` (`low`, `medium`, `high`, `urgent`), `due_at timestamptz`, `completed_at timestamptz`, `estimated_minutes integer`, `actual_minutes integer`, `recurrence_rule jsonb`, `custom_data jsonb`, `sort_order integer`, `deleted_at timestamptz`, `created_at`, `updated_at`, `version`.
- `task_checklist_items`: `id`, `user_id`, `topic_id`, `task_id` (composite FK `-> tasks(id, topic_id, user_id)`), `title`, `is_completed boolean`, `sort_order integer`, `created_at`, `updated_at`.

## 10. `journal_entries` & `activity_logs` & `time_sessions`
- `journal_entries`: `id`, `user_id`, `topic_id`, `module_id` (composite FK), `title`, `content_html` (sanitized), `content_text`, `category`, `mood`, `entry_date date`, `is_draft boolean`, `template_name`, `deleted_at`, `created_at`, `updated_at`, `version`.
- `activity_logs`: `id`, `user_id`, `topic_id` (composite FK), `module_id`, `source` (`manual` | `automatic`), `category`, `title`, `details jsonb`, `duration_minutes integer`, `occurred_at timestamptz`, `created_at`.
- `time_sessions`: `id`, `user_id`, `topic_id`, `module_id` (composite FK), `task_id`, `description`, `status` (`running` | `paused` | `completed`), `started_at timestamptz`, `last_resumed_at timestamptz`, `ended_at timestamptz`, `accumulated_seconds integer`, `is_manual boolean`, `created_at`, `updated_at`, `version`.

## 11. `goals`, `habits`, `habit_checkins`, `calendar_events`
- `goals`: `id`, `user_id`, `topic_id`, `module_id` (composite FK), `title`, `description`, `period_type` (`daily` | `weekly` | `monthly` | `custom`), `target_value numeric(18,4)`, `current_value numeric(18,4)`, `unit`, `start_date date`, `end_date date`, `status` (`active` | `completed` | `archived`), `created_at`, `updated_at`, `version`.
- `habits`: `id`, `user_id`, `topic_id`, `module_id` (composite FK), `title`, `description`, `schedule_type` (`daily` | `weekdays` | `custom`), `schedule_days smallint[]`, `target_count_per_day integer`, `unit`, `is_active boolean`, `created_at`, `updated_at`, `version`.
- `habit_checkins`: `id`, `user_id`, `topic_id`, `habit_id` (composite FK), `checkin_date date`, `value numeric(12,2)`, `notes`, `created_at`, `updated_at`. Unique `(habit_id, checkin_date)`.
- `calendar_events`: `id`, `user_id`, `topic_id` (composite FK), `module_id`, `task_id`, `title`, `description`, `starts_at timestamptz`, `ends_at timestamptz`, `all_day boolean`, `recurrence_rule jsonb`, `reminder_minutes integer`, `created_at`, `updated_at`, `version`.

## 12. `calculator_definitions`, `calculator_versions`, `calculation_history`
- `calculator_definitions`: `id`, `user_id`, `topic_id`, `module_id` (composite FK), `name`, `description`, `current_version integer`, `is_archived boolean`, `created_at`, `updated_at`, `version`.
- `calculator_versions`: `id`, `user_id`, `topic_id`, `calculator_id` (composite FK), `version_number integer`, `inputs_schema jsonb`, `outputs_schema jsonb`, `formulas jsonb`, `chart_config jsonb`, `change_note`, `created_at`. Unique `(calculator_id, version_number)`.
- `calculation_history`: `id`, `user_id`, `topic_id`, `calculator_id`, `calculator_version_id`, `inputs jsonb`, `outputs jsonb`, `label`, `calculated_at timestamptz`, `created_at`.

## 13. `dashboard_widgets`, `saved_filters`, `tags`, `tag_assignments`, `attachments`, `notifications`, `audit_events`, `idempotency_records`
- `dashboard_widgets`: `id`, `user_id`, `scope` (`global` | `topic`), `topic_id`, `widget_type`, `title`, `config jsonb`, `layout jsonb`, `sort_order integer`, `is_visible boolean`, `created_at`, `updated_at`, `version`.
- `saved_filters`: `id`, `user_id`, `topic_id`, `module_id`, `name`, `filter_config jsonb`, `is_default boolean`, `created_at`, `updated_at`.
- `tags`: `id`, `user_id`, `name`, `normalized_name` (generated `lower(trim(name))`), `color`, `created_at`.
- `tag_assignments`: `id`, `user_id`, `tag_id`, `entity_type`, `entity_id`, `created_at`.
- `attachments`: `id`, `user_id`, `topic_id`, `entity_type`, `entity_id`, `bucket_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes bigint`, `created_at`.
- `notifications`: `id`, `user_id`, `topic_id`, `kind`, `title`, `body`, `action_url`, `is_read boolean`, `scheduled_for timestamptz`, `read_at timestamptz`, `created_at`.
- `audit_events`: `id`, `user_id`, `event_type`, `entity_type`, `entity_id`, `metadata jsonb`, `created_at`.
- `idempotency_records`: `id`, `user_id`, `operation`, `idempotency_key`, `request_hash`, `response_status integer`, `response_body jsonb`, `created_at`, `expires_at timestamptz`.
