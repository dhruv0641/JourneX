// @vitest-environment node
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@/types/database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const hasEnv = Boolean(SUPABASE_URL && PUBLISHABLE_KEY && SECRET_KEY);

describe.skipIf(!hasEnv)('Supabase RLS, Auth, Atomic RPCs, OCC & Storage Isolation', () => {
  let admin: SupabaseClient<Database>;
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let userAId = '';
  let userBId = '';

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `nexora-a-${suffix}@example.com`;
  const emailB = `nexora-b-${suffix}@example.com`;
  const password = 'NexoraTestPassword!2026';

  beforeAll(async () => {
    admin = createClient<Database>(SUPABASE_URL!, SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [resA, resB] = await Promise.all([
      admin.auth.admin.createUser({
        email: emailA,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Test User A' },
      }),
      admin.auth.admin.createUser({
        email: emailB,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Test User B' },
      }),
    ]);

    if (resA.error || !resA.data.user) throw resA.error ?? new Error('Failed creating user A');
    if (resB.error || !resB.data.user) throw resB.error ?? new Error('Failed creating user B');
    userAId = resA.data.user.id;
    userBId = resB.data.user.id;

    clientA = createClient<Database>(SUPABASE_URL!, PUBLISHABLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    clientB = createClient<Database>(SUPABASE_URL!, PUBLISHABLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [signInA, signInB] = await Promise.all([
      clientA.auth.signInWithPassword({ email: emailA, password }),
      clientB.auth.signInWithPassword({ email: emailB, password }),
    ]);

    if (signInA.error) throw signInA.error;
    if (signInB.error) throw signInB.error;
  });

  afterAll(async () => {
    if (userAId) {
      await admin.storage.from('nexora-attachments').remove([`${userAId}/rls-check/hello.txt`]);
      await admin.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await admin.auth.admin.deleteUser(userBId);
    }
  });

  it('auto-provisions profile and configurable preferences on user registration', async () => {
    const { data: profile, error: pErr } = await clientA
      .from('profiles')
      .select('*')
      .eq('id', userAId)
      .single();
    expect(pErr).toBeNull();
    expect(profile?.email).toBe(emailA);

    const { data: prefs, error: prefErr } = await clientA
      .from('user_preferences')
      .select('*')
      .eq('user_id', userAId)
      .single();
    expect(prefErr).toBeNull();
    expect(prefs?.app_name).toBe('NEXORA');
  });

  it('creates topics atomically with idempotency, prevents cross-user RLS access, and enforces OCC', async () => {
    const idemKey = `topic-${suffix}`;
    const payload = {
      name: 'IELTS Mastery',
      category: 'education',
      accent_color: '#2563EB',
      modules: [
        { feature_key: 'tasks', module_key: 'tasks', name: 'Study Tasks', sort_order: 0 },
        { feature_key: 'time_tracking', module_key: 'time_tracking', name: 'Focus Timer', sort_order: 1 },
      ],
      views: [
        { view_type: 'dashboard', name: 'Overview', sort_order: 0, is_default: true },
        { view_type: 'list', name: 'Tasks', sort_order: 1, is_default: false },
      ],
    };

    const { data: createdRaw, error: createErr } = await clientA.rpc('create_topic_atomic', {
      p_payload: payload,
      p_idempotency_key: idemKey,
    });
    expect(createErr).toBeNull();
    const created = createdRaw as { topic: { id: string; version: number }; modules: Array<{ id: string; feature_key: string }>; idempotent_replay: boolean };
    expect(created.idempotent_replay).toBe(false);
    expect(created.modules).toHaveLength(2);

    // Replay same key + same payload -> idempotent replay
    const { data: replayRaw, error: replayErr } = await clientA.rpc('create_topic_atomic', {
      p_payload: payload,
      p_idempotency_key: idemKey,
    });
    expect(replayErr).toBeNull();
    const replay = replayRaw as { topic: { id: string }; idempotent_replay: boolean };
    expect(replay.idempotent_replay).toBe(true);
    expect(replay.topic.id).toBe(created.topic.id);

    // Reuse same key with altered payload -> rejected
    const { error: conflictIdemErr } = await clientA.rpc('create_topic_atomic', {
      p_payload: { ...payload, name: 'Different Topic Name' },
      p_idempotency_key: idemKey,
    });
    expect(conflictIdemErr?.message).toMatch(/IDEMPOTENCY_CONFLICT/);

    // User B cannot read User A's topic
    const { data: bTopics } = await clientB.from('topics').select('*').eq('id', created.topic.id);
    expect(bTopics).toEqual([]);

    // User B cannot update User A's topic
    const { data: bUpdate } = await clientB
      .from('topics')
      .update({ name: 'Hijacked' })
      .eq('id', created.topic.id)
      .select();
    expect(bUpdate).toEqual([]);

    // User B cannot insert a task referencing User A's topic_id/module_id
    const tasksModule = created.modules.find((m) => m.feature_key === 'tasks')!;
    const { error: crossInsertErr } = await clientB.from('tasks').insert({
      user_id: userBId,
      topic_id: created.topic.id,
      module_id: tasksModule.id,
      title: 'Cross-tenant spoof',
    });
    expect(crossInsertErr).not.toBeNull();

    // Optimistic concurrency control on topic update
    const { data: v2, error: v2Err } = await clientA
      .from('topics')
      .update({ name: 'IELTS Band 8.5', version: created.topic.version + 1 })
      .eq('id', created.topic.id)
      .eq('version', created.topic.version)
      .select()
      .single();
    expect(v2Err).toBeNull();
    expect(v2?.version).toBe(2);

    // Stale update with version = 1 affects 0 rows
    const { data: staleUpdate } = await clientA
      .from('topics')
      .update({ name: 'Stale Overwrite', version: 2 })
      .eq('id', created.topic.id)
      .eq('version', 1)
      .select();
    expect(staleUpdate).toEqual([]);

    // Time tracking single-running-timer concurrency protection
    const timerMod = created.modules.find((m) => m.feature_key === 'time_tracking')!;
    const { data: startRaw, error: startErr } = await clientA.rpc('start_time_session_atomic', {
      p_topic_id: created.topic.id,
      p_module_id: timerMod.id,
      p_description: 'Reading mock test',
      p_idempotency_key: `timer-${suffix}`,
    });
    expect(startErr).toBeNull();
    const started = startRaw as { session: { id: string; version: number } };

    // Second concurrent running timer must fail cleanly
    const { error: secondStartErr } = await clientA.rpc('start_time_session_atomic', {
      p_topic_id: created.topic.id,
      p_module_id: timerMod.id,
      p_description: 'Concurrent timer',
    });
    expect(secondStartErr?.message).toMatch(/ACTIVE_TIMER_EXISTS/);

    // Stop timer cleanly
    const { data: stopped, error: stopErr } = await clientA.rpc('transition_time_session_atomic', {
      p_session_id: started.session.id,
      p_action: 'stop',
      p_expected_version: started.session.version,
    });
    expect(stopErr).toBeNull();
    expect(stopped?.status).toBe('completed');

    // Parallel competing optimistic concurrency race on topics (version = 2 -> 3)
    const [race1, race2] = await Promise.all([
      clientA
        .from('topics')
        .update({ description: 'Winner 1', version: 3 })
        .eq('id', created.topic.id)
        .eq('version', 2)
        .select(),
      clientA
        .from('topics')
        .update({ description: 'Winner 2', version: 3 })
        .eq('id', created.topic.id)
        .eq('version', 2)
        .select(),
    ]);
    const winnerCount = (race1.data?.length ?? 0) + (race2.data?.length ?? 0);
    expect(winnerCount).toBe(1);

    // Duplicate habit check-in prevention (same habit_id + same checkin_date)
    const { data: habitMod, error: habitModErr } = await clientA
      .from('topic_modules')
      .insert({
        user_id: userAId,
        topic_id: created.topic.id,
        feature_key: 'habits',
        module_key: 'daily_habits',
        name: 'Daily Habits',
      })
      .select()
      .single();
    expect(habitModErr).toBeNull();
    const { data: habitRow, error: habitErr } = await clientA
      .from('habits')
      .insert({
        user_id: userAId,
        topic_id: created.topic.id,
        module_id: habitMod!.id,
        title: '25m Vocabulary Drill',
      })
      .select()
      .single();
    expect(habitErr).toBeNull();
    const { error: firstCheckinErr } = await clientA.from('habit_checkins').insert({
      user_id: userAId,
      topic_id: created.topic.id,
      habit_id: habitRow!.id,
      checkin_date: '2026-11-26',
    });
    expect(firstCheckinErr).toBeNull();
    const { error: dupCheckinErr } = await clientA.from('habit_checkins').insert({
      user_id: userAId,
      topic_id: created.topic.id,
      habit_id: habitRow!.id,
      checkin_date: '2026-11-26',
    });
    expect(dupCheckinErr).not.toBeNull();

    // Global summary reflects real topic & completed session
    const { data: globalSummary, error: summaryErr } = await clientA.rpc('get_global_dashboard_summary', {
      p_days: 30,
      p_timezone: 'UTC',
    });
    expect(summaryErr).toBeNull();
    const summaryObj = globalSummary as { counts: { active_topics: number } };
    expect(summaryObj.counts.active_topics).toBe(1);
  });

  it('enforces private Storage isolation between users', async () => {
    const filePath = `${userAId}/rls-check/hello.txt`;
    const blob = new Blob(['nexora-private-file'], { type: 'text/plain' });

    const { error: uploadErr } = await clientA.storage
      .from('nexora-attachments')
      .upload(filePath, blob, { upsert: true });
    expect(uploadErr).toBeNull();

    // User B cannot upload into User A's folder
    const { error: crossUploadErr } = await clientB.storage
      .from('nexora-attachments')
      .upload(`${userAId}/rls-check/evil.txt`, blob);
    expect(crossUploadErr).not.toBeNull();

    // User B cannot download User A's file
    const { error: crossDownloadErr } = await clientB.storage
      .from('nexora-attachments')
      .download(filePath);
    expect(crossDownloadErr).not.toBeNull();
  });

  it('exposes safe health_check RPC to anon while keeping all tables blocked from anon', async () => {
    const anonClient = createClient<Database>(SUPABASE_URL!, PUBLISHABLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: healthy, error: healthErr } = await anonClient.rpc('health_check');
    expect(healthErr).toBeNull();
    expect(healthy).toBe(true);

    const { error: anonTableErr } = await anonClient.from('topic_templates').select('id').limit(1);
    expect(anonTableErr).not.toBeNull();
  });
});
