/**
 * pnpm sync-skills — idempotent import of the 3 framework skills as CompanySkill
 * entries on in100tiva, plus attachment to agents via adapter_config.desiredSkillKeys.
 *
 * Reads .claude/skills/{slug} (file pointer or directory with SKILL.md), resolves
 * the actual skill path, and:
 *   1. Creates/updates company_skills rows (sourceType: local_path).
 *   2. Updates agents.adapter_config.desiredSkillKeys per SKILL_MAPPING.
 *
 * Must be run AFTER `pnpm sync-agents` (depends on agents existing in in100tiva).
 *
 * Decisions in 14-CONTEXT.md.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, agents, companySkills, eq, and, sql } from '../../packages/db/src/index.js';
import { SKILL_MAPPING } from './mapping.js';
import { TARGET_COMPANY_ID, CEO_AGENT_ID, type SkillMapping } from './types.js';

type InventoryKind = 'skill' | 'reference' | 'script' | 'asset' | 'markdown' | 'other';

interface InventoryEntry {
  path: string;
  kind: InventoryKind;
  exists: boolean;
}

const SCRIPT_EXT = new Set(['.sh', '.js', '.mjs', '.cjs', '.ts', '.py', '.rb', '.bash']);
const ASSET_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf', '.json', '.yml', '.yaml', '.toml', '.txt', '.csv']);

/**
 * Mirror of server's classifyInventoryKind so the script stays standalone but
 * produces inventory entries the company-skills service understands.
 */
function classifyInventoryKind(relativePath: string): InventoryKind {
  const normalized = relativePath.replaceAll(path.sep, '/').toLowerCase();
  if (normalized === 'skill.md' || normalized.endsWith('/skill.md')) return 'skill';
  if (normalized.startsWith('references/')) return 'reference';
  if (normalized.startsWith('scripts/')) return 'script';
  if (normalized.startsWith('assets/')) return 'asset';
  if (normalized.endsWith('.md')) return 'markdown';
  const ext = path.extname(normalized);
  if (SCRIPT_EXT.has(ext)) return 'script';
  if (ASSET_EXT.has(ext)) return 'asset';
  return 'other';
}

/**
 * Recursively walk a skill directory and return every file as a portable
 * (POSIX-separator) relative path. Skips .git and node_modules.
 */
async function walkSkillFiles(skillDir: string): Promise<string[]> {
  const out: string[] = [];
  async function recurse(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await recurse(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      out.push(path.relative(skillDir, absolute).split(path.sep).join('/'));
    }
  }
  await recurse(skillDir);
  return out;
}

/**
 * Build a full file inventory for a skill directory (SKILL.md + every
 * reference / script / asset / extra markdown found by recursive scan).
 * Matches the shape produced by the server's collectLocalSkillInventory in
 * `mode: "full"` so the UI's file tree renders the complete skill bundle.
 */
async function buildSkillFileInventory(skillDir: string): Promise<InventoryEntry[]> {
  const files = await walkSkillFiles(skillDir);
  const all = new Set<string>(['SKILL.md', ...files]);
  return Array.from(all)
    .map((rel) => ({ path: rel, kind: classifyInventoryKind(rel), exists: true }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function deriveTrustLevel(inventory: InventoryEntry[]): string {
  if (inventory.some((entry) => entry.kind === 'script')) return 'scripts_executables';
  if (inventory.some((entry) => entry.kind === 'asset' || entry.kind === 'other')) return 'assets';
  return 'markdown_only';
}

type Args = { dryRun: boolean; companyId: string };

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, companyId: TARGET_COMPANY_ID };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--company-id' && argv[i + 1]) {
      args.companyId = argv[i + 1] as string;
      i += 1;
    }
  }
  return args;
}

/**
 * Resolves the actual filesystem path for a skill slug.
 * `.claude/skills/{slug}` is either a directory (e.g. design-guide) or a
 * file containing a relative path (e.g. paperclip → ../../skills/paperclip).
 */
async function resolveSkillPath(repoRoot: string, slug: string): Promise<string> {
  const claudeSkillPath = path.join(repoRoot, '.claude', 'skills', slug);
  const stats = await stat(claudeSkillPath);
  if (stats.isDirectory()) {
    return claudeSkillPath;
  }
  // File pointer — resolve relative path
  const pointer = (await readFile(claudeSkillPath, 'utf8')).trim();
  // Pointer is relative to .claude/skills/ directory
  const resolved = path.resolve(path.join(repoRoot, '.claude', 'skills'), pointer);
  return resolved;
}

async function readSkillMarkdown(skillPath: string): Promise<{ markdown: string; description: string | null }> {
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  try {
    const raw = await readFile(skillMdPath, 'utf8');
    // Try to extract description from frontmatter
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    let description: string | null = null;
    if (fmMatch) {
      const fmBlock = fmMatch[1] as string;
      const descMatch = fmBlock.match(/description:\s*(?:>\s*)?\n?([\s\S]*?)(?=\n[a-z_-]+:|$)/i);
      if (descMatch) {
        description = (descMatch[1] as string).trim().replace(/\s+/g, ' ').slice(0, 500);
      }
    }
    return { markdown: raw, description };
  } catch {
    return {
      markdown: `# ${path.basename(skillPath)}\n\n_Skill stub — SKILL.md not found at ${skillMdPath}._\n`,
      description: null,
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' sync-skills — paperclip in100tiva skills importer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Target company: ${args.companyId}`);
  console.log(`Mode:           ${args.dryRun ? 'dry-run (no writes)' : 'apply'}\n`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('✗ FATAL: DATABASE_URL not set.');
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
  const db = createDb(databaseUrl);

  // ============================================================
  // PASS 1: Upsert CompanySkill rows
  // ============================================================
  console.log('Pass 1: upsert company_skills ...');
  const skillReport: Array<{ slug: string; status: string; detail?: string }> = [];

  for (const skill of SKILL_MAPPING) {
    const resolvedPath = await resolveSkillPath(repoRoot, skill.slug);
    const { markdown, description } = await readSkillMarkdown(resolvedPath);
    const fileInventory = await buildSkillFileInventory(resolvedPath);

    const desired = {
      key: skill.slug,
      slug: skill.slug,
      name: skill.name,
      description,
      markdown,
      sourceType: 'local_path',
      sourceLocator: resolvedPath,
      sourceRef: null,
      trustLevel: deriveTrustLevel(fileInventory),
      compatibility: 'compatible',
      fileInventory,
      metadata: {
        importedBy: 'sync-skills',
        importedAt: new Date().toISOString(),
        sourceKind: 'framework_local',
      },
    };

    const existing = await db
      .select({
        id: companySkills.id,
        markdown: companySkills.markdown,
        sourceLocator: companySkills.sourceLocator,
        fileInventory: companySkills.fileInventory,
        trustLevel: companySkills.trustLevel,
      })
      .from(companySkills)
      .where(and(eq(companySkills.companyId, args.companyId), eq(companySkills.key, skill.slug)))
      .then((rows) => rows[0] ?? null);

    if (existing) {
      const inventoryDrift =
        JSON.stringify(existing.fileInventory ?? []) !== JSON.stringify(desired.fileInventory);
      const drifted =
        existing.markdown !== desired.markdown
        || existing.sourceLocator !== desired.sourceLocator
        || existing.trustLevel !== desired.trustLevel
        || inventoryDrift;
      if (drifted && !args.dryRun) {
        await db
          .update(companySkills)
          .set({
            name: desired.name,
            description: desired.description,
            markdown: desired.markdown,
            sourceType: desired.sourceType,
            sourceLocator: desired.sourceLocator,
            trustLevel: desired.trustLevel,
            fileInventory: desired.fileInventory,
            metadata: desired.metadata,
            updatedAt: new Date(),
          })
          .where(eq(companySkills.id, existing.id));
      }
      skillReport.push({
        slug: skill.slug,
        status: drifted ? 'updated' : 'unchanged',
        detail: `${existing.id} (${desired.fileInventory.length} files)`,
      });
    } else {
      if (args.dryRun) {
        skillReport.push({
          slug: skill.slug,
          status: 'created',
          detail: `would-insert ${desired.fileInventory.length} files (dry-run)`,
        });
      } else {
        const inserted = await db
          .insert(companySkills)
          .values({ companyId: args.companyId, ...desired })
          .returning({ id: companySkills.id });
        skillReport.push({
          slug: skill.slug,
          status: 'created',
          detail: `${inserted[0]!.id} (${desired.fileInventory.length} files)`,
        });
      }
    }
  }

  // ============================================================
  // PASS 2: Resolve agent slug → id and attach skills
  // ============================================================
  console.log('Pass 2: attach skills via adapter_config.desiredSkillKeys ...');

  // Fetch all agents in company with their slug + adapter_config
  const allAgents = await db
    .select({
      id: agents.id,
      role: agents.role,
      adapterConfig: agents.adapterConfig,
      frameworkSlug: sql<string | null>`${agents.metadata}->>'frameworkSlug'`,
    })
    .from(agents)
    .where(eq(agents.companyId, args.companyId));

  // Build slug → agent map (CEO sentinel resolves to role='ceo')
  const slugToAgent = new Map<string, { id: string; adapterConfig: Record<string, unknown> }>();
  for (const a of allAgents) {
    const adapterConfig = (a.adapterConfig ?? {}) as Record<string, unknown>;
    if (a.role === 'ceo') slugToAgent.set('ceo', { id: a.id, adapterConfig });
    if (a.frameworkSlug) slugToAgent.set(a.frameworkSlug, { id: a.id, adapterConfig });
  }

  // Compute desired desiredSkillKeys per agent
  const desiredSkillsByAgentId = new Map<string, Set<string>>();
  for (const a of allAgents) {
    desiredSkillsByAgentId.set(a.id, new Set());
  }
  for (const skill of SKILL_MAPPING) {
    for (const targetSlug of skill.attachedToSlugs) {
      const target = slugToAgent.get(targetSlug);
      if (!target) {
        console.warn(`⚠ Skill ${skill.slug} references missing agent slug "${targetSlug}" — skipping`);
        continue;
      }
      desiredSkillsByAgentId.get(target.id)!.add(skill.slug);
    }
  }

  const attachReport: Array<{ slug: string; status: string; before: string[]; after: string[] }> = [];

  for (const a of allAgents) {
    const desiredKeys = Array.from(desiredSkillsByAgentId.get(a.id) ?? []).sort();
    const currentKeys = (((a.adapterConfig ?? {}) as Record<string, unknown>).desiredSkillKeys as string[] | undefined) ?? [];
    const currentSorted = [...currentKeys].sort();
    const same = desiredKeys.length === currentSorted.length && desiredKeys.every((k, i) => k === currentSorted[i]);
    const slug = a.frameworkSlug ?? (a.role === 'ceo' ? 'ceo' : `(${a.id.slice(0, 8)})`);

    if (same) {
      attachReport.push({ slug, status: 'unchanged', before: currentSorted, after: desiredKeys });
    } else {
      if (!args.dryRun) {
        const newConfig = { ...((a.adapterConfig ?? {}) as Record<string, unknown>), desiredSkillKeys: desiredKeys };
        await db.update(agents).set({ adapterConfig: newConfig, updatedAt: new Date() }).where(eq(agents.id, a.id));
      }
      attachReport.push({ slug, status: 'updated', before: currentSorted, after: desiredKeys });
    }
  }

  // ============================================================
  // INVARIANT: CEO must have paperclip + company-creator
  // ============================================================
  const ceoAgent = allAgents.find((a) => a.id === CEO_AGENT_ID);
  if (ceoAgent) {
    const ceoDesired = desiredSkillsByAgentId.get(CEO_AGENT_ID) ?? new Set();
    if (!ceoDesired.has('paperclip') || !ceoDesired.has('company-creator')) {
      console.error('✗ FATAL: CEO does not have expected skills (paperclip + company-creator)');
      process.exit(1);
    }
  }

  // ============================================================
  // REPORT
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Skill rows');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const row of skillReport) {
    console.log(`  ${row.status.padEnd(10)} ${row.slug.padEnd(20)} ${row.detail ?? ''}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Skill attachments per agent');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const counts = { updated: 0, unchanged: 0 };
  for (const row of attachReport) {
    counts[row.status as 'updated' | 'unchanged'] += 1;
    const marker = row.status === 'updated' ? '✏' : '·';
    console.log(`  ${marker} ${row.slug.padEnd(28)} [${row.after.join(', ') || '—'}]`);
  }
  console.log(`\nUpdated: ${counts.updated} | Unchanged: ${counts.unchanged}`);
  console.log(args.dryRun ? '\n✓ Dry-run complete.' : '\n✓ Sync complete.');
}

main().catch((err) => {
  console.error('✗ sync-skills failed:', err);
  process.exit(1);
});
