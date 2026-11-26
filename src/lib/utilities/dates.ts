/**
 * Date, timezone, and duration formatting utilities using Intl APIs.
 * Avoids hardcoded locale strings and handles null/invalid inputs safely.
 */

export function formatDateInZone(
  value: string | Date | null | undefined,
  timeZone: string = 'UTC',
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
  }
}

export function formatDateTimeInZone(
  value: string | Date | null | undefined,
  timeZone: string = 'UTC',
  hour12: boolean = false,
): string {
  return formatDateInZone(value, timeZone, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
}

export function getLocalDateKey(date: Date = new Date(), timeZone: string = 'UTC'): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatDurationSeconds(totalSeconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

export function formatTimerClock(totalSeconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export function computeElapsedSeconds(session: {
  status: 'running' | 'paused' | 'completed';
  accumulated_seconds: number;
  last_resumed_at?: string | null;
  started_at: string;
}, nowMs: number = Date.now()): number {
  const base = Math.max(0, session.accumulated_seconds || 0);
  if (session.status !== 'running') return base;
  const anchorIso = session.last_resumed_at ?? session.started_at;
  const anchorMs = new Date(anchorIso).getTime();
  if (Number.isNaN(anchorMs)) return base;
  return base + Math.max(0, Math.floor((nowMs - anchorMs) / 1000));
}
