# Deployment & Operations Runbook — JournalX (JourneX)

This guide covers deploying **JournalX** cleanly on Vercel (or any Node 22/24 container host) backed exclusively by **Supabase** (PostgreSQL, Auth, Storage, Realtime), while staying within Supabase free-tier limits.

---

## 1. Prerequisites

- **Supabase Project:** Postgres 15+ (tested on Postgres `17.12`, project `czyfvgowomejvjrrancy`, `ap-southeast-2`).
- **Node.js:** `v24.x` (LTS) and **pnpm** (`12.x`).
- **GitHub / Vercel Account:** Optional for automatic CI/CD hosting.

---

## 2. Environment Configuration

Copy `.env.example` to `.env.local` (for local development) and configure your hosting provider's Environment Variables:

| Variable | Exposure | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Your Supabase project HTTPS URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + Server | Supabase `sb_publishable_...` / anon key |
| `SUPABASE_PROJECT_REF` | Local / CLI Only | Supabase project reference ID |
| `SUPABASE_ACCESS_TOKEN` | CLI / CI Only | Personal Supabase CLI access token (`sbp_...`) — **never prefix with `NEXT_PUBLIC_`** |
| `SUPABASE_DB_URL` | CLI Migration Only | Direct Postgres URI for `pnpm db:migrate` — **never expose to Next.js client bundles** |
| `SUPABASE_SECRET_KEY` | Server / Tests Only | Supabase `sb_secret_...` / service role key used ONLY for admin integration/E2E test cleanup — **never expose to browser** |

---

## 3. Database Provisioning & Migrations

All schema objects, RLS policies, Storage bucket rules, atomic RPC functions, and starter templates live in `supabase/migrations/`:

1. `20261126173001_initial_schema.sql` — 28 normalized tables, triggers, `updated_at` & `version` maintenance.
2. `20261126173002_rls_and_storage.sql` — Strict RLS (`ENABLE` + `FORCE`) on every table, private `nexora-attachments` bucket (10 MB limit, owner-scoped Storage policies), selective Realtime publication.
3. `20261126173003_rpc_functions.sql` — Atomic RPCs (`create_topic_atomic`, `duplicate_topic_atomic`, `start_time_session_atomic`, `transition_time_session_atomic`, `get_global_dashboard_summary`, `get_topic_analytics_summary`, `global_search_records`).
4. `20261126173004_seed_templates.sql` — 6 idempotent starter templates (`IELTS Preparation`, `Personal Finance`, `AI Engineering Lab`, `Fitness & Training`, `Daily Productivity`, `Blank Modular Topic`).
5. `20261126173005_fk_covering_indexes.sql` — Covering B-tree indexes for composite foreign keys.
6. `20261126200001_health_check_rpc.sql` — Safe read-only `public.health_check()` RPC for `/api/health` database connectivity & Supabase keep-alive pings.
7. `20261126204501_journalx_brand.sql` — Sets default `user_preferences.app_name` to `'JournalX'` and migrates default `'NEXORA'` records while preserving custom user names.

### Apply Migrations

```powershell
pnpm install --frozen-lockfile
pnpm db:migrate
```

*(Optionally regenerate TypeScript database definitions cleanly whenever migrations change via `pnpm db:types`.)*

---

## 4. Supabase Auth & Storage Configuration Checklist

1. **Auth Redirect URLs (Supabase Dashboard -> Authentication -> URL Configuration):**
   - **Site URL:** Your production URL (e.g., `https://your-app.vercel.app`) or `http://localhost:3000`.
   - **Additional Redirect URLs:**
     - `http://localhost:3000/auth/callback`
     - `https://your-app.vercel.app/auth/callback`
2. **Email Confirmation:** Enabled by default; users clicking confirmation or password-recovery links return cleanly through `/auth/callback` (`exchangeCodeForSession`) into `/dashboard` or `/reset-password`.
3. **Private Storage Bucket (`nexora-attachments`):**
   - Provisioned automatically by migration `20261126173002_rls_and_storage.sql` with `public = false` and `file_size_limit = 10485760` (10 MB).

---

## 5. Production Build & Hosting Deployment

### Local Production Run
```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start --port 3000
```

### Vercel Deployment
1. Import `https://github.com/dhruv0641/JourneX` into Vercel (`vercel.json` is already preconfigured for Next.js + `pnpm`).
2. Configure **only** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel Runtime Environment Variables (the Next.js app runtime requires no secret role key because all queries & RPCs enforce user JWT + PostgreSQL RLS!).
3. Verify `/api/health` returns `200 OK` after deployment (`{ "status": "ok", "database": "connected", "ready": true }`).
4. **Prevent Supabase Free Tier Inactivity Pausing:** In your GitHub repository **Settings → Secrets and variables → Actions → Variables**, add `APP_HEALTH_URL` set to `https://<your-domain>.vercel.app/api/health`. The workflow [.github/workflows/keep-alive.yml](../.github/workflows/keep-alive.yml) pings `/api/health` twice weekly (Monday & Thursday at `09:00 UTC`), running `public.health_check()` inside PostgreSQL so the free-tier database stays active automatically.

---

## 6. Security Headers, CSP & PWA Notes

- `next.config.ts` sets strict security headers on all routes: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Content-Security-Policy` scoped to `'self'` and your Supabase HTTPS/WSS host.
- `src/app/manifest.ts` serves `/manifest.webmanifest` dynamically, and `public/sw.js` registers automatically **only in production builds** (`NODE_ENV === 'production'`) to cache safe static shells while always serving authenticated HTML/Supabase requests network-first (`/offline` fallback when offline).

---

## 7. Backup, Portability & Recovery Procedures

- **User-Level Full Workspace Export:** Users can download a complete portable JSON snapshot of all topics, modules, fields, views, tasks, records, journal entries, timers, goals, habits, and calculation history under **Settings -> Export Full Workspace JSON**.
- **Single-Topic Blueprint Export / Import:** Export any topic's schema & module blueprint from `/topics` and re-import it in **Settings -> Import Topic Configuration (JSON)** on any account.
- **Database-Level Backups:** Supabase daily automated backups / `pg_dump` via `SUPABASE_DB_URL` protect PostgreSQL state.
- **Orphaned Storage Cleanup / Quotas:** All uploads reside under `${userId}/${topicId}/...` and are tracked in `public.attachments`. Keep `Supabase Free Tier` well under limits:
  - Current base schema + seed size: **`15 MB`** / `500 MB` limit.
  - File upload cap enforced at `10 MB` per file in both UI and PostgreSQL Storage policy.
