import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabasePublicConfig } from '@/lib/supabase/env';

describe('getSupabasePublicConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes whitespace and accidental surrounding quotes', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '  "https://demo-ref.supabase.co/"  ');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', " 'sb_publishable_demo_123' ");

    expect(getSupabasePublicConfig()).toEqual({
      url: 'https://demo-ref.supabase.co',
      key: 'sb_publishable_demo_123',
    });
  });

  it('returns null when variables are missing or URL is invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    expect(getSupabasePublicConfig()).toBeNull();

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not-a-valid-url');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_demo_123');
    expect(getSupabasePublicConfig()).toBeNull();
  });
});
