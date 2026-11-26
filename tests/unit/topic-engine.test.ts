import { describe, expect, it } from 'vitest';
import { validateCustomRecordValues } from '@/engine/schema-engine/field-validation';
import { discoverTopicRequirements } from '@/engine/template-engine/intent-matcher';
import { parseCsv, serializeToCsv, toFieldKey, toSlug } from '@/lib/utilities/csv';
import { computeElapsedSeconds, formatTimerClock, getLocalDateKey } from '@/lib/utilities/dates';

describe('Dynamic Topic Intent Matcher & Schema Validation', () => {
  it('recommends IELTS modules & band calculator deterministically', () => {
    const rec = discoverTopicRequirements({
      name: 'IELTS Academic Prep',
      description: 'Track reading, listening, writing, speaking practice scores and study timer',
      category: 'education',
    });
    expect(rec.confidence).toBe('high');
    expect(rec.recommendedTemplateSlug).toBe('ielts-preparation');
    expect(rec.recommendedModules).toContain('calculators');
    expect(rec.recommendedModules).toContain('time_tracking');
    expect(rec.suggestedCalculator?.formulas.length).toBeGreaterThan(0);
  });

  it('falls back cleanly to generic builder when topic intent is ambiguous', () => {
    const rec = discoverTopicRequirements({
      name: 'Quantum Butterfly Sanctuary',
      description: 'Something completely unusual',
    });
    expect(rec.confidence).toBe('low');
    expect(rec.recommendedTemplateSlug).toBe('blank');
    expect(rec.recommendedModules.length).toBeGreaterThan(0);
  });

  it('validates custom fields, conditional visibility, and formula fields', () => {
    const res = validateCustomRecordValues(
      [
        { field_key: 'qty', label: 'Quantity', field_type: 'integer', is_required: true, sort_order: 0 },
        { field_key: 'unit_price', label: 'Unit Price', field_type: 'currency', is_required: true, sort_order: 1 },
        {
          field_key: 'line_total',
          label: 'Line Total',
          field_type: 'formula',
          is_required: false,
          formula_expression: 'qty * unit_price',
          sort_order: 2,
        },
        {
          field_key: 'notes',
          label: 'Discount Reason',
          field_type: 'short_text',
          is_required: true,
          visibility_condition: { dependsOnFieldKey: 'apply_discount', operator: 'truthy' },
          sort_order: 3,
        },
      ],
      { qty: '3', unit_price: '12.5', apply_discount: false },
    );
    expect(res.valid).toBe(true);
    expect(res.normalizedData.qty).toBe(3);
    expect(res.normalizedData.line_total).toBe(37.5);
  });

  it('guards CSV formula injection and parses quoted fields accurately', () => {
    const csv = serializeToCsv(['Name', 'Note'], [['=SUM(A1)', 'Hello, "World"']]);
    expect(csv).toContain("'=SUM(A1)");
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(['Name', 'Note']);
    expect(parsed.rows[0]).toEqual(["'=SUM(A1)", 'Hello, "World"']);
  });

  it('handles slugs, field keys, timezones, and elapsed timer math', () => {
    expect(toSlug('AI & Cyber Security 2026!')).toBe('ai-cyber-security-2026');
    expect(toFieldKey('2026 Band Score')).toBe('f_2026_band_score');
    expect(formatTimerClock(3661)).toBe('01:01:01');
    expect(getLocalDateKey(new Date('2026-11-26T22:00:00Z'), 'Asia/Kolkata')).toBe('2026-11-27');

    const elapsed = computeElapsedSeconds(
      {
        status: 'running',
        accumulated_seconds: 120,
        started_at: '2026-11-26T10:00:00Z',
        last_resumed_at: '2026-11-26T10:05:00Z',
      },
      new Date('2026-11-26T10:06:30Z').getTime(),
    );
    expect(elapsed).toBe(210);
  });
});
