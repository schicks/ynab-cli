export function currency(n: number, opts: { forceSign?: boolean } = {}): string {
  const sign = n < 0 && opts.forceSign !== false ? "-" : "";
  return sign + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
}

export function signedCurrency(n: number): string {
  if (n === 0) return "—";
  return (n > 0 ? "+" : "-") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
}
