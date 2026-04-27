import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __testing__ } from "@paperclipai/adapter-claude-local/server";

const { materializeSkillForLocale } = __testing__;

describe("materializeSkillForLocale", () => {
  let tmpRoot: string;
  let sourceDir: string;
  let targetParent: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-variant-test-"));
    sourceDir = path.join(tmpRoot, "src", "paperclip");
    targetParent = path.join(tmpRoot, "bundle");
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(targetParent, { recursive: true });
    await fs.writeFile(path.join(sourceDir, "SKILL.md"), "# English skill\n");
    await fs.writeFile(path.join(sourceDir, "SKILL.pt-BR.md"), "# Skill em portugues\n");
    // Add a subdirectory with a sibling file to verify recursive copy.
    await fs.mkdir(path.join(sourceDir, "references"), { recursive: true });
    await fs.writeFile(
      path.join(sourceDir, "references", "api-reference.md"),
      "# API reference\n",
    );
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it("materializes SKILL.pt-BR.md as SKILL.md in bundle when locale=pt-BR and variant exists", async () => {
    const target = path.join(targetParent, "paperclip");
    await materializeSkillForLocale(sourceDir, target, "pt-BR");

    const content = await fs.readFile(path.join(target, "SKILL.md"), "utf8");
    expect(content).toContain("Skill em portugues");

    // SKILL.pt-BR.md should not exist as separate file in target (renamed to SKILL.md).
    const variantStat = await fs
      .stat(path.join(target, "SKILL.pt-BR.md"))
      .catch(() => null);
    expect(variantStat).toBeNull();

    // Sibling files in subdirectories must be copied too.
    const refContent = await fs.readFile(
      path.join(target, "references", "api-reference.md"),
      "utf8",
    );
    expect(refContent).toContain("API reference");

    // Bundle target is a real directory, not a symlink.
    const lstat = await fs.lstat(target);
    expect(lstat.isSymbolicLink()).toBe(false);
    expect(lstat.isDirectory()).toBe(true);
  });

  it("falls back to symlink when locale=en-US even if variant exists", async () => {
    const target = path.join(targetParent, "paperclip");
    await materializeSkillForLocale(sourceDir, target, "en-US");
    const stat = await fs.lstat(target);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it("falls back to symlink when locale=pt-BR but variant absent", async () => {
    await fs.rm(path.join(sourceDir, "SKILL.pt-BR.md"));
    const target = path.join(targetParent, "paperclip");
    await materializeSkillForLocale(sourceDir, target, "pt-BR");
    const stat = await fs.lstat(target);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it("does not mutate source directory", async () => {
    const target = path.join(targetParent, "paperclip");
    await materializeSkillForLocale(sourceDir, target, "pt-BR");
    const sourceFiles = await fs.readdir(sourceDir);
    expect(sourceFiles.sort()).toEqual(["SKILL.md", "SKILL.pt-BR.md", "references"]);
    const stillEnglish = await fs.readFile(path.join(sourceDir, "SKILL.md"), "utf8");
    expect(stillEnglish).toContain("English skill");
  });
});
