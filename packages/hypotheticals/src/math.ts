/**
 * Evaluates basic arithmetic typed into a target cell: + - * / and parens,
 * standard order of operations, no exponents. Returns null on anything
 * it can't safely parse rather than guessing.
 */
export function evalMath(input: string): number | null {
  const src = input.trim();
  if (src === "") return null;
  if (!/^[0-9+\-*/().\s]+$/.test(src)) return null;

  let i = 0;

  function peek(): string | undefined {
    return src[i];
  }
  function error(): never {
    throw new Error("bad expression");
  }

  function parseExpression(): number {
    let value = parseTerm();
    while (true) {
      skipSpace();
      const op = peek();
      if (op === "+" || op === "-") {
        i++;
        const rhs = parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
      } else break;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (true) {
      skipSpace();
      const op = peek();
      if (op === "*" || op === "/") {
        i++;
        const rhs = parseFactor();
        if (op === "/") {
          if (rhs === 0) error();
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      } else break;
    }
    return value;
  }

  function parseFactor(): number {
    skipSpace();
    if (peek() === "-") {
      i++;
      return -parseFactor();
    }
    if (peek() === "+") {
      i++;
      return parseFactor();
    }
    if (peek() === "(") {
      i++;
      const value = parseExpression();
      skipSpace();
      if (peek() !== ")") error();
      i++;
      return value;
    }
    return parseNumber();
  }

  function parseNumber(): number {
    skipSpace();
    const start = i;
    while (i < src.length && /[0-9.]/.test(src[i] ?? "")) i++;
    if (i === start) error();
    const num = parseFloat(src.slice(start, i));
    if (Number.isNaN(num)) error();
    return num;
  }

  function skipSpace(): void {
    while (i < src.length && /\s/.test(src[i] ?? "")) i++;
  }

  try {
    const result = parseExpression();
    skipSpace();
    if (i !== src.length) return null; // leftover characters = malformed
    if (!Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}
