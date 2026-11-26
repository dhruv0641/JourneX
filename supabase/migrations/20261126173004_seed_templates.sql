-- NEXORA System Starter Templates (Idempotent Seed Migration)

insert into public.topic_templates (slug, name, description, category, icon, accent_color, is_system, owner_id, definition)
values
(
  'ielts-preparation',
  'IELTS Preparation',
  'Track Reading, Listening, Writing, and Speaking practice sessions, mock band scores, study hours, daily tasks, and reflections.',
  'education',
  'graduation-cap',
  '#2563EB',
  true,
  null,
  '{
    "modules": [
      {
        "feature_key": "custom_tables",
        "module_key": "ielts_practice_log",
        "name": "Practice & Mock Scores",
        "description": "Log Reading, Listening, Writing, and Speaking sessions with band scores",
        "icon": "book-open",
        "sort_order": 0,
        "config": { "enableCsvImport": true },
        "fields": [
          { "field_key": "skill", "label": "Skill", "field_type": "dropdown", "is_required": true, "options": ["Reading", "Listening", "Writing", "Speaking", "Full Mock"], "sort_order": 0 },
          { "field_key": "score", "label": "Band Score", "field_type": "decimal", "is_required": true, "validation_rules": { "min": 0, "max": 9 }, "sort_order": 1 },
          { "field_key": "duration_min", "label": "Duration (min)", "field_type": "integer", "is_required": true, "validation_rules": { "min": 1, "max": 600 }, "sort_order": 2 },
          { "field_key": "source", "label": "Source / Test ID", "field_type": "short_text", "is_required": false, "sort_order": 3 },
          { "field_key": "notes", "label": "Error Review", "field_type": "long_text", "is_required": false, "sort_order": 4 }
        ]
      },
      { "feature_key": "tasks", "module_key": "tasks", "name": "Study Tasks", "icon": "check-square", "sort_order": 1, "config": { "statuses": ["todo", "in_progress", "done"] } },
      { "feature_key": "time_tracking", "module_key": "time_tracking", "name": "Study Timer", "icon": "clock", "sort_order": 2, "config": {} },
      { "feature_key": "goals", "module_key": "goals", "name": "Target Band & Hours", "icon": "target", "sort_order": 3, "config": {} },
      { "feature_key": "journal", "module_key": "journal", "name": "Study Reflection", "icon": "notebook-pen", "sort_order": 4, "config": { "enableMood": true } },
      {
        "feature_key": "calculators",
        "module_key": "band_calculator",
        "name": "IELTS Band Calculator",
        "icon": "calculator",
        "sort_order": 5,
        "config": {
          "calculator": {
            "name": "Overall Band Score",
            "description": "Computes IELTS overall band rounded to nearest 0.5",
            "inputs_schema": [
              { "key": "listening", "label": "Listening", "type": "decimal", "unit": "band", "defaultValue": 7.5, "min": 0, "max": 9 },
              { "key": "reading", "label": "Reading", "type": "decimal", "unit": "band", "defaultValue": 7.5, "min": 0, "max": 9 },
              { "key": "writing", "label": "Writing", "type": "decimal", "unit": "band", "defaultValue": 7.0, "min": 0, "max": 9 },
              { "key": "speaking", "label": "Speaking", "type": "decimal", "unit": "band", "defaultValue": 7.0, "min": 0, "max": 9 }
            ],
            "outputs_schema": [
              { "key": "raw_average", "label": "Raw Average", "unit": "band", "precision": 2 },
              { "key": "official_band", "label": "Official Rounded Band", "unit": "band", "precision": 1 }
            ],
            "formulas": [
              { "key": "raw_average", "expression": "(listening + reading + writing + speaking) / 4", "precision": 2 },
              { "key": "official_band", "expression": "round(raw_average * 2, 0) / 2", "precision": 1 }
            ]
          }
        }
      },
      { "feature_key": "charts", "module_key": "charts", "name": "Score & Study Analytics", "icon": "bar-chart-3", "sort_order": 6, "config": {} }
    ],
    "views": [
      { "view_type": "dashboard", "name": "Overview", "sort_order": 0, "is_default": true },
      { "view_type": "table", "name": "Practice Log", "sort_order": 1, "is_default": false },
      { "view_type": "list", "name": "Tasks", "sort_order": 2, "is_default": false },
      { "view_type": "charts", "name": "Analytics", "sort_order": 3, "is_default": false }
    ]
  }'::jsonb
),
(
  'personal-finance',
  'Personal Finance',
  'Manage income, categorized expenses, net cashflow, savings goals, transaction history, and financial calculators.',
  'finance',
  'wallet',
  '#0D9488',
  true,
  null,
  '{
    "modules": [
      {
        "feature_key": "expense_tracking",
        "module_key": "ledger",
        "name": "Income & Expense Ledger",
        "icon": "receipt",
        "sort_order": 0,
        "config": { "currency": "USD" },
        "fields": [
          { "field_key": "entry_type", "label": "Type", "field_type": "dropdown", "is_required": true, "options": ["income", "expense"], "sort_order": 0 },
          { "field_key": "amount", "label": "Amount", "field_type": "currency", "is_required": true, "validation_rules": { "min": 0 }, "sort_order": 1 },
          { "field_key": "category", "label": "Category", "field_type": "dropdown", "is_required": true, "options": ["Salary", "Freelance", "Housing", "Food", "Transport", "Software", "Savings", "Other"], "sort_order": 2 },
          { "field_key": "merchant", "label": "Account / Merchant", "field_type": "short_text", "is_required": false, "sort_order": 3 },
          { "field_key": "notes", "label": "Notes", "field_type": "long_text", "is_required": false, "sort_order": 4 }
        ]
      },
      { "feature_key": "goals", "module_key": "savings_goals", "name": "Savings Goals", "icon": "piggy-bank", "sort_order": 1, "config": {} },
      {
        "feature_key": "calculators",
        "module_key": "savings_rate_calc",
        "name": "Savings & Budget Calculator",
        "icon": "calculator",
        "sort_order": 2,
        "config": {
          "calculator": {
            "name": "Monthly Cashflow & Savings Rate",
            "inputs_schema": [
              { "key": "monthly_income", "label": "Monthly Income", "type": "currency", "unit": "$", "defaultValue": 5000, "min": 0 },
              { "key": "fixed_costs", "label": "Fixed Costs", "type": "currency", "unit": "$", "defaultValue": 2200, "min": 0 },
              { "key": "variable_spend", "label": "Variable Spend", "type": "currency", "unit": "$", "defaultValue": 1100, "min": 0 }
            ],
            "outputs_schema": [
              { "key": "net_savings", "label": "Net Monthly Savings", "unit": "$", "precision": 2, "monetary": true },
              { "key": "savings_rate_pct", "label": "Savings Rate", "unit": "%", "precision": 1 }
            ],
            "formulas": [
              { "key": "net_savings", "expression": "monthly_income - (fixed_costs + variable_spend)", "precision": 2, "monetary": true },
              { "key": "savings_rate_pct", "expression": "monthly_income > 0 ? pct(net_savings, monthly_income) : 0", "precision": 1 }
            ]
          }
        }
      },
      { "feature_key": "tasks", "module_key": "finance_tasks", "name": "Bills & Reviews", "icon": "check-square", "sort_order": 3, "config": {} },
      { "feature_key": "charts", "module_key": "charts", "name": "Cashflow Trends", "icon": "trending-up", "sort_order": 4, "config": {} }
    ],
    "views": [
      { "view_type": "dashboard", "name": "Financial Overview", "sort_order": 0, "is_default": true },
      { "view_type": "table", "name": "Transactions", "sort_order": 1, "is_default": false },
      { "view_type": "charts", "name": "Charts", "sort_order": 2, "is_default": false }
    ]
  }'::jsonb
),
(
  'learning-engineering',
  'Learning & Engineering',
  'Manage technical roadmaps, study resources, build tasks, engineering logs, time tracking, and milestone progress.',
  'engineering',
  'cpu',
  '#7C3AED',
  true,
  null,
  '{
    "modules": [
      { "feature_key": "tasks", "module_key": "roadmap_tasks", "name": "Roadmap & Deliverables", "icon": "kanban", "sort_order": 0, "config": {} },
      {
        "feature_key": "custom_tables",
        "module_key": "resources",
        "name": "Learning Resources",
        "icon": "library",
        "sort_order": 1,
        "config": {},
        "fields": [
          { "field_key": "resource_title", "label": "Resource", "field_type": "short_text", "is_required": true, "sort_order": 0 },
          { "field_key": "resource_type", "label": "Format", "field_type": "dropdown", "is_required": true, "options": ["Course", "Paper", "Book", "Documentation", "Lab"], "sort_order": 1 },
          { "field_key": "url", "label": "Link", "field_type": "url", "is_required": false, "sort_order": 2 },
          { "field_key": "status", "label": "Status", "field_type": "dropdown", "is_required": true, "options": ["Queued", "In Progress", "Completed"], "sort_order": 3 },
          { "field_key": "rating", "label": "Value Rating", "field_type": "rating", "is_required": false, "sort_order": 4 }
        ]
      },
      { "feature_key": "journal", "module_key": "tech_journal", "name": "Engineering Notes", "icon": "file-code-2", "sort_order": 2, "config": {} },
      { "feature_key": "time_tracking", "module_key": "deep_work", "name": "Deep Work Timer", "icon": "timer", "sort_order": 3, "config": {} },
      { "feature_key": "goals", "module_key": "milestones", "name": "Skill Milestones", "icon": "flag", "sort_order": 4, "config": {} }
    ],
    "views": [
      { "view_type": "dashboard", "name": "Overview", "sort_order": 0, "is_default": true },
      { "view_type": "kanban", "name": "Board", "sort_order": 1, "is_default": false },
      { "view_type": "table", "name": "Resources", "sort_order": 2, "is_default": false }
    ]
  }'::jsonb
),
(
  'productivity',
  'Daily Productivity',
  'Combine daily tasks, recurring habits, measurable goals, reflective journaling, and focus time tracking.',
  'productivity',
  'zap',
  '#D97706',
  true,
  null,
  '{
    "modules": [
      { "feature_key": "tasks", "module_key": "daily_tasks", "name": "Action Tasks", "icon": "check-square", "sort_order": 0, "config": {} },
      { "feature_key": "habits", "module_key": "habits", "name": "Daily Habits", "icon": "flame", "sort_order": 1, "config": {} },
      { "feature_key": "goals", "module_key": "goals", "name": "Weekly Goals", "icon": "target", "sort_order": 2, "config": {} },
      { "feature_key": "time_tracking", "module_key": "focus_timer", "name": "Focus Sessions", "icon": "clock", "sort_order": 3, "config": {} },
      { "feature_key": "journal", "module_key": "daily_journal", "name": "Daily Reflection", "icon": "book-open", "sort_order": 4, "config": { "enableMood": true } },
      { "feature_key": "calendar", "module_key": "schedule", "name": "Schedule", "icon": "calendar", "sort_order": 5, "config": {} }
    ],
    "views": [
      { "view_type": "dashboard", "name": "Overview", "sort_order": 0, "is_default": true },
      { "view_type": "list", "name": "Tasks", "sort_order": 1, "is_default": false },
      { "view_type": "calendar", "name": "Calendar", "sort_order": 2, "is_default": false }
    ]
  }'::jsonb
),
(
  'custom-calculator',
  'Custom Calculator Workspace',
  'Build multi-input mathematical or financial calculators with versioned formulas, calculation logs, and trend charts.',
  'computation',
  'calculator',
  '#0284C7',
  true,
  null,
  '{
    "modules": [
      {
        "feature_key": "calculators",
        "module_key": "calculator_main",
        "name": "Custom Calculator",
        "icon": "calculator",
        "sort_order": 0,
        "config": {
          "calculator": {
            "name": "Compound Return & Target Estimator",
            "inputs_schema": [
              { "key": "principal", "label": "Starting Amount", "type": "currency", "unit": "$", "defaultValue": 10000, "min": 0 },
              { "key": "annual_rate_pct", "label": "Annual Rate (%)", "type": "percentage", "unit": "%", "defaultValue": 8, "min": 0, "max": 100 },
              { "key": "years", "label": "Horizon (Years)", "type": "integer", "unit": "yrs", "defaultValue": 5, "min": 1, "max": 100 }
            ],
            "outputs_schema": [
              { "key": "projected_value", "label": "Projected Total", "unit": "$", "precision": 2, "monetary": true },
              { "key": "total_gain", "label": "Net Growth", "unit": "$", "precision": 2, "monetary": true }
            ],
            "formulas": [
              { "key": "projected_value", "expression": "principal * pow(1 + (annual_rate_pct / 100), years)", "precision": 2, "monetary": true },
              { "key": "total_gain", "expression": "projected_value - principal", "precision": 2, "monetary": true }
            ]
          }
        }
      },
      { "feature_key": "charts", "module_key": "charts", "name": "Result History Chart", "icon": "line-chart", "sort_order": 1, "config": {} }
    ],
    "views": [
      { "view_type": "dashboard", "name": "Calculator", "sort_order": 0, "is_default": true },
      { "view_type": "charts", "name": "History", "sort_order": 1, "is_default": false }
    ]
  }'::jsonb
),
(
  'blank',
  'Blank Modular Topic',
  'Start with a clean slate and compose only the exact modules, fields, and views your workflow requires.',
  'custom',
  'layers',
  '#475569',
  true,
  null,
  '{
    "modules": [],
    "views": [
      { "view_type": "dashboard", "name": "Overview", "sort_order": 0, "is_default": true }
    ]
  }'::jsonb
)
on conflict (slug) where is_system = true
do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  accent_color = excluded.accent_color,
  definition = excluded.definition,
  updated_at = now();
