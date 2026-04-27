/**
 * pnpm sync-agents — one-shot idempotent import of framework agents into the
 * in100tiva company in paperclip.
 *
 * Reads .claude/agents/*.md (frontmatter + body), cross-references with
 * scripts/sync-agents/mapping.ts (Phase 12 canonical mapping), and upserts
 * the 18 framework agents into Postgres via Drizzle.
 *
 * Skill import + attachment is handled by Phase 14 (sync-skills.ts). This
 * script ONLY handles agents and the reports_to hierarchy.
 *
 * Usage:
 *   pnpm sync-agents              # apply changes
 *   pnpm sync-agents --dry-run    # show report without writing
 *   pnpm sync-agents --company-id <uuid>  # override target company
 *
 * Decisions captured in:
 *   .planning/phases/12-mapping-schema-decisions/12-DECISIONS.md
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, agents, companies, eq, and, sql } from '../../packages/db/src/index.js';
import {
  AGENT_MAPPING,
  validateMapping,
  getAgentMappingBySlug,
} from './mapping.js';
import {
  TARGET_COMPANY_ID,
  CEO_AGENT_ID,
  type AgentMapping,
} from './types.js';

type Args = {
  dryRun: boolean;
  companyId: string;
};

type ReportRow = {
  slug: string;
  status: 'created' | 'updated' | 'unchanged' | 'skipped' | 'error';
  detail?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, companyId: TARGET_COMPANY_ID };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--company-id' && argv[i + 1]) {
      args.companyId = argv[i + 1] as string;
      i += 1;
    }
  }
  return args;
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, body: normalized.trim() };
  }
  const closing = normalized.indexOf('\n---\n', 4);
  if (closing < 0) {
    return { frontmatter: {}, body: normalized.trim() };
  }
  const frontmatterRaw = normalized.slice(4, closing);
  const body = normalized.slice(closing + 5).trim();
  const frontmatter: Record<string, string> = {};
  for (const line of frontmatterRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 0) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body };
}

async function readAgentMarkdownFiles(claudeAgentsDir: string): Promise<Map<string, { frontmatter: Record<string, string>; body: string }>> {
  const result = new Map<string, { frontmatter: Record<string, string>; body: string }>();
  const entries = await readdir(claudeAgentsDir);
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const slug = entry.slice(0, -3);
    const raw = await readFile(path.join(claudeAgentsDir, entry), 'utf8');
    result.set(slug, parseFrontmatter(raw));
  }
  return result;
}

function buildAgentPayload(
  mapping: AgentMapping,
  fm: Record<string, string>,
): {
  name: string;
  role: string;
  title: string;
  capabilities: string | null;
  status: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  metadata: Record<string, unknown>;
} {
  const capabilities = fm.description ?? null;
  return {
    name: mapping.name,
    role: mapping.role,
    title: mapping.title,
    capabilities,
    status: 'idle',
    adapterType: 'claude_local',
    adapterConfig: {
      model: 'claude-sonnet-4-6',
      desiredSkillKeys: [] as string[], // Phase 14 fills this
    },
    runtimeConfig: {},
    metadata: {
      frameworkSlug: mapping.slug,
      department: mapping.department,
      parallelismPolicy: mapping.parallelismPolicy,
      isHead: mapping.isHead,
      managerSlug: mapping.managerSlug, // for Pass 2 reports_to resolution
      syncedAt: new Date().toISOString(),
    },
  };
}

/** Returns true if existing agent metadata/fields differ from desired. */
function hasDrifted(
  existing: { name: string; role: string; title: string | null; capabilities: string | null; metadata: Record<string, unknown> | null },
  desired: ReturnType<typeof buildAgentPayload>,
): boolean {
  if (existing.name !== desired.name) return true;
  if (existing.role !== desired.role) return true;
  if (existing.title !== desired.title) return true;
  if ((existing.capabilities ?? null) !== desired.capabilities) return true;
  const existingMeta = (existing.metadata ?? {}) as Record<string, unknown>;
  for (const key of ['frameworkSlug', 'department', 'parallelismPolicy', 'isHead', 'managerSlug'] as const) {
    if (existingMeta[key] !== desired.metadata[key]) return true;
  }
  return false;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' sync-agents — paperclip in100tiva employee importer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Target company: ${args.companyId}`);
  console.log(`Mode:           ${args.dryRun ? 'dry-run (no writes)' : 'apply'}`);
  console.log('');

  validateMapping();

  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
  const claudeAgentsDir = path.join(repoRoot, '.claude', 'agents');

  const fmFiles = await readAgentMarkdownFiles(claudeAgentsDir);

  // Sanity check: every mapped slug has a .md file
  for (const m of AGENT_MAPPING) {
    if (!fmFiles.has(m.slug)) {
      console.error(`✗ FATAL: AGENT_MAPPING entry "${m.slug}" has no .claude/agents/${m.slug}.md`);
      process.exit(1);
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('✗ FATAL: DATABASE_URL env var not set. Source .paperclip/.env first.');
    process.exit(1);
  }

  const db = createDb(databaseUrl);

  // Verify target company exists and CEO is intact
  const companyRow = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.id, args.companyId))
    .then((rows) => rows[0] ?? null);

  if (!companyRow) {
    console.error(`✗ FATAL: company ${args.companyId} not found.`);
    process.exit(1);
  }
  console.log(`✓ Company exists: ${companyRow.name} (${companyRow.id})`);

  const ceoRow = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.id, CEO_AGENT_ID))
    .then((rows) => rows[0] ?? null);
  if (!ceoRow) {
    console.error(`✗ FATAL: pre-existing CEO ${CEO_AGENT_ID} not found.`);
    process.exit(1);
  }
  console.log(`✓ CEO present: ${ceoRow.name} (${ceoRow.id})`);
  console.log('');

  const report: ReportRow[] = [];
  const slugToAgentId = new Map<string, string>();
  slugToAgentId.set('ceo', CEO_AGENT_ID);

  // ============================================================
  // PASS 1: Upsert agents (without reports_to)
  // ============================================================
  console.log('Pass 1: upsert agents (no reports_to yet) ...');

  for (const mapping of AGENT_MAPPING) {
    const fm = fmFiles.get(mapping.slug)!.frontmatter;
    const desired = buildAgentPayload(mapping, fm);

    // Lookup by (companyId, metadata.frameworkSlug)
    const existing = await db
      .select({
        id: agents.id,
        name: agents.name,
        role: agents.role,
        title: agents.title,
        capabilities: agents.capabilities,
        metadata: agents.metadata,
      })
      .from(agents)
      .where(
        and(
          eq(agents.companyId, args.companyId),
          sql`${agents.metadata}->>'frameworkSlug' = ${mapping.slug}`,
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (existing) {
      slugToAgentId.set(mapping.slug, existing.id);
      if (hasDrifted(existing as never, desired)) {
        if (!args.dryRun) {
          await db
            .update(agents)
            .set({
              name: desired.name,
              role: desired.role,
              title: desired.title,
              capabilities: desired.capabilities,
              adapterType: desired.adapterType,
              adapterConfig: desired.adapterConfig,
              runtimeConfig: desired.runtimeConfig,
              metadata: desired.metadata,
              updatedAt: new Date(),
            })
            .where(eq(agents.id, existing.id));
        }
        report.push({ slug: mapping.slug, status: 'updated', detail: existing.id });
      } else {
        report.push({ slug: mapping.slug, status: 'unchanged', detail: existing.id });
      }
    } else {
      if (args.dryRun) {
        report.push({ slug: mapping.slug, status: 'created', detail: 'would-insert (dry-run)' });
      } else {
        const inserted = await db
          .insert(agents)
          .values({
            companyId: args.companyId,
            name: desired.name,
            role: desired.role,
            title: desired.title,
            capabilities: desired.capabilities,
            status: desired.status,
            adapterType: desired.adapterType,
            adapterConfig: desired.adapterConfig,
            runtimeConfig: desired.runtimeConfig,
            metadata: desired.metadata,
          })
          .returning({ id: agents.id });
        const newId = inserted[0]!.id;
        slugToAgentId.set(mapping.slug, newId);
        report.push({ slug: mapping.slug, status: 'created', detail: newId });
      }
    }
  }

  // ============================================================
  // PASS 2: Update reports_to using slugToAgentId
  // ============================================================
  console.log('Pass 2: link reports_to hierarchy ...');

  for (const mapping of AGENT_MAPPING) {
    const agentId = slugToAgentId.get(mapping.slug);
    if (!agentId) continue; // dry-run cases or skipped
    const managerId = slugToAgentId.get(mapping.managerSlug);
    if (!managerId) {
      console.error(`✗ Cannot resolve managerSlug "${mapping.managerSlug}" for ${mapping.slug}`);
      continue;
    }
    if (!args.dryRun) {
      await db.update(agents).set({ reportsTo: managerId, updatedAt: new Date() }).where(eq(agents.id, agentId));
    }
  }

  // ============================================================
  // INVARIANT CHECK: CEO untouched
  // ============================================================
  const ceoAfter = await db
    .select({ id: agents.id, name: agents.name, reportsTo: agents.reportsTo })
    .from(agents)
    .where(eq(agents.id, CEO_AGENT_ID))
    .then((rows) => rows[0] ?? null);
  if (!ceoAfter) {
    console.error('✗ FATAL: CEO row vanished after sync — aborting.');
    process.exit(1);
  }
  if (ceoAfter.reportsTo !== null) {
    console.error(`✗ FATAL: CEO.reportsTo became ${ceoAfter.reportsTo} (expected null).`);
    process.exit(1);
  }
  console.log(`✓ CEO intact: ${ceoAfter.name}, reportsTo=null`);
  console.log('');

  // ============================================================
  // REPORT
  // ============================================================
  const counts = { created: 0, updated: 0, unchanged: 0, skipped: 0, error: 0 };
  for (const row of report) counts[row.status] += 1;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Created:   ${counts.created}`);
  console.log(`Updated:   ${counts.updated}`);
  console.log(`Unchanged: ${counts.unchanged}`);
  console.log(`Skipped:   ${counts.skipped}`);
  console.log(`Error:     ${counts.error}`);
  console.log('');
  for (const row of report) {
    console.log(`  ${row.status.padEnd(10)} ${row.slug.padEnd(28)} ${row.detail ?? ''}`);
  }
  console.log('');

  if (counts.error > 0) {
    process.exit(1);
  }
  console.log(args.dryRun ? '✓ Dry-run complete. No writes performed.' : '✓ Sync complete.');
}

main().catch((err) => {
  console.error('✗ sync-agents failed:', err);
  process.exit(1);
});
