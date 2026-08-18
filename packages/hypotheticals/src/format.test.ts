import { describe, expect, test } from "bun:test";
import { currency, signedCurrency } from "./format";

describe("currency", () => {
  test("formats a positive amount", () => {
    expect(currency(2400)).toBe("$2,400");
  });

  test("rounds to the nearest dollar", () => {
    expect(currency(2400.6)).toBe("$2,401");
  });

  test("shows a minus sign for negative amounts by default", () => {
    expect(currency(-150)).toBe("-$150");
  });

  test("suppresses the sign when forceSign is false", () => {
    expect(currency(-150, { forceSign: false })).toBe("$150");
  });
});

describe("signedCurrency", () => {
  test("shows an em dash for zero", () => {
    expect(signedCurrency(0)).toBe("—");
  });

  test("prefixes positive deltas with +", () => {
    expect(signedCurrency(100)).toBe("+$100");
  });

  test("prefixes negative deltas with -", () => {
    expect(signedCurrency(-100)).toBe("-$100");
  });
});
