import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'a',
  'hr',
  'span',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

/**
 * Sanitizes untrusted rich-text HTML before database persistence or browser rendering.
 */
export function sanitizeRichHtml(dirtyHtml: string): string {
  const cleaned = DOMPurify.sanitize(dirtyHtml ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  });
  return cleaned;
}

/**
 * Extracts plain searchable text from HTML content.
 */
export function htmlToPlainText(html: string): string {
  const sanitized = sanitizeRichHtml(html);
  return sanitized
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes filenames prior to Supabase Storage object key construction.
 */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? 'attachment';
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return cleaned || 'attachment';
}
