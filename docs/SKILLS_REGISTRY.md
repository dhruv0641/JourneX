# Skills Registry

This file records every workspace agent skill installed in `.agents/skills/` for **JournalX** (`JourneX`), including provenance, commit pinning, inspection checks, and verification status.

## Installed Workspace Skills

| Skill Name | Source Repository | Pinned Commit / Version | Install Path | Purpose | Verification Status |
|---|---|---|---|---|---|
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | `a0d04109f4193a04ec6959549cd735d95ecaa90a` | `.agents/skills/ui-ux-pro-max/` | Design system generation, color/typography pairings, UX rules, chart guidance, Next.js/shadcn stack guidelines | Verified (`SKILL.md`, 49 files, Python search CLI audited & executed) |
| `ui-styling` | `nextlevelbuilder/ui-ux-pro-max-skill` | `a0d04109f4193a04ec6959549cd735d95ecaa90a` | `.agents/skills/ui-styling/` | Tailwind CSS + shadcn/ui + Radix UI + React Hook Form/Zod accessibility & dark-mode styling patterns | Verified (`SKILL.md`, 94 files) |
| `react-best-practices` | `vercel-labs/agent-skills` | `5a37a6329fbad3666c3207392a6a7c0110e92efb` (`1.0.0`) | `.agents/skills/react-best-practices/` | React & Next.js App Router performance, bundle optimization, waterfall elimination, RSC serialization | Verified (`SKILL.md`, 76 files) |
| `composition-patterns` | `vercel-labs/agent-skills` | `5a37a6329fbad3666c3207392a6a7c0110e92efb` (`1.0.0`) | `.agents/skills/composition-patterns/` | Scalable React 19 component composition, compound components, decoupled state providers | Verified (`SKILL.md`, 14 files) |
| `web-design-guidelines` | `vercel-labs/agent-skills` | `5a37a6329fbad3666c3207392a6a7c0110e92efb` (`1.1.0`) | `.agents/skills/web-design-guidelines/` | Web Interface Guidelines compliance audit (WCAG focus, forms, typography, touch, hydration) | Verified (`SKILL.md`, 2 files) |
| `supabase` | `supabase/agent-skills` | `c9be0e931b7930f7d02126d04774d904c381e7d7` (`0.1.2`) | `.agents/skills/supabase/` | Supabase Auth (`@supabase/ssr`, `getClaims()`, `getUser()`), Storage, Realtime, RLS, CLI & MCP best practices | Verified (`SKILL.md`, 4 files) |
| `supabase-postgres-best-practices` | `supabase/agent-skills` | `c9be0e931b7930f7d02126d04774d904c381e7d7` (`1.1.1`) | `.agents/skills/supabase-postgres-best-practices/` | PostgreSQL schema design, FK indexing, RLS performance `(select auth.uid())`, locking, transactions | Verified (`SKILL.md`, 36 files) |

## Security & Supply-Chain Inspection Notes

- All three upstream repositories are MIT-licensed (explicit `LICENSE` / frontmatter verified prior to extraction).
- No third-party installation scripts were blindly executed (`npm`/`npx` installers bypassed in favor of commit-pinned GitHub source archive extraction).
- `ui-ux-pro-max` Python scripts (`search.py`, `design_system.py`, `core.py`, `preview.py`, `reasoning_contract.py`) were inspected before execution: pure Python 3 standard library (`csv`, `json`, `pathlib`, `re`, `math`, `difflib`, `argparse`), zero external dependencies, zero network calls.
- Upstream test fixture directories (`scripts/tests/`) inside `ui-ux-pro-max` and `ui-styling` were omitted from `.agents/skills/` to keep the repository lean.
- `search.py` was verified with `--design-system`, `--tokens css`, `--domain ux`, `--domain chart`, `--stack nextjs`, and `--stack shadcn` queries during Phase 0/1.
