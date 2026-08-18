import { describe, expect, test } from "bun:test";
import { evalMath } from "./math";

describe("evalMath", () => {
  test("parses a plain integer", () => {
    expect(evalMath("600")).toBe(600);
  });

  test("adds", () => {
    expect(evalMath("600+100")).toBe(700);
  });

  test("divides", () => {
    expect(evalMath("900/2")).toBe(450);
  });

  test("respects order of operations", () => {
    expect(evalMath("2+3*4")).toBe(14);
  });

  test("respects parens", () => {
    expect(evalMath("(2+3)*4")).toBe(20);
  });

  test("handles unary minus", () => {
    expect(evalMath("-5+10")).toBe(5);
  });

  test("handles whitespace", () => {
    expect(evalMath(" 600 + 100 ")).toBe(700);
  });

  test("returns null for empty input", () => {
    expect(evalMath("")).toBeNull();
    expect(evalMath("   ")).toBeNull();
  });

  test("returns null for division by zero", () => {
    expect(evalMath("5/0")).toBeNull();
  });

  test("returns null for malformed expressions", () => {
    expect(evalMath("600+")).toBeNull();
    expect(evalMath("600++")).toBeNull();
    expect(evalMath("(600")).toBeNull();
    expect(evalMath("600)")).toBeNull();
  });

  test("returns null for non-arithmetic characters", () => {
    expect(evalMath("600abc")).toBeNull();
    expect(evalMath("alert(1)")).toBeNull();
    expect(evalMath("600; 700")).toBeNull();
  });

  test("returns null for trailing garbage after a valid expression", () => {
    expect(evalMath("600 100")).toBeNull();
  });
});
