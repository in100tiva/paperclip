/**
 * Runtime validation of mapping.ts invariants.
 * Run via: node node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/sync-agents/validate-mapping.ts
 */
import { AGENT_MAPPING, SKILL_MAPPING, validateMapping } from './mapping.js';

validateMapping();

console.log(`✓ AGENT_MAPPING entries: ${AGENT_MAPPING.length}`);
console.log(`✓ SKILL_MAPPING entries: ${SKILL_MAPPING.length}`);
console.log(`✓ Heads: ${AGENT_MAPPING.filter((a) => a.isHead).map((a) => a.slug).join(', ')}`);

const byDept: Record<string, string[]> = {};
for (const agent of AGENT_MAPPING) {
  byDept[agent.department] ??= [];
  byDept[agent.department].push(agent.slug);
}
for (const [dept, slugs] of Object.entries(byDept)) {
  console.log(`  ${dept}: ${slugs.length} agents (${slugs.join(', ')})`);
}

console.log('\n✓ Skill attachments:');
for (const skill of SKILL_MAPPING) {
  console.log(`  ${skill.slug}: ${skill.attachedToSlugs.length} attachments`);
}

console.log('\n✓ All invariants OK');
