# Agent Orchestration & Engineering Standards (NEXORA / JourneX)

This workspace uses the installed skills in `.agents/skills/` as authoritative engineering references across all development workflows:

1. **Solution Architecture (`Agent 01`)**: Owns system boundaries, feature registry contracts, topic configuration schema, and integration stability.
2. **UI/UX Architecture (`Agent 02`)**: Follows `.agents/skills/ui-ux-pro-max/` and `.agents/skills/web-design-guidelines/` for design tokens, contrast, accessibility (WCAG 2.2 AA), and mobile-first ergonomics.
3. **Frontend Engineering (`Agent 03`)**: Follows `.agents/skills/react-best-practices/`, `.agents/skills/composition-patterns/`, and `.agents/skills/ui-styling/` for Next.js App Router RSC/Client boundaries, React Hook Form + Zod validation, Recharts/TanStack Table, and bundle discipline.
4. **Database Architecture (`Agent 04`)**: Follows `.agents/skills/supabase-postgres-best-practices/` for UUID primary keys, composite FKs, FK/RLS indexing, `timestamptz`, `numeric`, short transactions, and optimistic concurrency.
5. **Backend & Integration (`Agent 05`)**: Follows `.agents/skills/supabase/` for `@supabase/ssr`, `getClaims()` / `getUser()`, RPC transactions, idempotency, Storage signed URLs, and selective Realtime.
6. **Security Engineering (`Agent 06`)**: Enforces strict RLS on all `public` tables, `(select auth.uid())` checks, sanitized rich-text HTML, AST-only formula evaluation (no `eval()`), and strict env separation (`NEXT_PUBLIC_` never contains secrets).
7. **QA & Testing (`Agent 07`)**: Owns Vitest unit tests, Supabase integration/concurrency/RLS tests, Playwright E2E journeys, and multi-viewport visual verification (360px–1920px, light & dark).
8. **DevOps & Documentation (`Agent 08`)**: Owns `.env.example`, build hygiene, migration verification, Git Conventional Commits, and synchronized `docs/` artifacts.

## Non-Negotiable Rules
- Never expose `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, or `SUPABASE_ACCESS_TOKEN` in client bundles, logs, or docs.
- Never commit `.env` or `.env.local`.
- Run typecheck, lint, unit tests, and build checks before milestone commits.
