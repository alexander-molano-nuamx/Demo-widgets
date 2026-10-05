/**
 * Safe arithmetic expression language for calculated columns and synthetic instruments (WL-13).
 * User input is parsed into an AST and evaluated by hand — never passed to eval/Function.
 *
 *   last - previousClose
 *   (askPrice - bidPrice) / last * 100
 *   [ECOPETROL].last - [ISA].last          ← reference to another instrument
 *   abs(changePercent), min(a, b), max(a, b)
 */

export const FORMULA_FIELDS = [
  "last",
  "bidPrice",
  "askPrice",
  "bidQty",
  "askQty",
  "open",
  "high",
  "low",
  "previousClose",
  "volume",
  "amount",
  "spread",
  "referencePrice",
  "netChange",
  "changePercent",
] as const;

export type FormulaField = (typeof FORMULA_FIELDS)[number];
const fieldSet = new Set<string>(FORMULA_FIELDS);
const functions = { abs: 1, min: 2, max: 2 } as const;
type FunctionName = keyof typeof functions;

export type FormulaNode =
  | { type: "num"; value: number }
  | { type: "field"; name: FormulaField }
  | { type: "ref"; orderbook: string; name: FormulaField }
  | { type: "neg"; arg: FormulaNode }
  | { type: "bin"; op: "+" | "-" | "*" | "/"; left: FormulaNode; right: FormulaNode }
  | { type: "call"; fn: FunctionName; args: FormulaNode[] };

export type ParseResult =
  | { ok: true; ast: FormulaNode; references: string[] }
  | { ok: false; error: string };

type Token =
  | { kind: "num"; value: number; pos: number }
  | { kind: "ident"; value: string; pos: number }
  | { kind: "ref"; value: string; pos: number }
  | { kind: "op"; value: string; pos: number };

const MAX_LENGTH = 240;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
    } else if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const match = /^\d*\.?\d+/.exec(src.slice(i));
      if (!match) throw new Error(`Número inválido en la posición ${i + 1}`);
      tokens.push({ kind: "num", value: Number(match[0]), pos: i });
      i += match[0].length;
    } else if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      tokens.push({ kind: "ident", value: match[0], pos: i });
      i += match[0].length;
    } else if (ch === "[") {
      const end = src.indexOf("]", i);
      if (end === -1) throw new Error(`Falta "]" para la referencia de la posición ${i + 1}`);
      const orderbook = src.slice(i + 1, end).trim().toUpperCase();
      if (!/^[A-Z0-9\-_.]{1,24}$/.test(orderbook)) throw new Error(`Nemotécnico inválido: "${orderbook}"`);
      tokens.push({ kind: "ref", value: orderbook, pos: i });
      i = end + 1;
    } else if ("+-*/(),.".includes(ch)) {
      tokens.push({ kind: "op", value: ch, pos: i });
      i += 1;
    } else {
      throw new Error(`Carácter no permitido "${ch}" en la posición ${i + 1}`);
    }
  }
  return tokens;
}

class Parser {
  private index = 0;
  readonly references = new Set<string>();

  constructor(private readonly tokens: Token[]) {}

  parse(): FormulaNode {
    if (this.tokens.length === 0) throw new Error("La fórmula está vacía");
    const node = this.expression();
    const extra = this.peek();
    if (extra) throw new Error(`Símbolo inesperado en la posición ${extra.pos + 1}`);
    return node;
  }

  private peek() {
    return this.tokens[this.index];
  }

  private next() {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private expectOp(value: string) {
    const token = this.next();
    if (!token || token.kind !== "op" || token.value !== value) {
      throw new Error(`Se esperaba "${value}"${token ? ` en la posición ${token.pos + 1}` : " al final"}`);
    }
  }

  private isOp(value: string) {
    const token = this.peek();
    return token?.kind === "op" && token.value === value;
  }

  private expression(): FormulaNode {
    let left = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.next().value as "+" | "-";
      left = { type: "bin", op, left, right: this.term() };
    }
    return left;
  }

  private term(): FormulaNode {
    let left = this.unary();
    while (this.isOp("*") || this.isOp("/")) {
      const op = this.next().value as "*" | "/";
      left = { type: "bin", op, left, right: this.unary() };
    }
    return left;
  }

  private unary(): FormulaNode {
    if (this.isOp("-")) {
      this.next();
      return { type: "neg", arg: this.unary() };
    }
    return this.primary();
  }

  private fieldName(): FormulaField {
    const token = this.next();
    if (!token || token.kind !== "ident" || !fieldSet.has(token.value)) {
      throw new Error(`Campo desconocido${token ? ` "${String(token.value)}"` : ""}. Campos válidos: ${FORMULA_FIELDS.join(", ")}`);
    }
    return token.value as FormulaField;
  }

  private primary(): FormulaNode {
    const token = this.peek();
    if (!token) throw new Error("La fórmula termina de forma incompleta");
    if (token.kind === "num") {
      this.next();
      return { type: "num", value: token.value };
    }
    if (token.kind === "ref") {
      this.next();
      this.expectOp(".");
      this.references.add(token.value);
      return { type: "ref", orderbook: token.value, name: this.fieldName() };
    }
    if (token.kind === "ident") {
      if (token.value in functions && this.tokens[this.index + 1]?.value === "(") {
        this.next();
        const fn = token.value as FunctionName;
        this.expectOp("(");
        const args = [this.expression()];
        while (this.isOp(",")) {
          this.next();
          args.push(this.expression());
        }
        this.expectOp(")");
        if (args.length !== functions[fn]) throw new Error(`${fn}() requiere ${functions[fn]} argumento(s)`);
        return { type: "call", fn, args };
      }
      return { type: "field", name: this.fieldName() };
    }
    if (this.isOp("(")) {
      this.next();
      const inner = this.expression();
      this.expectOp(")");
      return inner;
    }
    throw new Error(`Símbolo inesperado "${token.value}" en la posición ${token.pos + 1}`);
  }
}

export function parseFormula(src: string): ParseResult {
  if (src.length > MAX_LENGTH) return { ok: false, error: `Máximo ${MAX_LENGTH} caracteres` };
  try {
    const parser = new Parser(tokenize(src));
    const ast = parser.parse();
    return { ok: true, ast, references: Array.from(parser.references) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Fórmula inválida" };
  }
}

export type FieldSource = Partial<Record<FormulaField, number | null>>;

/** Returns null when any operand is missing or on division by zero. */
export function evaluateFormula(
  node: FormulaNode,
  row: FieldSource,
  resolve: (orderbook: string) => FieldSource | undefined,
): number | null {
  switch (node.type) {
    case "num":
      return node.value;
    case "field":
      return row[node.name] ?? null;
    case "ref":
      return resolve(node.orderbook)?.[node.name] ?? null;
    case "neg": {
      const value = evaluateFormula(node.arg, row, resolve);
      return value == null ? null : -value;
    }
    case "call": {
      const args = node.args.map((arg) => evaluateFormula(arg, row, resolve));
      if (args.some((a) => a == null)) return null;
      const values = args as number[];
      if (node.fn === "abs") return Math.abs(values[0]);
      return node.fn === "min" ? Math.min(values[0], values[1]) : Math.max(values[0], values[1]);
    }
    case "bin": {
      const left = evaluateFormula(node.left, row, resolve);
      const right = evaluateFormula(node.right, row, resolve);
      if (left == null || right == null) return null;
      if (node.op === "+") return left + right;
      if (node.op === "-") return left - right;
      if (node.op === "*") return left * right;
      return right === 0 ? null : left / right;
    }
  }
}
