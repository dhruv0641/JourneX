import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
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
    const supabase = createClient<Database>(url, key, {
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
