# User Guide — NEXORA Personal Operating System

Welcome to **NEXORA**, a configurable modular operating system where you design independent mini-applications ("Topics") for any domain—exam prep, software engineering, personal finance, habits, fitness, research, or project management.

---

## 1. Getting Started & Workspace Preferences

1. **Create Your Account (`/register`) or Sign In (`/login`):**
   - Sign up with your name, email, and an 8+ character password.
   - If your email requires verification, click the link sent to your inbox—you will be signed in and redirected automatically to `/dashboard`.
2. **Customize Brand Name, Theme & Timezone (`/settings`):**
   - Rename **Application Name** from `NEXORA` to anything personal (e.g., `DhruvOS`, `StudioCore`). It updates across headers, titles, and navigation immediately.
   - Set your **Timezone**, **Time Format** (`24-hour` or `12-hour`), **Theme** (`Light`, `Dark`, or `System`), and default analytics window.

---

## 2. Command Center Dashboard (`/dashboard`) & Command Palette (`Ctrl/Cmd + K`)

- **Real-Time KPI Row:** View live topic counts, pending/overdue tasks, 1-day/7-day/30-day focus time, and goal completion percentage computed in PostgreSQL.
- **Multi-Type Interactive Analytics:** Switch between `Area`, `Bar`, `Line`, `Donut`, and `Scatter` charts, or click **Table** for an accessible tabular breakdown of daily metrics.
- **Customize Widgets:** Click **Customize Widgets** to reorder sections via drag-and-drop or Up/Down keyboard controls, and show/hide individual blocks cleanly.
- **Command Palette (`Ctrl + K` / `⌘K`):** Click **Search…** or press `Ctrl+K` / `⌘K` anywhere to jump to pages, open any topic, or search across tasks, notes, records, and calculators stored in Postgres.

---

## 3. Creating Topics with the Dynamic Topic Builder (`/topics/new`)

Build a new topic mini-app in 6 guided steps:

1. **Identity:** Enter a topic name, category, description, icon, and accent color—or click a **Starter Template** (`IELTS Preparation`, `Personal Finance`, `AI Engineering Lab`, `Fitness & Training`, `Daily Productivity`, or `Blank Modular Topic`).
2. **Discovery:** Describe what you want to track in plain English and click **Apply Recommended Setup**. The deterministic intent engine recommends tailored modules, fields, views, and starter calculators while preserving rich template definitions.
3. **Modules:** Toggle modules on/off or add **multiple independent instances** of modular features (e.g., two custom tables or multiple calculators inside one topic).
4. **Configure:** Customize custom-table fields across 18 typed columns (`short_text`, `currency`, `decimal`, `percentage`, `dropdown`, `formula`, etc.), conditional visibility rules, or AST calculator formulas.
5. **Views:** Enable views (`Overview`, `Table`, `Kanban`, `List`, `Timeline`, `Calendar`, `Charts`) and choose which opens by default.
6. **Preview:** Inspect your configuration summary and click **Create Topic** to commit everything atomically.

---

## 4. Using Feature Modules Inside a Topic Workspace (`/topics/[slug]`)

| Module Tab | Capabilities |
|---|---|
| **Overview** | Real KPI summary cards (Tasks Completed, Focus Time, Entries & Logs, Goal Progress), 30-day trend chart, and quick previews of top topic modules. |
| **Tasks & Kanban** | Switch between **List** and **Kanban** views, filter/sort tasks, track subtasks checklists, and execute bulk completion or soft deletion with optimistic version protection. |
| **Time Tracking** | Start a server-timestamped **Live Timer** (visible globally in the top bar while running/paused—only one active timer per account at a time), or log historical manual durations cleanly. |
| **Custom Tables / Expense Ledger** | Sortable TanStack tables with live summary metrics (e.g., Total Income, Expenses, Net Balance for `expense_tracking`), conditional form fields, formula-computed columns, safe CSV export, and column-mapped **CSV Import** with row-level preview validation. |
| **Calculators** | Live versioned formula evaluators (powered by a safe AST math parser—zero arbitrary code execution) with **Saved Calculation History** and trend charts. Edit inputs/formulas anytime to create a new formula version without breaking older runs. |
| **Journal & Notes** | Clean rich-text editor (`Bold`, `Italic`, `List`, `Quote`, `H3`) with reflection templates, draft/published states, mood tagging, full-text search, and sanitized HTML persistence. |
| **Goals & Habits** | Increment/decrement measurable numeric targets (`+1` / `-1` with version checks) and check off scheduled daily/weekday habits once per local date with streak counters and activity heatmaps. |
| **Calendar & Reminders** | Monthly/upcoming event agenda combining custom calendar entries and dated task deadlines. |
| **Files & Attachments (`Files`)** | Upload private attachments (up to 10 MB per file) scoped to the topic in private Supabase Storage with timed signed download links. |
| **Configure (`Configure`)** | Rename/recolor topic, add or toggle modules, append/archive custom fields, adjust tabs/default views, **Duplicate Topic** cleanly, or export the topic configuration JSON. |

---

## 5. Topic Lifecycle, Exports & Concurrency Safety

- **Archive & Restore (`/topics`):** Archive finished topics to declutter active navigation without losing data; filter by **Archived Topics** to restore anytime.
- **Duplicate Topic:** Clone any topic's complete module, field, calculator, and view setup cleanly into an independent copy.
- **Full Backup (`/settings`):** Export your entire workspace as JSON anytime, or import a topic JSON blueprint into a brand-new topic.
- **Conflict Alerts:** Editing the same record concurrently across two browser tabs will display a non-destructive **Concurrent update detected** warning with **Reload latest** so recent work is never silently overwritten.

---

## 6. Installing as a Mobile / Desktop App (PWA)

On Chrome/Edge desktop or iOS/Android mobile browsers (over HTTPS production hosting):
- Select **Install NEXORA** / **Add to Home Screen** from the browser menu.
- Opens in clean **standalone mode** with bottom mobile quick navigation (`Home`, `Topics`, `Create`, `Activity`, `Profile`). If connectivity drops, an offline status notice appears cleanly without allowing stale conflicting writes.
