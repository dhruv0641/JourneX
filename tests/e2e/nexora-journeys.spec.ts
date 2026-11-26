import { createClient } from '@supabase/supabase-js';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

config({ path: '.env.local', quiet: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

const SCREENSHOT_DIR = path.resolve(
  'C:\\Users\\dobar_zdc9vhh\\.gemini\\antigravity\\brain\\84c686c0-059c-4b1a-807f-91ad9b1ecabf\\screenshots',
);

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];

test.describe.serial('NEXORA End-to-End Enterprise Verification', () => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-${unique}@example.com`;
  const password = 'NexoraE2ePassword!2026';
  let createdUserId = '';

  test.beforeAll(async () => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const admin = createClient(SUPABASE_URL, SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Architect' },
    });
    if (error || !data.user) {
      throw error ?? new Error('Unable to create E2E test user');
    }
    createdUserId = data.user.id;
  });

  test.afterAll(async () => {
    if (createdUserId) {
      const admin = createClient(SUPABASE_URL, SECRET_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.auth.admin.deleteUser(createdUserId);
    }
  });

  test('executes all 15 user journeys, multi-context sync, exports, accessibility, and responsive visual audit', async ({
    browser,
    page,
  }) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('response', (res) => {
      if (res.status() >= 500) {
        serverErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    // 0. Public Landing Page + WCAG Accessibility + Desktop Screenshot
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'landing-light-1440.png') });
    const landingAxe = await new AxeBuilder({ page }).analyze();
    expect(landingAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    // 1. Login & Session Persistence + Verify registration page renders cleanly
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /Create your workspace/i })).toBeVisible();

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Open review' }).click();
    await expect(page.getByRole('heading', { name: 'Workspace review' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Global date range' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();

    // Capture Light Dashboard Screenshot (Desktop 1440)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-light-1440.png') });

    // Accessibility check on Dashboard (full WCAG rules)
    const dashAxe = await new AxeBuilder({ page }).analyze();
    expect(dashAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    // 2. Create a Blank Topic
    await page.goto('/topics/new');
    await page.getByLabel('Topic Name').fill('Blank Scratchpad');
    await page.getByRole('button', { name: /Blank Modular Topic/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    // Ensure at least one module is enabled for blank topic
    await page.getByRole('button', { name: 'Enable' }).first().click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: 'Create Topic' }).click();
    await page.waitForURL('**/topics/blank-scratchpad', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Blank Scratchpad', level: 1 })).toBeVisible();

    // 3. Create an IELTS Preparation Topic using Template + Intent Discovery
    await page.goto('/topics/new');
    await page.getByLabel('Topic Name').fill('IELTS Academic 2026');
    await page
      .getByLabel(/What do you want to track/i)
      .fill('Track reading, listening, writing, speaking practice band scores, study timer, and daily tasks');
    await page.getByRole('button', { name: /IELTS Preparation/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Apply Recommended Setup/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: 'Create Topic' }).click();
    await page.waitForURL('**/topics/ielts-academic-2026', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'IELTS Academic 2026', level: 1 })).toBeVisible();

    // 4. Add multiple practice sessions on the same day
    await page.getByRole('tab', { name: /Practice & Mock Scores/i }).click();
    for (const [title, score, mins] of [
      ['Cambridge Test 18 Reading', '8.0', '60'],
      ['Cambridge Test 18 Listening', '8.5', '40'],
    ]) {
      await page.getByRole('button', { name: 'Add Entry' }).first().click();
      await page.getByLabel('Summary / Title').fill(title!);
      await page.getByLabel(/Skill/i).selectOption(title!.includes('Reading') ? 'Reading' : 'Listening');
      await page.getByLabel(/Band Score/i).fill(score!);
      await page.getByLabel(/Duration \(min\)/i).fill(mins!);
      await page.getByRole('button', { name: 'Save Entry' }).click();
      await expect(page.getByText(title!).first()).toBeVisible({ timeout: 10_000 });
    }

    // 5. Log Time Session and Verify Totals
    await page.getByRole('tab', { name: /Study Timer/i }).click();
    await page.getByLabel('Session Description', { exact: true }).fill('IELTS Writing Task 2 Drill');
    await page.getByLabel('Duration (minutes)').fill('45');
    await page.getByRole('button', { name: 'Save Time Entry' }).click();
    await expect(page.getByText('IELTS Writing Task 2 Drill').first()).toBeVisible({ timeout: 10_000 });

    // 6. Create and Complete Tasks
    await page.getByRole('tab', { name: /Study Tasks/i }).click();
    await page.getByPlaceholder('Add task or deliverable…').fill('Complete Speaking Cue Cards');
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByText('Complete Speaking Cue Cards').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Complete task' }).first().click();

    // 7. Create Journal Entry
    await page.getByRole('tab', { name: /Study Reflection/i }).click();
    await page.getByLabel('Title', { exact: true }).fill('Day 1 Mock Analysis');
    await page.getByRole('textbox', { name: 'Journal rich text editor' }).fill('Improved skimming speed in passage 3.');
    await page.getByRole('button', { name: 'Publish Entry' }).click();
    await expect(page.getByText('Day 1 Mock Analysis').first()).toBeVisible({ timeout: 10_000 });

    // 8 & 9. Calculator & Save Calculation History
    await page.getByRole('tab', { name: /IELTS Band Calculator/i }).click();
    await page.getByLabel(/Calculation Label/i).fill('Target Check #1');
    await page.getByRole('button', { name: /Save Calculation to History/i }).click();
    await expect(page.getByText('Target Check #1').first()).toBeVisible({ timeout: 10_000 });

    // 10 & 11. Modify Topic Configuration & Verify Persistence After Refresh
    await page.getByRole('tab', { name: 'Configure' }).click();
    await page.getByPlaceholder('Custom module title…').fill('Daily Study Habits');
    await page.getByLabel('Choose module type').selectOption('habits');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Daily Study Habits' })).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.getByRole('tab', { name: /Daily Study Habits/i })).toBeVisible({ timeout: 10_000 });

    // Verify Overview Analytics reflects real data
    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(page.getByText('1 / 1').first()).toBeVisible(); // 1/1 completed task
    await expect(page.getByText('45m 00s').first()).toBeVisible(); // 45m focus time

    // Screenshot Topic Workspace Light
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'topic-ielts-light-1440.png') });

    // 12. Verify Synchronization Across Browser Contexts
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await secondPage.goto('/login', { waitUntil: 'networkidle' });
    await secondPage.getByLabel('Email address').fill(email);
    await secondPage.getByLabel('Password', { exact: true }).fill(password);
    await secondPage.getByRole('button', { name: 'Sign in' }).click();
    await secondPage.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(secondPage.getByText('IELTS Academic 2026').first()).toBeVisible({ timeout: 10_000 });
    await secondContext.close();

    // 13. Export User Data & Switch to Dark Mode
    await page.goto('/settings');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export Full Workspace JSON/i }).click(),
    ]);
    const downloadPath = await download.path();
    const exportedJson = JSON.parse(fs.readFileSync(downloadPath!, 'utf8'));
    expect(exportedJson.topics.length).toBeGreaterThanOrEqual(2);

    // Toggle Dark Mode & capture dark settings + dark dashboard
    await page.getByLabel(/Switch theme/i).click(); // light -> dark (or cycle until .dark class present)
    for (let i = 0; i < 3; i += 1) {
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (isDark) break;
      await page.getByLabel(/Switch theme/i).click();
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-dark-1440.png') });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-dark-1440.png') });

    // 14. Archive and Restore Topic
    await page.goto('/topics');
    await page.getByRole('button', { name: 'Archive topic' }).first().click();
    await page.getByLabel('Topic status filter').selectOption('archived');
    await expect(page.getByRole('button', { name: 'Restore topic' }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Restore topic' }).first().click();

    // 15. Responsive Multi-Viewport Overflow & Mobile Navigation Check
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/dashboard');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `Horizontal overflow at ${vp.name}`).toBeLessThanOrEqual(2);

      if (vp.width <= 430) {
        await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
      }
      if (vp.width === 390) {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-dark-mobile-390.png') });
      }
    }

    // Phone module picker supports deep links, history, and reading a published entry.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/topics/ielts-academic-2026?tab=tasks');
    const picker = page.getByRole('combobox', { name: 'Topic section' });
    await expect(picker.locator('option:checked')).toHaveText('Study Tasks');
    await picker.selectOption({ label: 'Study Reflection' });
    await page.getByRole('button', { name: 'Entries', exact: true }).click();
    await expect(page.getByText('Day 1 Mock Analysis', { exact: true })).toBeVisible();
    await page.goBack();
    await expect(picker.locator('option:checked')).toHaveText('Study Tasks');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  });
});
