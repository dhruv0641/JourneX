/**
 * Generates a stable URL-safe slug from arbitrary user input.
 */
export function toSlug(input: string, fallback: string = 'topic'): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return normalized || fallback;
}

/**
 * Generates a stable snake_case field key from a display label.
 */
export function toFieldKey(label: string, fallback: string = 'field'): string {
  const cleaned = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  if (!cleaned) return fallback;
  return /^[a-z]/.test(cleaned) ? cleaned : `f_${cleaned}`;
}

/**
 * Builds a deterministic client-side idempotency key for retry-safe mutations.
 */
export function createIdempotencyKey(prefix: string = 'op'): string {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomId}`;
}

/**
 * Escapes and serializes tabular rows into RFC 4180 CSV with UTF-8 BOM for spreadsheet compatibility.
 */
export function serializeToCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const escapeCell = (value: unknown): string => {
    const raw = value === null || value === undefined ? '' : String(value);
    // Guard against spreadsheet formula injection (=, +, -, @ at start)
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    if (/[",\r\n]/.test(safe)) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };
  const headerLine = headers.map(escapeCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCell).join(','));
  return `\uFEFF${[headerLine, ...bodyLines].join('\r\n')}`;
}

/**
 * Parses CSV text cleanly, supporting quoted fields, embedded commas, and escaped quotes.
 */
export function parseCsv(csvText: string): { headers: string[]; rows: string[][] } {
  const text = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parsed: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      if (row.some((c) => c.trim().length > 0)) {
        parsed.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim().length > 0)) {
      parsed.push(row);
    }
  }

  const [headers = [], ...rows] = parsed;
  return { headers: headers.map((h) => h.trim()), rows };
}
