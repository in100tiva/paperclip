/**
 * pnpm sync-instructions — materializes instructions bundle on disk for each
 * imported agent AND fixes skill attachment field name.
 *
 * Bug fixes for Phase 13/14 oversights:
 *
 *   (1) sync.ts inserted agents directly via Drizzle, bypassing /agent-hires
 *       endpoint that calls loadDefaultAgentInstructionsBundle +
 *       materializeManagedBundle. Result: agents had no AGENTS.md/etc on disk
 *       and no instructionsBundleMode/Root/EntryFile in adapter_config — UI
 *       showed empty "Instruções" tab.
 *
 *   (2) sync-skills.ts wrote desiredSkillKeys (wrong key). Paperclip's actual
 *       contract is adapter_config.paperclipSkillSync.desiredSkills (per
 *       packages/adapter-utils/src/server-utils.ts:readPaperclipSkillSyncPreference).
 *       Result: skills appeared unchecked in UI.
 *
 * What this script does:
 *
 *   For each entry in AGENT_MAPPING:
 *     1. Read .claude/agents/{slug}.md (full body, dropped frontmatter).
 *     2. Materialize ~/.paperclip/instances/{instanceId}/companies/{cid}/
 *        agents/{aid}/instructions/AGENTS.md with the body content.
 *     3. Update adapter_config:
 *        - instructionsBundleMode: "managed"
 *        - instructionsRootPath: <materialized root>
 *        - instructionsEntryFile: "AGENTS.md"
 *        - paperclipSkillSync: { desiredSkills: [...] } (correct field)
 *        - desiredSkillKeys: removed (legacy/wrong)
 *
 * Idempotent: re-running overwrites AGENTS.md content (which is fine since
 * .claude/agents/{slug}.md is the source of truth).
 */

import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, agents, eq, and, sql } from '../../packages/db/src/index.js';
import { AGENT_MAPPING, SKILL_MAPPING } from './mapping.js';
import { TARGET_COMPANY_ID, type AgentMapping } from './types.js';

type Args = { dryRun: boolean; companyId: string; instanceId: string };

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    companyId: TARGET_COMPANY_ID,
    instanceId: process.env.PAPERCLIP_INSTANCE_ID?.trim() || 'team-shared',
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--company-id' && argv[i + 1]) {
      args.companyId = argv[i + 1] as string;
      i += 1;
    } else if (argv[i] === '--instance-id' && argv[i + 1]) {
      args.instanceId = argv[i + 1] as string;
      i += 1;
    }
  }
  return args;
}

function resolveInstructionsRoot(instanceId: string, companyId: string, agentId: string): string {
  const home = process.env.PAPERCLIP_HOME?.trim()
    ? (process.env.PAPERCLIP_HOME.startsWith('~')
        ? path.resolve(homedir(), process.env.PAPERCLIP_HOME.slice(1).replace(/^[\\/]/, ''))
        : path.resolve(process.env.PAPERCLIP_HOME))
    : path.resolve(homedir(), '.paperclip');
  return path.resolve(home, 'instances', instanceId, 'companies', companyId, 'agents', agentId, 'instructions');
}

async function readAgentMarkdownBody(repoRoot: string, slug: string): Promise<string> {
  const filePath = path.join(repoRoot, '.claude', 'agents', `${slug}.md`);
  const raw = await readFile(filePath, 'utf8');
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return normalized.trim();
  const closing = normalized.indexOf('\n---\n', 4);
  if (closing < 0) return normalized.trim();
  return normalized.slice(closing + 5).trim();
}

function buildSkillSyncForAgent(slug: string, agentRoleIsCeo: boolean): string[] {
  const desired = new Set<string>();
  for (const skill of SKILL_MAPPING) {
    for (const target of skill.attachedToSlugs) {
      if (target === 'ceo' && agentRoleIsCeo) desired.add(skill.slug);
      if (target === slug) desired.add(skill.slug);
    }
  }
  return Array.from(desired).sort();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' sync-instructions — materialize AGENTS.md + fix skill field');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Target company: ${args.companyId}`);
  console.log(`Instance ID:    ${args.instanceId}`);
  console.log(`Mode:           ${args.dryRun ? 'dry-run' : 'apply'}\n`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('✗ FATAL: DATABASE_URL not set. Source .paperclip/.env first.');
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
  const db = createDb(databaseUrl);

  // Fetch all agents in company that have metadata.frameworkSlug populated by sync-agents
  const allAgents = await db
    .select({
      id: agents.id,
      role: agents.role,
      adapterConfig: agents.adapterConfig,
      frameworkSlug: sql<string | null>`${agents.metadata}->>'frameworkSlug'`,
    })
    .from(agents)
    .where(eq(agents.companyId, args.companyId));

  const slugToAgentId = new Map<string, { id: string; adapterConfig: Record<string, unknown> }>();
  for (const a of allAgents) {
    if (a.frameworkSlug) {
      slugToAgentId.set(a.frameworkSlug, {
        id: a.id,
        adapterConfig: (a.adapterConfig ?? {}) as Record<string, unknown>,
      });
    }
  }

  // Sanity check: every mapped agent has an entry in DB
  for (const m of AGENT_MAPPING) {
    if (!slugToAgentId.has(m.slug)) {
      console.error(`✗ FATAL: agent slug "${m.slug}" not found in DB (run pnpm sync-agents first).`);
      process.exit(1);
    }
  }

  type ReportRow = { slug: string; bundle: 'created' | 'updated' | 'unchanged'; skills: number; entryFile: string };
  const report: ReportRow[] = [];

  for (const mapping of AGENT_MAPPING) {
    const target = slugToAgentId.get(mapping.slug)!;
    const body = await readAgentMarkdownBody(repoRoot, mapping.slug);
    const instructionsRoot = resolveInstructionsRoot(args.instanceId, args.companyId, target.id);
    const entryFile = 'AGENTS.md';
    const entryPath = path.join(instructionsRoot, entryFile);

    // Check if AGENTS.md already exists with same content
    let bundleStatus: ReportRow['bundle'] = 'created';
    try {
      const existing = await readFile(entryPath, 'utf8');
      if (existing === body) bundleStatus = 'unchanged';
      else bundleStatus = 'updated';
    } catch {
      bundleStatus = 'created';
    }

    if (!args.dryRun) {
      await mkdir(instructionsRoot, { recursive: true });
      await writeFile(entryPath, body, 'utf8');
    }

    // Build correct skills list
    const desiredSkills = buildSkillSyncForAgent(mapping.slug, false);

    // Build new adapter_config with bundle config + correct skill field
    const nextAdapterConfig: Record<string, unknown> = { ...target.adapterConfig };
    nextAdapterConfig.instructionsBundleMode = 'managed';
    nextAdapterConfig.instructionsRootPath = instructionsRoot;
    nextAdapterConfig.instructionsEntryFile = entryFile;
    nextAdapterConfig.paperclipSkillSync = { desiredSkills };
    // Remove the wrong field we wrote previously
    delete nextAdapterConfig.desiredSkillKeys;

    if (!args.dryRun) {
      await db
        .update(agents)
        .set({ adapterConfig: nextAdapterConfig, updatedAt: new Date() })
        .where(eq(agents.id, target.id));
    }

    report.push({
      slug: mapping.slug,
      bundle: bundleStatus,
      skills: desiredSkills.length,
      entryFile,
    });
  }

  // Also fix the CEO's skill attachment (it's not in AGENT_MAPPING but should have paperclip + company-creator)
  const ceoEntry = allAgents.find((a) => a.role === 'ceo');
  if (ceoEntry) {
    const ceoConfig = (ceoEntry.adapterConfig ?? {}) as Record<string, unknown>;
    const ceoDesiredSkills = buildSkillSyncForAgent('ceo-noop', true); // resolves via 'ceo' sentinel
    const nextCeoConfig: Record<string, unknown> = { ...ceoConfig };
    nextCeoConfig.paperclipSkillSync = { desiredSkills: ceoDesiredSkills };
    delete nextCeoConfig.desiredSkillKeys;

    if (!args.dryRun) {
      await db
        .update(agents)
        .set({ adapterConfig: nextCeoConfig, updatedAt: new Date() })
        .where(eq(agents.id, ceoEntry.id));
    }
    console.log(`✓ CEO skills fixed: [${ceoDesiredSkills.join(', ')}]`);
  }

  // ============================================================
  // REPORT
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const row of report) {
    console.log(`  ${row.bundle.padEnd(10)} ${row.slug.padEnd(28)} skills=${row.skills}  entry=${row.entryFile}`);
  }
  const counts = { created: 0, updated: 0, unchanged: 0 };
  for (const row of report) counts[row.bundle] += 1;
  console.log(`\nBundle: ${counts.created} created · ${counts.updated} updated · ${counts.unchanged} unchanged`);
  console.log(args.dryRun ? '\n✓ Dry-run complete.' : '\n✓ Sync complete.');
}

main().catch((err) => {
  console.error('✗ sync-instructions failed:', err);
  process.exit(1);
});
