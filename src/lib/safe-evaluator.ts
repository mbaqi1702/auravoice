/**
 * Security Patch S1: Safe AST / Recursive-Descent Expression Evaluator
 * 
 * Replaces unsafe eval() with a strictly sandboxed, recursive-descent math parser.
 * - Whitelists operators: +, -, *, /, %, ^ (power)
 * - Whitelists functions: Math.sin, Math.cos, Math.tan, Math.sqrt, Math.abs, Math.round, Math.ceil, Math.floor, Math.log, Math.min, Math.max
 * - Whitelists constants: PI, E
 * - Prevents exponent DoS (caps exponent at 1000, rejects 9**9**9)
 * - Maximum expression length: 300 characters
 * - Zero access to Object, Function, globalThis, window, process, __proto__, or prototype chains
 */

export class SafeMathEvaluator {
  private static readonly MAX_EXPR_LENGTH = 300;
  private static readonly MAX_EXPONENT = 1000;
  private static readonly MAX_VALUE = 1e15;

  private static readonly SAFE_FUNCTIONS: Record<string, (...args: number[]) => number> = {
    sqrt: Math.sqrt,
    abs: Math.abs,
    round: Math.round,
    ceil: Math.ceil,
    floor: Math.floor,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
    min: Math.min,
    max: Math.max,
  };

  private static readonly SAFE_CONSTANTS: Record<string, number> = {
    pi: Math.PI,
    e: Math.E,
  };

  public static evaluate(expression: string): { success: boolean; result?: number; error?: string } {
    try {
      if (!expression || typeof expression !== 'string') {
        return { success: false, error: 'Empty expression' };
      }

      const sanitized = expression.trim();

      if (sanitized.length > SafeMathEvaluator.MAX_EXPR_LENGTH) {
        return { success: false, error: `Expression exceeds length limit of ${SafeMathEvaluator.MAX_EXPR_LENGTH} chars` };
      }

      // Prohibit dangerous tokens
      if (/(__proto__|constructor|prototype|window|global|process|function|eval|import|require|this|var|let|const)/i.test(sanitized)) {
        return { success: false, error: 'Security violation: illegal identifier detected' };
      }

      const tokens = SafeMathEvaluator.tokenize(sanitized);
      let pos = 0;

      function peek(): string | null {
        return pos < tokens.length ? tokens[pos] : null;
      }

      function consume(expected?: string): string {
        const token = tokens[pos++];
        if (expected && token !== expected) {
          throw new Error(`Syntax error: expected '${expected}' but found '${token}'`);
        }
        return token;
      }

      // Grammar:
      // Expr := Term (('+' | '-') Term)*
      // Term := Power (('*' | '/' | '%') Power)*
      // Power := Factor ('^' Factor)*
      // Factor := Number | Identifier ('(' Expr (',' Expr)* ')')? | '(' Expr ')' | ('+' | '-') Factor

      function parseExpr(): number {
        let val = parseTerm();
        while (peek() === '+' || peek() === '-') {
          const op = consume();
          const next = parseTerm();
          val = op === '+' ? val + next : val - next;
        }
        return val;
      }

      function parseTerm(): number {
        let val = parsePower();
        while (peek() === '*' || peek() === '/' || peek() === '%') {
          const op = consume();
          const next = parsePower();
          if (op === '*') val *= next;
          else if (op === '/') {
            if (next === 0) throw new Error('Division by zero');
            val /= next;
          } else if (op === '%') {
            if (next === 0) throw new Error('Modulo by zero');
            val %= next;
          }
        }
        return val;
      }

      function parsePower(): number {
        let val = parseFactor();
        if (peek() === '^' || peek() === '**') {
          consume();
          const exp = parsePower();
          if (Math.abs(exp) > SafeMathEvaluator.MAX_EXPONENT) {
            throw new Error(`Exponent exceeds safety cap of ${SafeMathEvaluator.MAX_EXPONENT}`);
          }
          if (Math.abs(val) > 10 && exp > 50) {
            throw new Error('Exponent calculation would cause overflow DoS');
          }
          val = Math.pow(val, exp);
        }
        return val;
      }

      function parseFactor(): number {
        const token = peek();
        if (!token) throw new Error('Unexpected end of expression');

        if (token === '+') {
          consume('+');
          return parseFactor();
        }
        if (token === '-') {
          consume('-');
          return -parseFactor();
        }

        if (token === '(') {
          consume('(');
          const val = parseExpr();
          consume(')');
          return val;
        }

        // Numbers (integers or decimals)
        if (/^\d+(\.\d+)?$/.test(token)) {
          consume();
          return parseFloat(token);
        }

        // Identifiers: functions or constants
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
          const name = consume().toLowerCase();

          // Check if function call
          if (peek() === '(') {
            consume('(');
            const args: number[] = [];
            if (peek() !== ')') {
              args.push(parseExpr());
              while (peek() === ',') {
                consume(',');
                args.push(parseExpr());
              }
            }
            consume(')');

            const fn = SafeMathEvaluator.SAFE_FUNCTIONS[name];
            if (!fn) throw new Error(`Unknown function: '${name}'`);
            return fn(...args);
          }

          // Check if constant
          if (name in SafeMathEvaluator.SAFE_CONSTANTS) {
            return SafeMathEvaluator.SAFE_CONSTANTS[name];
          }

          throw new Error(`Unknown variable: '${name}'`);
        }

        throw new Error(`Unexpected token: '${token}'`);
      }

      const result = parseExpr();
      if (pos < tokens.length) {
        throw new Error(`Unexpected token at position ${pos}: '${tokens[pos]}'`);
      }

      if (!Number.isFinite(result) || Number.isNaN(result)) {
        throw new Error('Calculation resulted in NaN or Infinity');
      }

      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Evaluation error' };
    }
  }

  private static tokenize(str: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Check double-star power operator **
      if (ch === '*' && str[i + 1] === '*') {
        tokens.push('^');
        i += 2;
        continue;
      }

      // Single char operators
      if ('+-*/%^(),'.includes(ch)) {
        tokens.push(ch);
        i++;
        continue;
      }

      // Numbers
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(str[i + 1] || ''))) {
        let numStr = '';
        while (i < str.length && (/[\d.]/.test(str[i]))) {
          numStr += str[i++];
        }
        tokens.push(numStr);
        continue;
      }

      // Identifiers
      if (/[a-zA-Z_]/.test(ch)) {
        let idStr = '';
        while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
          idStr += str[i++];
        }
        tokens.push(idStr);
        continue;
      }

      throw new Error(`Illegal character: '${ch}'`);
    }
    return tokens;
  }
}
