/**
 * Normalizes public Supabase environment variables and strips accidental surrounding
 * whitespace or quotes (e.g., when copy-pasted into hosting dashboards).
 */
function normalizeEnv(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^["']|["']$/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getSupabasePublicConfig(): { url: string; key: string } | null {
  const url = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
