# Security Architecture & Threat Model — NEXORA

## 1. Security Objectives

- Complete tenant isolation between user accounts enforced at the PostgreSQL layer via RLS.
- Zero leakage of privileged credentials (`SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`) into client bundles, logs, or version control.
- Zero arbitrary code or SQL execution (`eval()`, `Function()`, raw SQL concatenation).
- Safe handling of rich text, file attachments, and formulas.

## 2. Threat Model & Mitigations

| Threat | Vector | Control Implemented |
|---|---|---|
| Cross-user data access (BOLA / IDOR) | Direct Supabase REST / RPC / API calls with another user's UUID | Strict RLS on all `public` tables (`TO authenticated`, `(select auth.uid()) = user_id`), composite FKs `(topic_id, user_id)` and `(module_id, topic_id, user_id)`, explicit `auth.uid()` checks inside any `SECURITY DEFINER` function |
| Spoofed session cookies in SSR | Forged `sb-*` cookie read via `getSession()` | Server components, API routes, and `src/proxy.ts` validate tokens via `supabase.auth.getClaims()` / `supabase.auth.getUser()` |
| Privilege escalation via `user_metadata` | User modifying `raw_user_meta_data` | Authorization checks never rely on `user_metadata`; ownership always checks `auth.uid()` |
| Formula injection / RCE | Malicious JS inside custom calculator formulas | Pure TypeScript recursive-descent lexer + AST evaluator with strict math function allowlist, complexity/depth caps, zero `eval` or `new Function` |
| Stored XSS in Journal/Notes | Malicious `<script>` or `onerror=` attributes in rich text | Strict DOMPurify / HTML allowlist sanitization prior to persistence and rendering |
| Unauthorized file access / path traversal | Guessing attachment URLs or overwriting other users' files | Private Storage bucket (`nexora-attachments`), RLS path prefix check `(storage.foldername(name))[1] = (select auth.uid())::text`, short-lived signed URLs, MIME & 10 MB size limits |
| Duplicate or conflicting writes | Double submits, concurrent multi-tab edits | `idempotency_records` with request SHA-256 verification + `version` column OCC returning `409 Conflict` |
| Views / Functions bypassing RLS | Views without `security_invoker` or exposed `SECURITY DEFINER` RPCs | Views created `WITH (security_invoker = true)`; RPCs default to `SECURITY INVOKER` unless trigger-only (`handle_new_user` with `SET search_path = ''` and `REVOKE ALL` from `anon`/`authenticated`) |

## 3. Content Security Policy & Headers

Configured in `next.config.ts` / response headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Strict `Content-Security-Policy` permitting self scripts, Supabase HTTPS/WSS origins, and Google Fonts/local fonts without unsafe inline eval.

## 4. Security Verification Plan

Two separate authenticated test users (`User A`, `User B`) are used in automated security tests (`tests/integration/security-rls.test.ts`) to confirm:
- User B cannot `SELECT`, `INSERT`, `UPDATE`, or `DELETE` User A's topics, modules, tasks, journal entries, custom records, calculators, or attachments.
- User B cannot insert a task referencing User A's `topic_id` or `module_id` (blocked by RLS + composite FKs).
- User B cannot generate signed URLs or download objects from User A's storage folder.
- Malicious formula payloads (`process.exit()`, `window.alert(1)`, `__proto__`) are rejected by the AST parser.
