import { createHash } from 'node:crypto';
import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid UUID identifier');

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a 6-digit hex value like #2563EB');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export class AppConflictError extends Error {
  readonly code = 'CONFLICT';
  readonly status = 409;
  readonly serverState?: unknown;

  constructor(message: string, serverState?: unknown) {
    super(message);
    this.name = 'AppConflictError';
    this.serverState = serverState;
  }
}

export class AppValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'AppValidationError';
  }
}

/**
 * Computes a deterministic SHA-256 hash of a JSON-serializable payload for idempotency checks.
 */
export function hashRequestPayload(payload: unknown): string {
  const canonical = stableStringify(payload);
  return createHash('sha256').update(canonical).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(',')}}`;
}
