#!/usr/bin/env bun
const clientId = process.env.YNAB_CLIENT_ID;

if (!clientId) {
  console.error(
    "YNAB_CLIENT_ID must be set (e.g. via .env) to build cliynab.\n" +
      "It's baked into the compiled executable at build time.",
  );
  process.exit(1);
}

const targets = {
  windows: { bunTarget: "bun-windows-x64", outfile: "./dist/cliynab.exe" },
  linux: { bunTarget: "bun-linux-x64", outfile: "./dist/cliynab" },
} as const;

const targetName = process.argv[2] ?? "windows";
const target = targets[targetName as keyof typeof targets];

if (!target) {
  console.error(
    `Unknown build target "${targetName}". Expected one of: ${Object.keys(targets).join(", ")}`,
  );
  process.exit(1);
}

const proc = Bun.spawn(
  [
    "bun",
    "build",
    "--compile",
    "--target",
    target.bunTarget,
    "--minify",
    "--sourcemap",
    "./src/index.ts",
    "--outfile",
    target.outfile,
    "--define",
    `process.env.YNAB_CLIENT_ID:${JSON.stringify(clientId)}`,
  ],
  { stdout: "inherit", stderr: "inherit" },
);

process.exit(await proc.exited);
