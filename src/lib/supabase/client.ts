import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Returns the singleton browser Supabase client using public publishable credentials.
 */
export function createClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  browserClient = createBrowserClient<Database>(url, key);
  return browserClient;
}
