/**
 * Safe Expression Evaluator
 *
 * A secure replacement for expr-eval that only allows simple arithmetic and comparison operations.
 * This implementation prevents:
 * - Prototype pollution
 * - Code injection
 * - Function execution
 * - Property chain access (only simple variable lookups)
 *
 * Supported operations:
 * - Comparison: <, >, <=, >=, ==, ===, !=, !==
 * - Logical: &&, ||, !
 * - Arithmetic: +, -, *, /, %
 * - Parentheses for grouping
 * - Simple variable references
 * - Numeric and boolean literals
 */

// Token types for the lexer
type TokenType =
  | 'NUMBER'
  | 'BOOLEAN'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean;
}

// AST node types
type ASTNode =
  | NumberNode
  | BooleanNode
  | IdentifierNode
  | BinaryOpNode
  | UnaryOpNode;

interface NumberNode {
  type: 'number';
  value: number;
}

interface BooleanNode {
  type: 'boolean';
  value: boolean;
}

interface IdentifierNode {
  type: 'identifier';
  name: string;
}

interface BinaryOpNode {
  type: 'binary';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

interface UnaryOpNode {
  type: 'unary';
  operator: string;
  operand: ASTNode;
}

// Allowed operators with their precedence (lower = binds tighter)
const OPERATOR_PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '===': 3,
  '!=': 3,
  '!==': 3,
  '<': 4,
  '>': 4,
  '<=': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

// Allowed identifiers for security (blocklist dangerous names)
const BLOCKED_IDENTIFIERS = new Set([
  '__proto__',
  'prototype',
  'constructor',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'eval',
  'Function',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'Proxy',
  'Reflect',
  'globalThis',
  'window',
  'global',
  'process',
  'require',
  'module',
  'exports',
  'import',
]);

/**
 * Lexer - tokenizes the input expression
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    // Skip whitespace
    if (/\s/.test(expression[i] ?? '')) {
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(expression[i] ?? '')) {
      let numStr = '';
      while (i < expression.length && /[\d.]/.test(expression[i] ?? '')) {
        numStr += expression[i];
        i++;
      }
      const num = parseFloat(numStr);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${numStr}`);
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(expression[i] ?? '')) {
      let id = '';
      while (
        i < expression.length &&
        /[a-zA-Z0-9_]/.test(expression[i] ?? '')
      ) {
        id += expression[i];
        i++;
      }

      // Check for blocked identifiers
      if (BLOCKED_IDENTIFIERS.has(id)) {
        throw new Error(`Blocked identifier: ${id}`);
      }

      // Check for boolean literals
      if (id === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true });
      } else if (id === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: id });
      }
      continue;
    }

    // Multi-character operators
    const twoChar = expression.slice(i, i + 2);
    const threeChar = expression.slice(i, i + 3);

    if (threeChar === '===' || threeChar === '!==') {
      tokens.push({ type: 'OPERATOR', value: threeChar });
      i += 3;
      continue;
    }

    if (
      twoChar === '==' ||
      twoChar === '!=' ||
      twoChar === '<=' ||
      twoChar === '>=' ||
      twoChar === '&&' ||
      twoChar === '||'
    ) {
      tokens.push({ type: 'OPERATOR', value: twoChar });
      i += 2;
      continue;
    }

    // Single-character operators
    const char = expression[i] ?? '';
    if ('+-*/%<>!'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

/**
 * Parser - builds an AST from tokens using recursive descent
 */
class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '' };
  }

  private consume(): Token {
    return this.tokens[this.pos++] ?? { type: 'EOF', value: '' };
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}`);
    }
    return this.consume();
  }

  parse(): ASTNode {
    const node = this.parseExpression(0);
    if (this.current().type !== 'EOF') {
      throw new Error('Unexpected tokens after expression');
    }
    return node;
  }

  private parseExpression(minPrecedence: number): ASTNode {
    let left = this.parseUnary();

    while (true) {
      const token = this.current();
      if (token.type !== 'OPERATOR') break;

      const precedence = OPERATOR_PRECEDENCE[token.value as string];
      if (precedence === undefined || precedence < minPrecedence) break;

      this.consume();
      const right = this.parseExpression(precedence + 1);
      left = {
        type: 'binary',
        operator: token.value as string,
        left,
        right,
      };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    const token = this.current();
    if (
      token.type === 'OPERATOR' &&
      (token.value === '!' || token.value === '-')
    ) {
      this.consume();
      const operand = this.parseUnary();
      return {
        type: 'unary',
        operator: token.value as string,
        operand,
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    switch (token.type) {
      case 'NUMBER':
        this.consume();
        return { type: 'number', value: token.value as number };

      case 'BOOLEAN':
        this.consume();
        return { type: 'boolean', value: token.value as boolean };

      case 'IDENTIFIER':
        this.consume();
        return { type: 'identifier', name: token.value as string };

      case 'LPAREN': {
        this.consume();
        const node = this.parseExpression(0);
        this.expect('RPAREN');
        return node;
      }

      default:
        throw new Error(`Unexpected token: ${token.type}`);
    }
  }
}

/**
 * Evaluator - evaluates the AST with given variables
 */
function evaluateAST(
  node: ASTNode,
  variables: Record<string, unknown>
): unknown {
  switch (node.type) {
    case 'number':
      return node.value;

    case 'boolean':
      return node.value;

    case 'identifier': {
      // Only allow direct property access, no chaining
      if (!Object.prototype.hasOwnProperty.call(variables, node.name)) {
        throw new Error(`Undefined variable: ${node.name}`);
      }
      return variables[node.name];
    }

    case 'unary': {
      const operand = evaluateAST(node.operand, variables);
      switch (node.operator) {
        case '!':
          return !operand;
        case '-':
          return -(operand as number);
        default:
          throw new Error(`Unknown unary operator: ${node.operator}`);
      }
    }

    case 'binary': {
      const left = evaluateAST(node.left, variables);
      const right = evaluateAST(node.right, variables);

      switch (node.operator) {
        case '+':
          return (left as number) + (right as number);
        case '-':
          return (left as number) - (right as number);
        case '*':
          return (left as number) * (right as number);
        case '/':
          return (left as number) / (right as number);
        case '%':
          return (left as number) % (right as number);
        case '<':
          return (left as number) < (right as number);
        case '>':
          return (left as number) > (right as number);
        case '<=':
          return (left as number) <= (right as number);
        case '>=':
          return (left as number) >= (right as number);
        case '==':
          return left == right;
        case '===':
          return left === right;
        case '!=':
          return left != right;
        case '!==':
          return left !== right;
        case '&&':
          return Boolean(left) && Boolean(right);
        case '||':
          return Boolean(left) || Boolean(right);
        default:
          throw new Error(`Unknown binary operator: ${node.operator}`);
      }
    }

    default:
      throw new Error(`Unknown node type: ${(node as ASTNode).type}`);
  }
}

/**
 * SafeExpressionEvaluator class - main interface
 *
 * Usage:
 *   const evaluator = new SafeExpressionEvaluator();
 *   const result = evaluator.evaluate('x < 10 && y > 5', { x: 5, y: 10 });
 */
export class SafeExpressionEvaluator {
  /**
   * Evaluate a simple expression with the given variables
   * @param expression - The expression string to evaluate
   * @param variables - An object containing variable values
   * @returns The result of evaluating the expression
   * @throws Error if the expression is invalid or uses blocked identifiers
   */
  evaluate(expression: string, variables: Record<string, unknown>): unknown {
    // Validate expression length (prevent DoS)
    if (expression.length > 1000) {
      throw new Error('Expression too long');
    }

    // Tokenize
    const tokens = tokenize(expression);

    // Parse
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Evaluate
    return evaluateAST(ast, variables);
  }

  /**
   * Parse an expression and return a function that can be called with variables
   * @param expression - The expression string to parse
   * @returns A function that takes variables and returns the result
   */
  parse(expression: string): (variables: Record<string, unknown>) => unknown {
    // Validate expression length (prevent DoS)
    if (expression.length > 1000) {
      throw new Error('Expression too long');
    }

    // Tokenize and parse once
    const tokens = tokenize(expression);
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Return a function that evaluates with given variables
    return (variables: Record<string, unknown>) => evaluateAST(ast, variables);
  }
}

// Export a singleton instance for convenience
export const safeEvaluator = new SafeExpressionEvaluator();
