#!/usr/bin/env bun
// Verifies src/generated/skill-files.ts is in sync with its source (.claude/skills/cliynab/).
// Compares content with line endings normalized, since Windows checkouts can have CRLF in the
// working tree (via core.autocrlf) while the generator writes LF - a byte-for-byte comparison
// would report false drift on those checkouts.
import { readFile } from "node:fs/promises";

const normalize = (s: string) => s.replace(/\r\n/g, "\n");

async function checkSkillManifest(): Promise<boolean> {
  const { buildManifest, OUTPUT_PATH } = await import("./generate-skill-manifest.ts");
  const expected = await buildManifest();
  const actual = await readFile(OUTPUT_PATH, "utf-8").catch(() => null);

  if (actual === null || normalize(actual) !== normalize(expected)) {
    console.error(
      `${OUTPUT_PATH} is out of date with .claude/skills/cliynab/.\n` +
        "Run `bun run generate:skill-manifest` and commit the result.",
    );
    return false;
  }
  return true;
}

if (!(await checkSkillManifest())) {
  process.exit(1);
}

console.log("Generated artifacts are in sync.");
