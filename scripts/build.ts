#!/usr/bin/env bun
const clientId = process.env.YNAB_CLIENT_ID;

if (!clientId) {
  console.error(
    "YNAB_CLIENT_ID must be set (e.g. via .env) to build cliynab.\n" +
      "It's baked into the compiled executable at build time.",
  );
  process.exit(1);
}

const proc = Bun.spawn(
  [
    "bun",
    "build",
    "--compile",
    "--target",
    "bun-windows-x64",
    "--minify",
    "--sourcemap",
    "./src/index.ts",
    "--outfile",
    "./dist/cliynab.exe",
    "--define",
    `process.env.YNAB_CLIENT_ID:${JSON.stringify(clientId)}`,
  ],
  { stdout: "inherit", stderr: "inherit" },
);

process.exit(await proc.exited);
