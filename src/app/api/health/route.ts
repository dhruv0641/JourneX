import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabasePublicConfig } from '@/lib/supabase/env';
import type { Database } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = getSupabasePublicConfig();

  if (!cfg) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'nexora',
        database: 'unconfigured',
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const supabase = createClient<Database>(cfg.url, cfg.key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.rpc('health_check');

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          service: 'nexora',
          database: 'unreachable',
          timestamp: new Date().toISOString(),
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      {
        status: 'ok',
        service: 'nexora',
        database: 'connected',
        ready: Boolean(data),
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'nexora',
        database: 'error',
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
