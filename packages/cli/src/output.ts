import type { Command } from "commander";

export function addOutputOption(command: Command): Command {
  return command.option("--tsv", "Output as TSV (with a header row) instead of JSON");
}

export function printTable<T extends object>(rows: T[], opts: { tsv?: boolean }): void {
  if (opts.tsv) {
    printTsv(rows);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
}

function printTsv<T extends object>(rows: T[]): void {
  const [first] = rows;
  if (!first) return;

  const headers = Object.keys(first) as (keyof T)[];
  console.log(headers.join("\t"));
  for (const row of rows) {
    console.log(headers.map((header) => formatTsvValue(row[header])).join("\t"));
  }
}

function formatTsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}
