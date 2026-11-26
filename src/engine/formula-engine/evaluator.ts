/**
 * Secure, deterministic AST-based formula lexer, parser, dependency analyzer, and evaluator.
 * Never executes eval(), new Function(), or dynamic code.
 */

export type FormulaValue = number | boolean;

export type AstNode =
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'identifier'; name: string }
  | { type: 'unary'; operator: '+' | '-' | '!'; argument: AstNode }
  | {
      type: 'binary';
      operator:
        | '+'
        | '-'
        | '*'
        | '/'
        | '%'
        | '^'
        | '=='
        | '!='
        | '<'
        | '<='
        | '>'
        | '>='
        | '&&'
        | '||';
      left: AstNode;
      right: AstNode;
    }
  | { type: 'conditional'; test: AstNode; consequent: AstNode; alternate: AstNode }
  | { type: 'call'; callee: string; args: AstNode[] };

export class FormulaError extends Error {
  readonly code:
    | 'SYNTAX_ERROR'
    | 'UNKNOWN_IDENTIFIER'
    | 'FORBIDDEN_FUNCTION'
    | 'COMPLEXITY_LIMIT'
    | 'CIRCULAR_DEPENDENCY'
    | 'DIVISION_BY_ZERO'
    | 'NON_FINITE'
    | 'TYPE_ERROR';

  constructor(code: FormulaError['code'], message: string) {
    super(message);
    this.name = 'FormulaError';
    this.code = code;
  }
}

interface Token {
  type:
    | 'number'
    | 'identifier'
    | 'operator'
    | 'lparen'
    | 'rparen'
    | 'comma'
    | 'question'
    | 'colon'
    | 'eof';
  value: string;
  position: number;
}

const MAX_EXPRESSION_LENGTH = 500;
const MAX_AST_NODES = 128;
const MAX_AST_DEPTH = 24;

const FORBIDDEN_IDENTIFIERS = new Set([
  'constructor',
  '__proto__',
  'prototype',
  'window',
  'globalThis',
  'process',
  'eval',
  'Function',
  'require',
  'import',
]);

type MathFnSpec = {
  minArgs: number;
  maxArgs: number;
  fn: (args: number[]) => number;
};

const ALLOWED_FUNCTIONS: Record<string, MathFnSpec> = {
  abs: { minArgs: 1, maxArgs: 1, fn: ([a]) => Math.abs(a!) },
  round: {
    minArgs: 1,
    maxArgs: 2,
    fn: ([a, d = 0]) => {
      const digits = Math.max(0, Math.min(8, Math.trunc(d)));
      const factor = 10 ** digits;
      return Math.round((a! + Number.EPSILON) * factor) / factor;
    },
  },
  floor: { minArgs: 1, maxArgs: 1, fn: ([a]) => Math.floor(a!) },
  ceil: { minArgs: 1, maxArgs: 1, fn: ([a]) => Math.ceil(a!) },
  min: { minArgs: 1, maxArgs: 32, fn: (args) => Math.min(...args) },
  max: { minArgs: 1, maxArgs: 32, fn: (args) => Math.max(...args) },
  sum: {
    minArgs: 1,
    maxArgs: 32,
    fn: (args) => args.reduce((acc, val) => acc + val, 0),
  },
  avg: {
    minArgs: 1,
    maxArgs: 32,
    fn: (args) => args.reduce((acc, val) => acc + val, 0) / args.length,
  },
  sqrt: {
    minArgs: 1,
    maxArgs: 1,
    fn: ([a]) => {
      if (a! < 0) throw new FormulaError('NON_FINITE', 'Cannot take square root of negative number');
      return Math.sqrt(a!);
    },
  },
  pow: { minArgs: 2, maxArgs: 2, fn: ([a, b]) => Math.pow(a!, b!) },
  log: {
    minArgs: 1,
    maxArgs: 1,
    fn: ([a]) => {
      if (a! <= 0) throw new FormulaError('NON_FINITE', 'Logarithm input must be positive');
      return Math.log(a!);
    },
  },
  log10: {
    minArgs: 1,
    maxArgs: 1,
    fn: ([a]) => {
      if (a! <= 0) throw new FormulaError('NON_FINITE', 'Logarithm input must be positive');
      return Math.log10(a!);
    },
  },
  clamp: {
    minArgs: 3,
    maxArgs: 3,
    fn: ([val, minVal, maxVal]) => Math.min(Math.max(val!, minVal!), maxVal!),
  },
  pct: {
    minArgs: 2,
    maxArgs: 2,
    fn: ([part, whole]) => {
      if (whole === 0) throw new FormulaError('DIVISION_BY_ZERO', 'Percentage denominator cannot be zero');
      return (part! / whole!) * 100;
    },
  },
  if: {
    minArgs: 3,
    maxArgs: 3,
    fn: ([cond, whenTrue, whenFalse]) => (cond !== 0 ? whenTrue! : whenFalse!),
  },
};

export function tokenizeFormula(expression: string): Token[] {
  if (typeof expression !== 'string') {
    throw new FormulaError('SYNTAX_ERROR', 'Formula must be a string');
  }
  const input = expression.trim();
  if (!input) {
    throw new FormulaError('SYNTAX_ERROR', 'Formula cannot be empty');
  }
  if (input.length > MAX_EXPRESSION_LENGTH) {
    throw new FormulaError(
      'COMPLEXITY_LIMIT',
      `Formula exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters`,
    );
  }

  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      const start = i;
      let sawDot = ch === '.';
      i += 1;
      while (i < input.length && /[0-9.]/.test(input[i]!)) {
        if (input[i] === '.') {
          if (sawDot) {
            throw new FormulaError('SYNTAX_ERROR', `Invalid numeric literal at position ${i}`);
          }
          sawDot = true;
        }
        i += 1;
      }
      const raw = input.slice(start, i);
      if (raw === '.') {
        throw new FormulaError('SYNTAX_ERROR', `Unexpected '.' at position ${start}`);
      }
      tokens.push({ type: 'number', value: raw, position: start });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i]!)) {
        i += 1;
      }
      const ident = input.slice(start, i);
      if (FORBIDDEN_IDENTIFIERS.has(ident)) {
        throw new FormulaError('FORBIDDEN_FUNCTION', `Identifier "${ident}" is not permitted`);
      }
      tokens.push({ type: 'identifier', value: ident, position: start });
      continue;
    }

    const twoChar = input.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar, position: i });
      i += 2;
      continue;
    }

    if (['+', '-', '*', '/', '%', '^', '<', '>', '!'].includes(ch)) {
      tokens.push({ type: 'operator', value: ch, position: i });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch, position: i });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch, position: i });
      i += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch, position: i });
      i += 1;
      continue;
    }
    if (ch === '?') {
      tokens.push({ type: 'question', value: ch, position: i });
      i += 1;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'colon', value: ch, position: i });
      i += 1;
      continue;
    }

    throw new FormulaError('SYNTAX_ERROR', `Unsupported character "${ch}" at position ${i}`);
  }

  tokens.push({ type: 'eof', value: '', position: input.length });
  return tokens;
}

class FormulaParser {
  private readonly tokens: Token[];
  private cursor = 0;
  private nodeCount = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.cursor] ?? { type: 'eof', value: '', position: -1 };
  }

  private consume(): Token {
    const token = this.peek();
    this.cursor += 1;
    return token;
  }

  private trackNode<T extends AstNode>(node: T): T {
    this.nodeCount += 1;
    if (this.nodeCount > MAX_AST_NODES) {
      throw new FormulaError('COMPLEXITY_LIMIT', 'Formula exceeds AST node complexity limit');
    }
    return node;
  }

  parse(depth: number = 0): AstNode {
    const ast = this.parseConditional(depth);
    if (this.peek().type !== 'eof') {
      throw new FormulaError(
        'SYNTAX_ERROR',
        `Unexpected token "${this.peek().value}" at position ${this.peek().position}`,
      );
    }
    return ast;
  }

  private checkDepth(depth: number) {
    if (depth > MAX_AST_DEPTH) {
      throw new FormulaError('COMPLEXITY_LIMIT', 'Formula nesting depth exceeds maximum limit');
    }
  }

  private parseConditional(depth: number): AstNode {
    this.checkDepth(depth);
    const expr = this.parseLogicalOr(depth + 1);
    if (this.peek().type === 'question') {
      this.consume();
      const consequent = this.parseConditional(depth + 1);
      if (this.peek().type !== 'colon') {
        throw new FormulaError('SYNTAX_ERROR', 'Expected ":" in conditional expression');
      }
      this.consume();
      const alternate = this.parseConditional(depth + 1);
      return this.trackNode({ type: 'conditional', test: expr, consequent, alternate });
    }
    return expr;
  }

  private parseLogicalOr(depth: number): AstNode {
    let left = this.parseLogicalAnd(depth + 1);
    while (this.peek().type === 'operator' && this.peek().value === '||') {
      this.consume();
      const right = this.parseLogicalAnd(depth + 1);
      left = this.trackNode({ type: 'binary', operator: '||', left, right });
    }
    return left;
  }

  private parseLogicalAnd(depth: number): AstNode {
    let left = this.parseEquality(depth + 1);
    while (this.peek().type === 'operator' && this.peek().value === '&&') {
      this.consume();
      const right = this.parseEquality(depth + 1);
      left = this.trackNode({ type: 'binary', operator: '&&', left, right });
    }
    return left;
  }

  private parseEquality(depth: number): AstNode {
    let left = this.parseComparison(depth + 1);
    while (
      this.peek().type === 'operator' &&
      (this.peek().value === '==' || this.peek().value === '!=')
    ) {
      const op = this.consume().value as '==' | '!=';
      const right = this.parseComparison(depth + 1);
      left = this.trackNode({ type: 'binary', operator: op, left, right });
    }
    return left;
  }

  private parseComparison(depth: number): AstNode {
    let left = this.parseAdditive(depth + 1);
    while (
      this.peek().type === 'operator' &&
      ['<', '<=', '>', '>='].includes(this.peek().value)
    ) {
      const op = this.consume().value as '<' | '<=' | '>' | '>=';
      const right = this.parseAdditive(depth + 1);
      left = this.trackNode({ type: 'binary', operator: op, left, right });
    }
    return left;
  }

  private parseAdditive(depth: number): AstNode {
    let left = this.parseMultiplicative(depth + 1);
    while (this.peek().type === 'operator' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value as '+' | '-';
      const right = this.parseMultiplicative(depth + 1);
      left = this.trackNode({ type: 'binary', operator: op, left, right });
    }
    return left;
  }

  private parseMultiplicative(depth: number): AstNode {
    let left = this.parsePower(depth + 1);
    while (
      this.peek().type === 'operator' &&
      ['*', '/', '%'].includes(this.peek().value)
    ) {
      const op = this.consume().value as '*' | '/' | '%';
      const right = this.parsePower(depth + 1);
      left = this.trackNode({ type: 'binary', operator: op, left, right });
    }
    return left;
  }

  private parsePower(depth: number): AstNode {
    const left = this.parseUnary(depth + 1);
    if (this.peek().type === 'operator' && this.peek().value === '^') {
      this.consume();
      const right = this.parsePower(depth + 1);
      return this.trackNode({ type: 'binary', operator: '^', left, right });
    }
    return left;
  }

  private parseUnary(depth: number): AstNode {
    this.checkDepth(depth);
    if (
      this.peek().type === 'operator' &&
      ['+', '-', '!'].includes(this.peek().value)
    ) {
      const op = this.consume().value as '+' | '-' | '!';
      const argument = this.parseUnary(depth + 1);
      return this.trackNode({ type: 'unary', operator: op, argument });
    }
    return this.parsePrimary(depth + 1);
  }

  private parsePrimary(depth: number): AstNode {
    this.checkDepth(depth);
    const token = this.peek();

    if (token.type === 'number') {
      this.consume();
      const value = Number(token.value);
      if (!Number.isFinite(value)) {
        throw new FormulaError('NON_FINITE', `Invalid numeric literal "${token.value}"`);
      }
      return this.trackNode({ type: 'number', value });
    }

    if (token.type === 'identifier') {
      this.consume();
      if (token.value === 'true') return this.trackNode({ type: 'boolean', value: true });
      if (token.value === 'false') return this.trackNode({ type: 'boolean', value: false });

      if (this.peek().type === 'lparen') {
        const fnName = token.value.toLowerCase();
        const spec = ALLOWED_FUNCTIONS[fnName];
        if (!spec) {
          throw new FormulaError(
            'FORBIDDEN_FUNCTION',
            `Function "${token.value}" is not in the allowed math allowlist`,
          );
        }
        this.consume(); // (
        const args: AstNode[] = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseConditional(depth + 1));
          while (this.peek().type === 'comma') {
            this.consume();
            args.push(this.parseConditional(depth + 1));
          }
        }
        if (this.peek().type !== 'rparen') {
          throw new FormulaError('SYNTAX_ERROR', `Expected ")" after arguments to ${fnName}()`);
        }
        this.consume();
        if (args.length < spec.minArgs || args.length > spec.maxArgs) {
          throw new FormulaError(
            'SYNTAX_ERROR',
            `Function ${fnName}() expects ${spec.minArgs}-${spec.maxArgs} arguments, received ${args.length}`,
          );
        }
        return this.trackNode({ type: 'call', callee: fnName, args });
      }

      return this.trackNode({ type: 'identifier', name: token.value });
    }

    if (token.type === 'lparen') {
      this.consume();
      const expr = this.parseConditional(depth + 1);
      if (this.peek().type !== 'rparen') {
        throw new FormulaError('SYNTAX_ERROR', 'Missing closing parenthesis ")"');
      }
      this.consume();
      return expr;
    }

    throw new FormulaError(
      'SYNTAX_ERROR',
      `Unexpected token "${token.value || 'EOF'}" at position ${token.position}`,
    );
  }
}

export function parseFormula(expression: string): AstNode {
  const tokens = tokenizeFormula(expression);
  return new FormulaParser(tokens).parse(0);
}

export function extractDependencies(ast: AstNode): string[] {
  const deps = new Set<string>();
  const walk = (node: AstNode) => {
    switch (node.type) {
      case 'identifier':
        deps.add(node.name);
        break;
      case 'unary':
        walk(node.argument);
        break;
      case 'binary':
        walk(node.left);
        walk(node.right);
        break;
      case 'conditional':
        walk(node.test);
        walk(node.consequent);
        walk(node.alternate);
        break;
      case 'call':
        node.args.forEach(walk);
        break;
      default:
        break;
    }
  };
  walk(ast);
  return Array.from(deps);
}

export function validateFormula(
  expression: string,
  allowedIdentifiers: Set<string>,
): { ast: AstNode; dependencies: string[] } {
  const ast = parseFormula(expression);
  const dependencies = extractDependencies(ast);
  for (const dep of dependencies) {
    if (!allowedIdentifiers.has(dep)) {
      throw new FormulaError(
        'UNKNOWN_IDENTIFIER',
        `Unknown field or variable "${dep}" referenced in formula`,
      );
    }
  }
  return { ast, dependencies };
}

function toNumeric(value: FormulaValue): number {
  return typeof value === 'boolean' ? (value ? 1 : 0) : value;
}

function toBoolean(value: FormulaValue): boolean {
  return typeof value === 'boolean' ? value : value !== 0;
}

export function evaluateAst(
  node: AstNode,
  variables: Record<string, FormulaValue>,
): number {
  const evalNode = (n: AstNode): FormulaValue => {
    switch (n.type) {
      case 'number':
        return n.value;
      case 'boolean':
        return n.value;
      case 'identifier': {
        if (!Object.prototype.hasOwnProperty.call(variables, n.name)) {
          throw new FormulaError('UNKNOWN_IDENTIFIER', `Missing value for field "${n.name}"`);
        }
        const raw = variables[n.name]!;
        if (typeof raw === 'number' && !Number.isFinite(raw)) {
          throw new FormulaError('NON_FINITE', `Variable "${n.name}" is not finite`);
        }
        return raw;
      }
      case 'unary': {
        const arg = evalNode(n.argument);
        if (n.operator === '!') return !toBoolean(arg);
        const num = toNumeric(arg);
        return n.operator === '-' ? -num : num;
      }
      case 'conditional': {
        return toBoolean(evalNode(n.test))
          ? evalNode(n.consequent)
          : evalNode(n.alternate);
      }
      case 'call': {
        const spec = ALLOWED_FUNCTIONS[n.callee];
        if (!spec) {
          throw new FormulaError('FORBIDDEN_FUNCTION', `Disallowed function "${n.callee}"`);
        }
        const args = n.args.map((arg) => toNumeric(evalNode(arg)));
        const out = spec.fn(args);
        if (!Number.isFinite(out)) {
          throw new FormulaError('NON_FINITE', `Result of ${n.callee}() is not finite`);
        }
        return out;
      }
      case 'binary': {
        if (n.operator === '&&') {
          return toBoolean(evalNode(n.left)) && toBoolean(evalNode(n.right));
        }
        if (n.operator === '||') {
          return toBoolean(evalNode(n.left)) || toBoolean(evalNode(n.right));
        }
        const l = toNumeric(evalNode(n.left));
        const r = toNumeric(evalNode(n.right));
        switch (n.operator) {
          case '+':
            return l + r;
          case '-':
            return l - r;
          case '*':
            return l * r;
          case '/':
            if (r === 0) throw new FormulaError('DIVISION_BY_ZERO', 'Division by zero');
            return l / r;
          case '%':
            if (r === 0) throw new FormulaError('DIVISION_BY_ZERO', 'Modulo by zero');
            return l % r;
          case '^':
            return Math.pow(l, r);
          case '==':
            return l === r;
          case '!=':
            return l !== r;
          case '<':
            return l < r;
          case '<=':
            return l <= r;
          case '>':
            return l > r;
          case '>=':
            return l >= r;
        }
      }
    }
  };

  const rawResult = toNumeric(evalNode(node));
  if (!Number.isFinite(rawResult)) {
    throw new FormulaError('NON_FINITE', 'Calculated result is not finite (NaN or Infinity)');
  }
  return rawResult;
}

export interface FormulaDefinition {
  key: string;
  expression: string;
  precision?: number;
  monetary?: boolean;
}

/**
 * Evaluates a set of possibly interdependent output formulas in topological order,
 * rejecting circular dependencies and rounding accurately.
 */
export function evaluateFormulaSet(
  formulas: FormulaDefinition[],
  inputs: Record<string, number>,
): Record<string, number> {
  const inputKeys = new Set(Object.keys(inputs));
  const formulaMap = new Map<string, FormulaDefinition>();
  for (const f of formulas) {
    if (inputKeys.has(f.key)) {
      throw new FormulaError(
        'SYNTAX_ERROR',
        `Output key "${f.key}" conflicts with an input field key`,
      );
    }
    if (formulaMap.has(f.key)) {
      throw new FormulaError('SYNTAX_ERROR', `Duplicate output key "${f.key}"`);
    }
    formulaMap.set(f.key, f);
  }

  const allowedIds = new Set([...inputKeys, ...formulaMap.keys()]);
  const parsed = new Map<string, { ast: AstNode; dependencies: string[]; def: FormulaDefinition }>();

  for (const f of formulas) {
    const { ast, dependencies } = validateFormula(f.expression, allowedIds);
    parsed.set(f.key, { ast, dependencies, def: f });
  }

  // Topological sort (Kahn / DFS cycle detection)
  const state = new Map<string, 'visiting' | 'visited'>();
  const ordered: string[] = [];

  const visit = (key: string) => {
    const current = state.get(key);
    if (current === 'visiting') {
      throw new FormulaError(
        'CIRCULAR_DEPENDENCY',
        `Circular dependency detected involving "${key}"`,
      );
    }
    if (current === 'visited') return;
    state.set(key, 'visiting');
    const item = parsed.get(key);
    if (item) {
      for (const dep of item.dependencies) {
        if (formulaMap.has(dep)) {
          visit(dep);
        }
      }
    }
    state.set(key, 'visited');
    ordered.push(key);
  };

  for (const f of formulas) {
    visit(f.key);
  }

  const context: Record<string, FormulaValue> = { ...inputs };
  const outputs: Record<string, number> = {};

  for (const key of ordered) {
    const item = parsed.get(key)!;
    const raw = evaluateAst(item.ast, context);
    const precision = item.def.monetary
      ? item.def.precision ?? 2
      : Math.max(0, Math.min(8, item.def.precision ?? 2));
    const scale = 10 ** precision;
    const rounded = Math.round((raw + Number.EPSILON) * scale) / scale;
    context[key] = rounded;
    outputs[key] = Object.is(rounded, -0) ? 0 : rounded;
  }

  return outputs;
}
