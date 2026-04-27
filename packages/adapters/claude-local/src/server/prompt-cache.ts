import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, type Hash } from "node:crypto";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import { ensurePaperclipSkillSymlink, type PaperclipSkillEntry } from "@paperclipai/adapter-utils/server-utils";

const DEFAULT_PAPERCLIP_INSTANCE_ID = "default";

type SkillEntry = PaperclipSkillEntry;

export interface ClaudePromptBundle {
  bundleKey: string;
  rootDir: string;
  addDir: string;
  instructionsFilePath: string | null;
}

function nonEmpty(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolveManagedClaudePromptCacheRoot(
  env: NodeJS.ProcessEnv,
  companyId: string,
): string {
  const paperclipHome = nonEmpty(env.PAPERCLIP_HOME) ?? path.resolve(os.homedir(), ".paperclip");
  const instanceId = nonEmpty(env.PAPERCLIP_INSTANCE_ID) ?? DEFAULT_PAPERCLIP_INSTANCE_ID;
  return path.resolve(
    paperclipHome,
    "instances",
    instanceId,
    "companies",
    companyId,
    "claude-prompt-cache",
  );
}

async function hashPathContents(
  candidate: string,
  hash: Hash,
  relativePath: string,
  seenDirectories: Set<string>,
): Promise<void> {
  const stat = await fs.lstat(candidate);

  if (stat.isSymbolicLink()) {
    hash.update(`symlink:${relativePath}\n`);
    const resolved = await fs.realpath(candidate).catch(() => null);
    if (!resolved) {
      hash.update("missing\n");
      return;
    }
    await hashPathContents(resolved, hash, relativePath, seenDirectories);
    return;
  }

  if (stat.isDirectory()) {
    const realDir = await fs.realpath(candidate).catch(() => candidate);
    hash.update(`dir:${relativePath}\n`);
    if (seenDirectories.has(realDir)) {
      hash.update("loop\n");
      return;
    }
    seenDirectories.add(realDir);
    const entries = await fs.readdir(candidate, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const childRelativePath = relativePath.length > 0 ? `${relativePath}/${entry.name}` : entry.name;
      await hashPathContents(path.join(candidate, entry.name), hash, childRelativePath, seenDirectories);
    }
    return;
  }

  if (stat.isFile()) {
    hash.update(`file:${relativePath}\n`);
    hash.update(await fs.readFile(candidate));
    hash.update("\n");
    return;
  }

  hash.update(`other:${relativePath}:${stat.mode}\n`);
}

/**
 * Locale string accepted by the bundle hasher. Mirrors RuntimeLocale from
 * server/src/services/heartbeat-locale.ts (single source of truth) — duplicated
 * here as a literal because the claude-local adapter package does not depend on
 * @paperclipai/server (one-way dependency: server -> adapters). Keep in sync
 * if RuntimeLocale ever grows beyond two values.
 */
type ClaudePromptBundleLocale = "pt-BR" | "en-US";

async function buildClaudePromptBundleKey(input: {
  skills: SkillEntry[];
  instructionsContents: string | null;
  locale: ClaudePromptBundleLocale;
}): Promise<string> {
  const hash = createHash("sha256");
  // Version bump v1 -> v2 because the hash input shape changed (locale is now
  // included). One-shot natural cache invalidation on first spawn after deploy
  // — Pitfall 1 mitigation per 11-RESEARCH.md.
  hash.update("paperclip-claude-prompt-bundle:v2\n");
  hash.update(`locale:${input.locale}\n`);
  if (input.instructionsContents) {
    hash.update("instructions\n");
    hash.update(input.instructionsContents);
    hash.update("\n");
  } else {
    hash.update("instructions:none\n");
  }

  const sortedSkills = [...input.skills].sort((left, right) => left.runtimeName.localeCompare(right.runtimeName));
  for (const entry of sortedSkills) {
    hash.update(`skill:${entry.key}:${entry.runtimeName}\n`);
    await hashPathContents(entry.source, hash, entry.runtimeName, new Set<string>());
  }

  return hash.digest("hex");
}

async function ensureReadableFile(targetPath: string, contents: string): Promise<void> {
  try {
    await fs.access(targetPath, fsConstants.R_OK);
    return;
  } catch {
    // Fall through and materialize the file.
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempPath, contents, "utf8");
    await fs.rename(tempPath, targetPath);
  } catch (err) {
    const targetReadable = await fs.access(targetPath, fsConstants.R_OK).then(() => true).catch(() => false);
    if (!targetReadable) {
      throw err;
    }
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}

/**
 * Recursive directory copy used when a skill has a locale variant that must be
 * materialized into the bundle. Copies regular files via fs.copyFile and recurses
 * into subdirectories. Symlinks inside source are dereferenced via fs.copyFile
 * (it follows links by default), which is fine for skill bundles that ship
 * `references/*.md` next to the entry SKILL.md.
 */
async function copyDirRecursive(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const dstPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, dstPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, dstPath);
    }
    // Other entry types (symlinks, sockets, devices) are skipped — skill source
    // dirs in the repo only contain regular files and directories.
  }
}

/**
 * Materialize a skill into the bundle target path according to the runtime locale.
 *
 * - When `locale === "pt-BR"` and `SKILL.pt-BR.md` exists in source: copy the
 *   entire directory to target and rename `SKILL.pt-BR.md` -> `SKILL.md`,
 *   replacing the English original at the destination only. Source dir is never
 *   mutated (Anti-Pattern from 11-RESEARCH §"Anti-Patterns to Avoid").
 * - When `locale === "en-US"` OR the variant file is absent: fall back to the
 *   pre-existing symlink path (zero behavioral change vs. legacy).
 *
 * Source remains the canonical English skill directory in the repo;
 * materialization always lands inside the per-bundle cache dir
 * (`~/.paperclip/instances/.../claude-prompt-cache/{bundleKey}/.claude/skills/`).
 */
export async function materializeSkillForLocale(
  source: string,
  target: string,
  locale: ClaudePromptBundleLocale,
): Promise<void> {
  if (locale === "en-US") {
    await ensurePaperclipSkillSymlink(source, target);
    return;
  }
  const variantPath = path.join(source, `SKILL.${locale}.md`);
  const hasVariant = await fs
    .access(variantPath)
    .then(() => true)
    .catch(() => false);
  if (!hasVariant) {
    await ensurePaperclipSkillSymlink(source, target);
    return;
  }
  await copyDirRecursive(source, target);
  await fs.rename(
    path.join(target, `SKILL.${locale}.md`),
    path.join(target, "SKILL.md"),
  );
}

export async function prepareClaudePromptBundle(input: {
  companyId: string;
  skills: SkillEntry[];
  instructionsContents: string | null;
  locale: ClaudePromptBundleLocale;
  onLog: AdapterExecutionContext["onLog"];
}): Promise<ClaudePromptBundle> {
  const { companyId, skills, instructionsContents, locale, onLog } = input;
  const bundleKey = await buildClaudePromptBundleKey({
    skills,
    instructionsContents,
    locale,
  });
  const rootDir = path.join(resolveManagedClaudePromptCacheRoot(process.env, companyId), bundleKey);
  const skillsHome = path.join(rootDir, ".claude", "skills");
  await fs.mkdir(skillsHome, { recursive: true });

  for (const entry of skills) {
    const target = path.join(skillsHome, entry.runtimeName);
    try {
      await materializeSkillForLocale(entry.source, target, locale);
    } catch (err) {
      await onLog(
        "stderr",
        `[paperclip] Failed to materialize Claude skill "${entry.key}" into ${skillsHome}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  const instructionsFilePath = instructionsContents
    ? path.join(rootDir, "agent-instructions.md")
    : null;
  if (instructionsFilePath && instructionsContents) {
    await ensureReadableFile(instructionsFilePath, instructionsContents);
  }

  return {
    bundleKey,
    rootDir,
    addDir: rootDir,
    instructionsFilePath,
  };
}

/**
 * Test-only handle on internal helpers. Not part of the public surface;
 * consumed by `server/src/__tests__/claude-local-prompt-cache-locale.test.ts`.
 */
export const __testing__ = {
  buildClaudePromptBundleKey,
  materializeSkillForLocale,
};
