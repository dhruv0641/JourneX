import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { config } from 'dotenv';
import { performance } from 'node:perf_hooks';
import { fetchTopicDetailBySlug } from '../src/services/topics.service';
import type { Database } from '../src/types/database.types';

config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey)
  throw new Error('Supabase test credentials are required in .env.local');

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = `navigation-benchmark-${Date.now()}@example.com`;
const password = `Benchmark-${crypto.randomUUID()}!`;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const destinations = [
  { href: '/activity', label: 'Activity', heading: 'Activity timeline' },
  { href: '/dashboard', label: 'Today', heading: 'Today' },
  { href: '/topics', label: 'Topics', heading: 'Topics & Mini-Apps' },
  { href: '/review', label: 'Review', heading: 'Workspace review' },
];

async function main() {
  let userId: string | undefined;
  const browser = await chromium.launch();
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user)
      throw created.error ?? new Error('Unable to create test user');
    userId = created.data.user.id;
    const topicSlug = `benchmark-topic-${Date.now()}`;

    const client = createClient<Database>(url!, publishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    const inserted = await client.rpc('create_topic_atomic', {
      p_payload: {
        name: 'Benchmark Topic',
        slug: topicSlug,
        modules: [
          {
            feature_key: 'custom_tables',
            module_key: 'records',
            name: 'Records',
            fields: [{ field_key: 'title', label: 'Title', field_type: 'short_text' }],
          },
        ],
        views: [],
      },
    });
    if (inserted.error) throw inserted.error;
    const bundle = await fetchTopicDetailBySlug(client, userId, topicSlug);
    if (
      !bundle ||
      bundle.modules.length !== 1 ||
      bundle.fields.length !== 1 ||
      bundle.views.length !== 1
    ) {
      throw new Error('Embedded topic bundle is incomplete');
    }
    const embeddedStart = performance.now();
    const embedded = await client
      .from('topics')
      .select(
        '*, topic_modules(*, module_fields(*), calculator_definitions(*, calculator_versions(*))), module_views(*), dashboard_widgets(*)',
      )
      .eq('user_id', userId)
      .eq('slug', topicSlug)
      .maybeSingle();
    console.log(
      JSON.stringify({
        operation: 'embeddedTopic',
        ms: Math.round(performance.now() - embeddedStart),
        error: embedded.error?.message ?? null,
      }),
    );
    for (let round = 1; round <= 2; round++) {
      const operations = [
        ['claims', () => client.auth.getClaims()],
        [
          'profile',
          () => client.from('profiles').select('timezone').eq('id', userId!).maybeSingle(),
        ],
        [
          'topics',
          () => client.from('topics').select('*').eq('user_id', userId!).is('deleted_at', null),
        ],
        [
          'activity',
          () =>
            client
              .from('activity_logs')
              .select('*')
              .eq('user_id', userId!)
              .order('occurred_at', { ascending: false })
              .limit(80),
        ],
        [
          'summary',
          () => client.rpc('get_global_dashboard_summary', { p_days: 7, p_timezone: 'UTC' }),
        ],
      ] as const;
      for (const [name, operation] of operations) {
        const start = performance.now();
        const result = await operation();
        console.log(
          JSON.stringify({
            queryRound: round,
            operation: name,
            ms: Math.round(performance.now() - start),
            error: result.error?.message ?? null,
          }),
        );
      }
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();

    for (let round = 1; round <= 2; round++) {
      for (const destination of destinations) {
        const requests: Array<{ path: string; ms: number; status: number }> = [];
        const requestStarts = new Map<import('@playwright/test').Request, number>();
        const onRequest = (request: import('@playwright/test').Request) =>
          requestStarts.set(request, performance.now());
        const onResponse = (response: import('@playwright/test').Response) => {
          const requestURL = new URL(response.url());
          if (
            requestURL.origin !== new URL(baseURL).origin &&
            requestURL.origin !== new URL(url!).origin
          )
            return;
          const started = requestStarts.get(response.request());
          requests.push({
            path: requestURL.pathname,
            ms: started ? Math.round(performance.now() - started) : -1,
            status: response.status(),
          });
        };
        page.on('request', onRequest);
        page.on('response', onResponse);
        const start = performance.now();
        const link = page
          .getByRole('navigation', { name: 'Workspace navigation' })
          .getByRole('link', { name: destination.label });
        await link.click();
        await page.waitForURL(`**${destination.href}`);
        await page.getByRole('heading', { name: destination.heading, exact: true }).waitFor();
        const headingMs = Math.round(performance.now() - start);
        await page.locator('[aria-busy="true"]').waitFor({ state: 'hidden' });
        await page.getByText('Loading activity…', { exact: true }).waitFor({ state: 'hidden' });
        const contentMs = Math.round(performance.now() - start);
        page.off('response', onResponse);
        page.off('request', onRequest);
        console.log(
          JSON.stringify({ round, to: destination.href, headingMs, contentMs, requests }),
        );
      }
    }

    await page.getByRole('button', { name: 'User profile menu' }).click();
    let start = performance.now();
    await page.getByRole('link', { name: 'Settings & Export' }).click();
    await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
    const settingsHeadingMs = Math.round(performance.now() - start);
    await page.locator('[aria-busy="true"]').waitFor({ state: 'hidden' });
    console.log(
      JSON.stringify({
        to: '/settings',
        headingMs: settingsHeadingMs,
        contentMs: Math.round(performance.now() - start),
      }),
    );

    start = performance.now();
    await page.getByRole('link', { name: 'New Topic', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Dynamic Topic Builder' }).waitFor();
    const newTopicHeadingMs = Math.round(performance.now() - start);
    await page.locator('[aria-busy="true"]').waitFor({ state: 'hidden' });
    console.log(
      JSON.stringify({
        to: '/topics/new',
        headingMs: newTopicHeadingMs,
        contentMs: Math.round(performance.now() - start),
      }),
    );

    start = performance.now();
    await page.getByRole('link', { name: 'Benchmark Topic' }).first().click();
    await page.waitForURL(`**/topics/${topicSlug}`);
    await page.getByRole('heading', { name: 'Benchmark Topic', exact: true }).waitFor();
    const topicHeadingMs = Math.round(performance.now() - start);
    await page.locator('[aria-busy="true"]').waitFor({ state: 'hidden' });
    console.log(
      JSON.stringify({
        to: '/topics/[slug]',
        headingMs: topicHeadingMs,
        contentMs: Math.round(performance.now() - start),
      }),
    );
  } finally {
    await browser.close();
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) console.error('Test user cleanup failed:', error.message);
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
