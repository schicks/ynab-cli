import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { installSkill } from "./skill";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "cliynab-skill-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("installSkill", () => {
  test("writes SKILL.md and its assets into the target directory, creating it if needed", async () => {
    const targetDir = join(tempDir, "nested", "skills-dir");

    const written = await installSkill(targetDir);

    expect(written).toEqual([
      join(targetDir, "SKILL.md"),
      join(targetDir, "assets", "evaluate-target.md"),
      join(targetDir, "assets", "file-bug-report.md"),
    ]);

    const skillContent = await readFile(join(targetDir, "SKILL.md"), "utf-8");
    expect(skillContent).toContain("name: cliynab");

    const evaluateTargetContent = await readFile(
      join(targetDir, "assets", "evaluate-target.md"),
      "utf-8",
    );
    expect(evaluateTargetContent).toContain("Evaluating whether a category's Target is correct");

    const fileBugReportContent = await readFile(
      join(targetDir, "assets", "file-bug-report.md"),
      "utf-8",
    );
    expect(fileBugReportContent).toContain("schicks/ynab-cli");
  });

  test("overwrites existing files", async () => {
    const targetDir = join(tempDir, "skills-dir");
    await installSkill(targetDir);

    const written = await installSkill(targetDir);

    const skillContent = await readFile(written[0]!, "utf-8");
    expect(skillContent).toContain("name: cliynab");
  });
});
