import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { Command } from "commander";
import { skillFiles } from "../generated/skill-files";

const DEFAULT_TARGET_DIR = ".claude/skills/cliynab";

// When running from source, .claude/skills/cliynab/ is a real directory on disk - read it
// directly so adding/removing a file there is picked up automatically, with nothing to
// regenerate. A compiled cliynab.exe has no such directory (nothing outside the bundled module
// graph survives `bun build --compile`), so it falls back to the generated manifest, which is
// refreshed automatically as part of `bun run build` (see scripts/generate-skill-manifest.ts).
async function readSkillFilesFromDisk(skillRoot: string): Promise<SkillFileContent[]> {
  const entries = await readdir(skillRoot, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(skillRoot, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();

  return Promise.all(
    files.map(async (relativePath) => ({
      relativePath,
      content: await readFile(join(skillRoot, relativePath), "utf-8"),
    })),
  );
}

interface SkillFileContent {
  relativePath: string;
  content: string;
}

async function loadSkillFiles(): Promise<SkillFileContent[]> {
  const sourceSkillRoot = join(import.meta.dir, "..", "..", ".claude", "skills", "cliynab");
  if (existsSync(sourceSkillRoot)) {
    return readSkillFilesFromDisk(sourceSkillRoot);
  }
  return skillFiles;
}

export async function installSkill(targetDir: string = DEFAULT_TARGET_DIR): Promise<string[]> {
  const files = await loadSkillFiles();
  const written: string[] = [];
  for (const file of files) {
    const path = join(targetDir, file.relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content, "utf-8");
    written.push(path);
  }
  return written;
}

export const skillCommand = new Command("skill");

skillCommand
  .command("install")
  .description("Write the cliynab skill (how to use cliynab) to a project's skills directory")
  .argument("[path]", "Target directory", DEFAULT_TARGET_DIR)
  .action(async (path: string) => {
    const written = await installSkill(path);
    for (const file of written) {
      console.log(file);
    }
  });
