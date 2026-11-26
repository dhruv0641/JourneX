import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from '@/lib/supabase/env';
import type { Database } from '@/types/database.types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Returns the singleton browser Supabase client using public publishable credentials.
 */
export function createClient() {
  if (browserClient) return browserClient;

  const cfg = getSupabasePublicConfig();

  if (!cfg) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  browserClient = createBrowserClient<Database>(cfg.url, cfg.key);
  return browserClient;
}
