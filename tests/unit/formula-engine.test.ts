import { describe, expect, it } from 'vitest';
import {
  evaluateAst,
  evaluateFormulaSet,
  FormulaError,
  parseFormula,
  validateFormula,
} from '@/engine/formula-engine/evaluator';

describe('Formula Engine (AST Parser & Evaluator)', () => {
  it('evaluates arithmetic precedence, parentheses, and percentages accurately', () => {
    const ast = parseFormula('(reading + listening + writing + speaking) / 4');
    const band = evaluateAst(ast, {
      reading: 8.5,
      listening: 8.0,
      writing: 7.0,
      speaking: 7.5,
    });
    expect(band).toBe(7.75);
  });

  it('evaluates allowlisted math functions and conditionals', () => {
    const out = evaluateFormulaSet(
      [
        { key: 'total_cost', expression: 'price * qty', precision: 2, monetary: true },
        {
          key: 'discount',
          expression: 'total_cost >= 100 ? round(total_cost * 0.1, 2) : 0',
          precision: 2,
          monetary: true,
        },
        { key: 'net_total', expression: 'total_cost - discount', precision: 2, monetary: true },
      ],
      { price: 49.99, qty: 3 },
    );

    expect(out.total_cost).toBe(149.97);
    expect(out.discount).toBe(15);
    expect(out.net_total).toBe(134.97);
  });

  it('rejects malicious or disallowed identifiers and function calls', () => {
    expect(() => parseFormula('window.alert(1)')).toThrow(FormulaError);
    expect(() => parseFormula('__proto__ + 1')).toThrow(FormulaError);
    expect(() => parseFormula('eval("1+1")')).toThrow(FormulaError);
    expect(() => validateFormula('unknown_var * 2', new Set(['a']))).toThrow(FormulaError);
  });

  it('detects circular dependencies across formula outputs', () => {
    expect(() =>
      evaluateFormulaSet(
        [
          { key: 'a', expression: 'b + 1' },
          { key: 'b', expression: 'a + 1' },
        ],
        { x: 1 },
      ),
    ).toThrow(/Circular dependency/i);
  });

  it('rejects division by zero and non-finite outcomes', () => {
    const ast = parseFormula('amount / divisor');
    expect(() => evaluateAst(ast, { amount: 100, divisor: 0 })).toThrow(FormulaError);
    const sqrtAst = parseFormula('sqrt(-4)');
    expect(() => evaluateAst(sqrtAst, {})).toThrow(FormulaError);
  });
});
