# Verification & QA Test Report — JournalX (JourneX)

**Verified Code Commit:** `00b0805`  
**Supabase Project:** `JourneX` (`czyfvgowomejvjrrancy`, `ap-southeast-2`, Postgres `17.12`)  
**Verification Date:** `2026-11-26`  
**Result:** All automated static checks, unit tests, live Supabase RLS/RPC integration tests, production builds, and Playwright end-to-end verification passed with zero errors.

---

## 1. Test Execution Summary

| Check Suite | Command | Scope Covered | Result | Duration / Timing |
|---|---|---|---|---|
| **TypeScript Strict Check** | `pnpm typecheck` (`tsc --noEmit`) | Strict type validation across `src/`, `tests/`, `scripts/`, and generated `src/types/database.types.ts` | **Passed** (`0` errors) | Run in final verification chain |
| **ESLint Quality & Security Rules** | `pnpm lint` (`eslint .`) | Next.js Core Web Vitals, TypeScript rules, React Hooks & Compiler lint checks | **Passed** (`0` errors; 1 TanStack Table info warning) | Run in final verification chain |
| **Vitest Unit Suite** | `pnpm test` (`tests/unit/*.test.ts`) | AST Formula Engine (`formula-engine.test.ts`, 5 cases) & Topic Engine / CSV / Dates (`topic-engine.test.ts`, 5 cases) | **Passed** (`2` files, `10/10` tests) | `27ms` test execution |
| **Live Supabase Integration Suite** | `pnpm test` (`tests/integration/supabase-rls-rpc.test.ts`) | Real 2-user RLS isolation, cross-tenant FK spoof block, atomic topic RPC + idempotency key replay/conflict, parallel OCC version race (`Promise.all`), single-active-timer lock, unique daily habit check-in enforcement, private Storage isolation | **Passed** (`1` file, `3/3` test suites) | `11.38s` against live Supabase (`czyfvgowomejvjrrancy`) |
| **Production Build** | `pnpm build` (`next build`) | Next.js 16.4.6 Turbopack compilation across all 16 App Router routes & proxy middleware | **Passed** (`16/16` routes built) | Compile `1.99s`, TS `4.8s`, Static `2.2s` |
| **Playwright End-to-End Suite** | `pnpm test:e2e` (`tests/e2e/nexora-journeys.spec.ts`) | All 15 user journeys, multi-context synchronization, JSON workspace export verification, light/dark toggle, archive/restore, `@axe-core/playwright` WCAG audit (`/` & `/dashboard`), console/page/HTTP-5xx monitors, and 7 viewports (`360px`–`1920px`) | **Passed** (`1/1` full serial suite) | `56.8s` (`1.1m` total) |

---

## 2. Detailed Functional & Security Coverage

### 2.1 Unit Verification (`tests/unit/`)
- **Formula AST Engine (`tests/unit/formula-engine.test.ts` — 5/5 passed):**
  - Verifies AST arithmetic, ternary expressions, and allowlisted math functions (`round`, `sum`, `avg`, `clamp`, `pct`, `if`, etc.).
  - Verifies multi-step formula dependency evaluation (`raw_average` -> `official_band`).
  - Rejects unsafe payloads (`eval`, `__proto__`, `window`, `constructor`, unexpected syntax) before evaluation.
  - Detects cyclic formula definitions (`a -> b -> a`) and catches division-by-zero cleanly via `FormulaError`.
- **Dynamic Topic Engine & Utilities (`tests/unit/topic-engine.test.ts` — 5/5 passed):**
  - Confirms deterministic topic intent matching recommends IELTS modules (`calculators`, `time_tracking`, band formula) when keywords match (`confidence: 'high'`).
  - Confirms unrecognized topics (`"Quantum Butterfly Sanctuary"`) fall back cleanly to the generic modular builder (`confidence: 'low'`, `recommendedTemplateSlug: 'blank'`).
  - Verifies typed field validation, derived `formula` column evaluation, and conditional `visibility_condition` skipping when dependent fields are falsy.
  - Verifies CSV formula-injection neutralization (`'=SUM(A1)`) and quoted RFC-4180 round-trip parsing.
  - Verifies timezone-aware `getLocalDateKey` rollover, slug/key normalization (`toSlug`, `toFieldKey`), and elapsed active-timer arithmetic (`computeElapsedSeconds`).

### 2.2 Live Database, RLS & Concurrency Verification (`tests/integration/supabase-rls-rpc.test.ts` — 3/3 suites passed)
Executed against live Supabase project `czyfvgowomejvjrrancy` (automatically deleting temporary test users and Storage objects in `afterAll`):
1. **Trigger Provisioning:** Auth signup automatically creates `profiles` and default `user_preferences` (`app_name = 'JournalX'`).
2. **Idempotent Atomic Creation:** `create_topic_atomic` returns `idempotent_replay: false` on initial call, replays the identical stored payload on repeat call (`idempotent_replay: true` with same `topic.id`), and raises `IDEMPOTENCY_CONFLICT` if reused with a modified topic name.
3. **Strict Two-User Tenant Isolation (RLS & Composite FKs):** User B receives `[]` on `SELECT`/`UPDATE` against User A's topic and receives a database error when attempting to insert a task referencing User A's `topic_id`/`module_id`.
4. **Optimistic Concurrency & Race Conditions:**
   - Stale update (`version = 1` when DB is at `version = 2`) affects `0` rows.
   - Simultaneous `Promise.all` updates targeting `version = 2 -> 3` guarantee **exactly 1** winner (`winnerCount === 1`).
5. **Single Active Timer & Habit Deduplication:**
   - Second concurrent `start_time_session_atomic` call fails with `ACTIVE_TIMER_EXISTS`; stopping via `transition_time_session_atomic` completes cleanly.
   - Duplicate same-day insert into `habit_checkins(habit_id, checkin_date)` fails cleanly at the PostgreSQL unique index boundary.
6. **Private Storage Isolation:** User B cannot upload into `${userAId}/...` or download User A's object from bucket `nexora-attachments`.

### 2.3 Supabase Database Advisors & Resource Snapshot
Queried directly via Supabase MCP against live database `czyfvgowomejvjrrancy`:
- **`get_advisors(type: "security")`:** `[]` (**0 security lints**).
- **`get_advisors(type: "performance")`:** `0` `unindexed_foreign_keys` findings (resolved in `20261126173005_fk_covering_indexes.sql`); only expected `INFO` `unused_index` notices for fresh tables prior to production traffic accumulation.
- **Database Footprint (`execute_sql`):** Total database size **`15 MB`** (3% of 500 MB Supabase free-tier Postgres allocation), **`28`** RLS-enforced tables in `public`, and **`6`** seeded system starter templates.

---

## 3. End-to-End, Accessibility & Responsive Audit (`tests/e2e/nexora-journeys.spec.ts`)

### 3.1 Verified User Journeys (1–15)
1. **Registration & Login Session Persistence:** Verified `/register` render and authenticated login via `/login` -> `/dashboard`.
2. **Blank Modular Topic Creation:** Created `Blank Scratchpad`, enabled modular feature, saved via atomic RPC to `/topics/blank-scratchpad`.
3. **Template + Deterministic Discovery Creation:** Created `IELTS Academic 2026` using IELTS template + Intent Discovery (`Apply Recommended Setup` verified preserving tailored template module definitions and IELTS calculator).
4. **Structured Custom Records:** Logged multiple same-day practice entries (`Cambridge Test 18 Reading` 8.0, `Cambridge Test 18 Listening` 8.5) into `Practice & Mock Scores`.
5. **Time Tracking & Totals:** Logged a 45-minute manual study session (`IELTS Writing Task 2 Drill`).
6. **Tasks & Completion:** Created `Complete Speaking Cue Cards` and completed it (`1 / 1`, 100%).
7. **Rich-Text Journal Entry:** Published `Day 1 Mock Analysis` via sanitized `contentEditable` editor.
8–9. **AST Calculator & Saved History:** Saved `Target Check #1` calculation run in `IELTS Band Calculator`.
10–11. **Live Topic Reconfiguration & Reload Persistence:** Added `Daily Study Habits` module under `Configure`, reloaded page, confirmed persistence and real recalculated KPIs (`1 / 1` tasks, `45m 00s` focus time) on `Overview`.
12. **Multi-Context Synchronization:** Logged into a separate clean Playwright browser context and verified persisted topics loaded across sessions.
13. **Workspace JSON Export & Dark Mode:** Downloaded and parsed full JSON backup verifying `topics.length >= 2`; toggled to dark theme cleanly.
14. **Topic Lifecycle (Archive & Restore):** Archived a topic, switched filter to `archived`, and restored it to `active`.
15. **Responsive Overflow & Mobile Shell Verification:** Checked `documentElement.scrollWidth - clientWidth <= 2` across **all 7 viewports** (`360×800`, `390×844`, `430×932`, `768×1024`, `1024×768`, `1440×900`, `1920×1080`) and confirmed visible bottom `Mobile navigation` on `<= 430px`.

### 3.2 Accessibility & Visual Audit
- **WCAG 2.2 AA (`@axe-core/playwright`):** Verified full default rule set (including `color-contrast` and `label-content-name-mismatch`) on `/` and `/dashboard` with **0 critical and 0 serious violations**. Fixed WCAG 2.5.3 `label-content-name-mismatch` discovered on the topbar global search button (`src/components/layout/app-shell.tsx`).
- **Toast Overlay Fix:** Fixed bottom-right toast overlay intercepting clicks over wizard footer buttons (`src/components/shared/state-views.tsx`, `src/stores/ui-store.ts`) by positioning non-blocking toasts at `top-16 right-4` with 4-second auto-dismissal.
- **Visual Screenshots Inspected:** Reviewed headless Chromium captures across `/` (`1440px` light), `/dashboard` (`1440px` light & dark, `390px` mobile dark), `/topics/ielts-academic-2026` (`1440px` light), and `/settings` (`1440px` dark).
- **Runtime Hygiene:** `pageErrors = []`, `consoleErrors = []`, `serverErrors (HTTP >= 500) = []`.

### 3.3 Known Verification Boundary / Environment Note
- **Interactive Chrome DevTools MCP (`chrome_devtools`):** When invoking the `browser` subagent against live `http://localhost:3000`, `list_pages` timed out after 60s waiting for user confirmation of Chrome's `"Allow remote debugging?"` security prompt. Headless Playwright Chromium executed all full interactive, visual, WCAG Axe, console, network, and responsive checks directly in place of the interactive DevTools session.
