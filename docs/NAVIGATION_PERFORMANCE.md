# Navigation performance verification

Verified on 2026-11-26 with an authenticated temporary user in Chromium against a local Next.js production build connected to the configured Supabase project. The benchmark creates and deletes its own user and topic; run it with `npx tsx scripts/benchmark-navigation.ts` while `npm run start -- -p 3000` is serving a fresh build.

## Findings and changes

- A shared dashboard `loading.tsx` imposed an approximately 300 ms wait on routes that could otherwise open immediately. It was removed.
- Server pages waited for Supabase reads before showing content. Profile, list, and analytics reads each took roughly 280–350 ms in the warm baseline, so sequential reads added visible delay. Main routes now open from the shared workspace context and fetch page data through TanStack Query. Repeat visits reuse cached data.
- Visible navigation links triggered background route prefetches that repeated workspace bootstrap queries and competed with the user's chosen route. Prefetch was disabled for workspace and topic navigation links.
- The Review chart and Settings content load separately from their lightweight page shells.
- Topic detail previously needed a topic lookup followed by six related table requests. A single nested PostgREST select now loads the same bundle in one network request. Analytics loads independently, so the topic workspace can appear before analytics completes.

## Measured results

| Route        |                  Before: content visible | After: heading visible |     After: content visible |
| ------------ | ---------------------------------------: | ---------------------: | -------------------------: |
| Activity     |                                0.9–1.4 s |                  73 ms |   0.9 s cold; 67 ms cached |
| Today        |                               0.85–1.4 s |                  57 ms |               68 ms cached |
| Topics       |                    0.85 s on first visit |                  72 ms |                      78 ms |
| Review       |                               0.86–1.4 s |                 110 ms | 0.43 s cold; 0.14 s cached |
| Settings     | 0.44 s before route-specific improvement |                  90 ms |                0.41 s cold |
| New Topic    |                                   0.86 s |                 144 ms |                0.48 s cold |
| Topic detail |            1.4–1.9 s before nested query |                  67 ms |                0.89 s cold |

Timings are individual observed runs, not a percentile or service level guarantee. Supabase and network latency varies: single reads were commonly about 300 ms and occasionally slower. The heading measurement is click-to-visible destination; content measurement waits for the feature's loading state to finish.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed with one existing React Compiler warning in the TanStack Table module.
- `npm run test:unit`: 13 tests passed.
- `npm run build`: passed.
- `npx playwright test tests/e2e/nexora-journeys.spec.ts --project=chromium`: all 15 authenticated journeys passed, including topic creation/editing, accessibility, and responsive viewports.
- The benchmark checks the nested topic bundle contains its module, field, and view before measuring navigation. Temporary test data is deleted in `finally`.
