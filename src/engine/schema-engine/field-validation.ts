import type { CustomFieldDraft, CustomFieldType } from '@/engine/feature-registry/types';
import { evaluateAst, parseFormula } from '@/engine/formula-engine/evaluator';

export interface FieldValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalizedData: Record<string, unknown>;
}

/**
 * Evaluates whether a custom field should be visible given current record values.
 */
export function isFieldVisible(
  field: Pick<CustomFieldDraft, 'visibility_condition'>,
  values: Record<string, unknown>,
): boolean {
  const cond = field.visibility_condition;
  if (!cond) return true;
  const targetVal = values[cond.dependsOnFieldKey];
  if (cond.operator === 'truthy') {
    return Boolean(targetVal);
  }
  if (cond.operator === 'eq') {
    return targetVal === cond.value;
  }
  if (cond.operator === 'neq') {
    return targetVal !== cond.value;
  }
  return true;
}

/**
 * Validates and normalizes custom record data against module_fields definitions,
 * including conditional visibility, type coercion, numeric bounds, and formula fields.
 */
export function validateCustomRecordValues(
  fields: Array<
    CustomFieldDraft & {
      is_archived?: boolean;
    }
  >,
  rawInput: Record<string, unknown>,
): FieldValidationResult {
  const errors: Record<string, string> = {};
  const normalizedData: Record<string, unknown> = { ...rawInput };
  const activeFields = fields.filter((f) => !f.is_archived);

  // First pass: validate and normalize non-formula fields
  for (const field of activeFields) {
    if (field.field_type === 'formula') continue;
    if (!isFieldVisible(field, normalizedData)) {
      continue;
    }

    const raw = normalizedData[field.field_key] ?? field.default_value ?? null;
    const isEmpty =
      raw === null ||
      raw === undefined ||
      (typeof raw === 'string' && raw.trim() === '') ||
      (Array.isArray(raw) && raw.length === 0);

    if (isEmpty) {
      if (field.is_required) {
        errors[field.field_key] = `${field.label} is required`;
      } else {
        normalizedData[field.field_key] = null;
      }
      continue;
    }

    const coerced = coerceAndValidateField(field.field_type, raw, field);
    if ('error' in coerced) {
      errors[field.field_key] = coerced.error;
    } else {
      normalizedData[field.field_key] = coerced.value;
    }
  }

  // Second pass: compute formula fields safely
  const numericVars: Record<string, number> = {};
  for (const field of activeFields) {
    const val = normalizedData[field.field_key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      numericVars[field.field_key] = val;
    }
  }

  for (const field of activeFields) {
    if (field.field_type !== 'formula' || !field.formula_expression) continue;
    try {
      const ast = parseFormula(field.formula_expression);
      const result = evaluateAst(ast, numericVars);
      const rounded = Math.round((result + Number.EPSILON) * 100) / 100;
      normalizedData[field.field_key] = rounded;
      numericVars[field.field_key] = rounded;
    } catch (err) {
      errors[field.field_key] =
        err instanceof Error ? err.message : `Invalid formula for ${field.label}`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedData,
  };
}

function coerceAndValidateField(
  fieldType: CustomFieldType,
  raw: unknown,
  field: CustomFieldDraft,
): { value: unknown } | { error: string } {
  const rules = field.validation_rules ?? {};

  switch (fieldType) {
    case 'short_text':
    case 'long_text': {
      const text = String(raw).trim();
      if (rules.pattern) {
        try {
          if (!new RegExp(rules.pattern).test(text)) {
            return { error: `${field.label} does not match expected format` };
          }
        } catch {
          // Ignore malformed user regex pattern gracefully
        }
      }
      return { value: text };
    }

    case 'integer':
    case 'duration':
    case 'rating': {
      const num = Number(raw);
      if (!Number.isInteger(num)) {
        return { error: `${field.label} must be a whole number` };
      }
      if (fieldType === 'rating' && (num < 1 || num > 5)) {
        return { error: `${field.label} must be between 1 and 5` };
      }
      if (rules.min !== undefined && num < rules.min) {
        return { error: `${field.label} must be at least ${rules.min}` };
      }
      if (rules.max !== undefined && num > rules.max) {
        return { error: `${field.label} must be at most ${rules.max}` };
      }
      return { value: num };
    }

    case 'decimal':
    case 'currency':
    case 'percentage': {
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        return { error: `${field.label} must be a valid number` };
      }
      const rounded =
        fieldType === 'currency'
          ? Math.round((num + Number.EPSILON) * 100) / 100
          : Math.round((num + Number.EPSILON) * 10000) / 10000;
      if (rules.min !== undefined && rounded < rules.min) {
        return { error: `${field.label} must be at least ${rules.min}` };
      }
      if (rules.max !== undefined && rounded > rules.max) {
        return { error: `${field.label} must be at most ${rules.max}` };
      }
      return { value: rounded };
    }

    case 'checkbox':
      return { value: raw === true || raw === 'true' || raw === 1 || raw === '1' };

    case 'date':
    case 'datetime': {
      const str = String(raw).trim();
      const parsed = new Date(str);
      if (Number.isNaN(parsed.getTime())) {
        return { error: `${field.label} must be a valid date` };
      }
      return { value: fieldType === 'date' ? str.slice(0, 10) : parsed.toISOString() };
    }

    case 'dropdown': {
      const val = String(raw).trim();
      if (field.options && field.options.length > 0 && !field.options.includes(val)) {
        return { error: `${field.label} must be one of: ${field.options.join(', ')}` };
      }
      return { value: val };
    }

    case 'multi_select':
    case 'tags': {
      const arr = Array.isArray(raw)
        ? raw.map((x) => String(x).trim()).filter(Boolean)
        : String(raw)
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);
      if (fieldType === 'multi_select' && field.options && field.options.length > 0) {
        const invalid = arr.filter((item) => !field.options!.includes(item));
        if (invalid.length > 0) {
          return { error: `${field.label} contains unsupported options: ${invalid.join(', ')}` };
        }
      }
      return { value: Array.from(new Set(arr)) };
    }

    case 'url': {
      const str = String(raw).trim();
      try {
        const parsed = new URL(str);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return { error: `${field.label} must start with http:// or https://` };
        }
        return { value: parsed.toString() };
      } catch {
        return { error: `${field.label} must be a valid URL` };
      }
    }

    case 'email': {
      const str = String(raw).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        return { error: `${field.label} must be a valid email address` };
      }
      return { value: str };
    }

    case 'attachments':
      return { value: Array.isArray(raw) ? raw : [raw] };

    case 'formula':
      return { value: raw };
  }
}
