import type { SupabaseClient } from '@supabase/supabase-js';
import { AppConflictError } from '@/lib/validation/common';
import type { Database } from '@/types/database.types';
import type {
  NotificationRow,
  ProfileRow,
  TimeSessionRow,
  TopicRow,
  UserPreferencesRow,
} from '@/types/domain';

export interface WorkspaceBootstrapData {
  userId: string;
  email: string;
  profile: ProfileRow | null;
  preferences: UserPreferencesRow | null;
  topics: TopicRow[];
  runningTimer: TimeSessionRow | null;
  notifications: NotificationRow[];
}

/**
 * Fetches shell bootstrap data in parallel without waterfall chains.
 */
export async function fetchWorkspaceBootstrap(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string,
): Promise<WorkspaceBootstrapData> {
  const [profileRes, prefsRes, topicsRes, timerRes, notifRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('topics')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false }),
    supabase
      .from('time_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['running', 'paused'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  return {
    userId,
    email,
    profile: profileRes.data ?? null,
    preferences: prefsRes.data ?? null,
    topics: topicsRes.data ?? [],
    runningTimer: timerRes.data ?? null,
    notifications: notifRes.data ?? [],
  };
}

export async function updatePreferencesWithVersion(
  supabase: SupabaseClient<Database>,
  userId: string,
  patch: Partial<
    Pick<
      UserPreferencesRow,
      'app_name' | 'theme' | 'date_format' | 'time_format' | 'week_starts_on' | 'default_dashboard_range' | 'compact_mode'
    >
  >,
  expectedVersion: number,
): Promise<UserPreferencesRow> {
  const { data, error } = await supabase
    .from('user_preferences')
    .update({ ...patch, version: expectedVersion + 1 })
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const { data: latest } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    throw new AppConflictError('Preferences were modified in another session.', latest);
  }
  return data;
}

export async function updateProfileWithVersion(
  supabase: SupabaseClient<Database>,
  userId: string,
  patch: Partial<Pick<ProfileRow, 'full_name' | 'timezone' | 'avatar_url'>>,
  expectedVersion: number,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, version: expectedVersion + 1 })
    .eq('id', userId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const { data: latest } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    throw new AppConflictError('Profile was modified in another session.', latest);
  }
  return data;
}

export async function markNotificationRead(
  supabase: SupabaseClient<Database>,
  userId: string,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}
