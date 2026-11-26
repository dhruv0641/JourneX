# JournalX — Modular Personal Operating System

**JournalX** is an enterprise-grade, schema-driven modular personal operating system built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Supabase (PostgreSQL, Auth, Storage, Realtime)**.

Instead of hardcoding vertical trackers, JournalX lets users compose independent mini-applications ("Topics") from reusable, configurable modules (`tasks`, `time_tracking`, `custom_tables`, `custom_forms`, `expense_tracking`, `calculators`, `journal`, `notes`, `activity_logs`, `goals`, `habits`, `calendar`, `attachments`, `statistics`, `charts`) persisted inside a normalized PostgreSQL schema with row-level tenant isolation.

---

## Key Capabilities

- **Dynamic 6-Step Topic Builder:** Create custom topics from 6 seeded templates or a blank slate, guided by a deterministic multi-signal intent discovery engine.
- **Configurable Feature Engine:** Support multi-instance modules, 18 typed custom fields (including conditional visibility and live formula fields), versioned AST calculators (zero `eval()`), Kanban/List/Table/Calendar/Chart views, and live topic reconfiguration.
- **Enterprise Integrity & Security:** Strict RLS across all 28 `public` tables, composite foreign keys preventing cross-tenant references, optimistic concurrency control (`version`), idempotency keys on atomic RPCs, private Storage signed URLs, CSV formula-injection guards, and rich-text HTML sanitization.
- **Real PostgreSQL Analytics & Search:** Dashboard KPIs, 30-day multi-series Recharts visualizations (with accessible table toggles), `Ctrl/Cmd + K` global command search, and live Supabase Realtime synchronization.
- **Full Data Portability & PWA:** Column-mapped CSV import/export, topic JSON blueprint import/export, full workspace JSON backup, and installable PWA manifest + service worker with offline awareness.

---

## Technology Stack

- **Frontend:** Next.js `16.4.6` (App Router, Turbopack), React `19.3.1`, TypeScript `5.9.3` (`strict`), Tailwind CSS `4.3.5`, Radix UI, Lucide Icons, Recharts `3.11.1`, TanStack Table `8.21.3`, TanStack Query `5.108.4`, `@dnd-kit`, React Hook Form + Zod `4.6.7`, Zustand `5.1.0`, `next-themes`, `cmdk`, `isomorphic-dompurify`.
- **Backend & Database:** Supabase PostgreSQL (`17.12`), `@supabase/ssr` (`getClaims()`/`getUser()`), Supabase Auth, private Supabase Storage, selective Supabase Realtime, PL/pgSQL atomic RPC functions & triggers.
- **Quality & Testing:** Vitest `5.1.2`, React Testing Library, Playwright `1.65.1`, `@axe-core/playwright` `4.14.1`, ESLint `9.39.5`, Prettier.

---

## Quick Start

1. **Install dependencies:**
   ```powershell
   pnpm install --frozen-lockfile
   ```
2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and supply your Supabase project credentials. Never expose `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, or `SUPABASE_ACCESS_TOKEN` client-side or prefix them with `NEXT_PUBLIC_`.
3. **Push database schema, RLS policies, RPCs, and templates:**
   ```powershell
   pnpm db:migrate
   ```
4. **Run local development server:**
   ```powershell
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Run Next.js development server with Turbopack |
| `pnpm build` | Build production Next.js App Router bundle |
| `pnpm start` | Start built Next.js production server |
| `pnpm typecheck` | Run TypeScript compiler type check (`tsc --noEmit`) |
| `pnpm lint` | Run ESLint across workspace |
| `pnpm test` | Execute all Vitest unit and live Supabase integration tests |
| `pnpm test:unit` | Execute pure unit tests (`tests/unit/`) |
| `pnpm test:integration` | Execute live Postgres RLS, RPC & Storage tests (`tests/integration/`) |
| `pnpm test:e2e` | Run Playwright Chromium end-to-end & accessibility suite (`tests/e2e/`) |
| `pnpm db:migrate` | Push SQL migrations in `supabase/migrations/` to Supabase |
| `pnpm db:types` | Regenerate TypeScript types from Supabase (`src/types/database.types.ts`) |

---

## Project Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System layers, design tradeoffs, and data flow contracts
- [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) — PostgreSQL architecture, RLS design, concurrency, and indexing
- [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) — Detailed schema reference for all 28 tables
- [`docs/FEATURE_REGISTRY.md`](docs/FEATURE_REGISTRY.md) — Dynamic module registry & custom field type catalog
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — Design tokens, typography, responsive shells, and chart palettes
- [`docs/SECURITY.md`](docs/SECURITY.md) — Threat model, SSR auth boundaries, AST & sanitizer controls
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — End-user operating manual
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Production setup, Vercel & Supabase runbook
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) — Latest verification metrics across unit, live DB, build, WCAG, and E2E
- [`docs/SKILLS_REGISTRY.md`](docs/SKILLS_REGISTRY.md) — Installed commit-pinned engineering skills
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) — Milestone task board & commit history
