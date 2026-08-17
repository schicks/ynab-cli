#!/usr/bin/env bun
// Verifies src/generated/ynab-openapi.d.ts is in sync with its source (openapi/ynab.yaml).
// Compares content with line endings normalized, since Windows checkouts can have CRLF in the
// working tree (via core.autocrlf) while the generator writes LF - a byte-for-byte comparison
// would report false drift on those checkouts.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const normalize = (s: string) => s.replace(/\r\n/g, "\n");

async function checkTypes(): Promise<boolean> {
  const outputPath = join(import.meta.dir, "..", "src", "generated", "ynab-openapi.d.ts");
  const tmpDir = await mkdtemp(join(tmpdir(), "ynab-client-check-types-"));
  const tmpFile = join(tmpDir, "ynab-openapi.d.ts");
  try {
    const proc = Bun.spawn(
      ["bun", "x", "openapi-typescript", "openapi/ynab.yaml", "-o", tmpFile],
      { stdout: "ignore", stderr: "inherit" },
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      console.error("Failed to generate types for comparison.");
      return false;
    }

    const [expected, actual] = await Promise.all([
      readFile(tmpFile, "utf-8"),
      readFile(outputPath, "utf-8").catch(() => null),
    ]);

    if (actual === null || normalize(actual) !== normalize(expected)) {
      console.error(
        `${outputPath} is out of date with openapi/ynab.yaml.\n` +
          "Run `bun run generate:types` and commit the result.",
      );
      return false;
    }
    return true;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

if (!(await checkTypes())) {
  process.exit(1);
}

console.log("Generated artifacts are in sync.");
