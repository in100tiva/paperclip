import type { AgentMapping, SkillMapping } from './types.js';

/**
 * Canonical mapping of all 18 framework agents in `.claude/agents/*.md`
 * to their paperclip employee identity in the in100tiva company.
 *
 * Decisions captured in `.planning/phases/12-mapping-schema-decisions/12-CONTEXT.md`:
 * - 4 Heads = existing agents (planner / executor / verifier / user-profiler).
 * - 14 specialists distributed: architecture=8, engineering=3, quality=3, analytics=0.
 * - Concurrency: architecture=serial, engineering=parallel, quality=serial_gate, analytics=parallel.
 * - The pre-existing CEO (id `d64a9f21-...`) is NOT in this list and must not be touched by sync.
 *
 * Total: 4 Heads + 14 specialists = 18 entries (matches `ls .claude/agents/`).
 */
export const AGENT_MAPPING: AgentMapping[] = [
  // ============================================================
  // ARCHITECTURE (Head: planner) — 1 head + 8 specialists, serial
  // ============================================================
  {
    slug: 'planner',
    name: 'Planner',
    title: 'Head of Architecture',
    role: 'head',
    department: 'architecture',
    isHead: true,
    managerSlug: 'ceo',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'roadmapper',
    name: 'Roadmapper',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'project-researcher',
    name: 'Project Researcher',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'phase-researcher',
    name: 'Phase Researcher',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'advisor-researcher',
    name: 'Advisor Researcher',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'assumptions-analyzer',
    name: 'Assumptions Analyzer',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'codebase-mapper',
    name: 'Codebase Mapper',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'plan-checker',
    name: 'Plan Checker',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'research-synthesizer',
    name: 'Research Synthesizer',
    title: 'Architecture Specialist',
    role: 'specialist',
    department: 'architecture',
    isHead: false,
    managerSlug: 'planner',
    parallelismPolicy: 'serial',
    desiredSkillKeys: ['paperclip'],
  },

  // ============================================================
  // ENGINEERING (Head: executor) — 1 head + 3 specialists, parallel
  // ============================================================
  {
    slug: 'executor',
    name: 'Executor',
    title: 'Head of Engineering',
    role: 'head',
    department: 'engineering',
    isHead: true,
    managerSlug: 'ceo',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'debugger',
    name: 'Debugger',
    title: 'Engineering Specialist',
    role: 'specialist',
    department: 'engineering',
    isHead: false,
    managerSlug: 'executor',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: [],
  },
  {
    slug: 'integration-checker',
    name: 'Integration Checker',
    title: 'Engineering Specialist',
    role: 'specialist',
    department: 'engineering',
    isHead: false,
    managerSlug: 'executor',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: [],
  },
  {
    slug: 'ui-researcher',
    name: 'UI Researcher',
    title: 'Engineering Specialist',
    role: 'specialist',
    department: 'engineering',
    isHead: false,
    managerSlug: 'executor',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: ['design-guide'],
  },

  // ============================================================
  // QUALITY (Head: verifier) — 1 head + 3 specialists, serial_gate
  // ============================================================
  {
    slug: 'verifier',
    name: 'Verifier',
    title: 'Head of Quality',
    role: 'head',
    department: 'quality',
    isHead: true,
    managerSlug: 'ceo',
    parallelismPolicy: 'serial_gate',
    desiredSkillKeys: ['paperclip'],
  },
  {
    slug: 'nyquist-auditor',
    name: 'Nyquist Auditor',
    title: 'Quality Specialist',
    role: 'specialist',
    department: 'quality',
    isHead: false,
    managerSlug: 'verifier',
    parallelismPolicy: 'serial_gate',
    desiredSkillKeys: [],
  },
  {
    slug: 'ui-auditor',
    name: 'UI Auditor',
    title: 'Quality Specialist',
    role: 'specialist',
    department: 'quality',
    isHead: false,
    managerSlug: 'verifier',
    parallelismPolicy: 'serial_gate',
    desiredSkillKeys: ['design-guide'],
  },
  {
    slug: 'ui-checker',
    name: 'UI Checker',
    title: 'Quality Specialist',
    role: 'specialist',
    department: 'quality',
    isHead: false,
    managerSlug: 'verifier',
    parallelismPolicy: 'serial_gate',
    desiredSkillKeys: ['design-guide'],
  },

  // ============================================================
  // ANALYTICS (Head: user-profiler) — solo, parallel
  // ============================================================
  {
    slug: 'user-profiler',
    name: 'User Profiler',
    title: 'Head of Analytics',
    role: 'head',
    department: 'analytics',
    isHead: true,
    managerSlug: 'ceo',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: ['paperclip'],
  },
];

/**
 * Skill attachment by role.
 * "ceo" sentinel resolved at import-time to the pre-existing CEO agent (id `d64a9f21-...`).
 */
export const SKILL_MAPPING: SkillMapping[] = [
  {
    slug: 'paperclip',
    name: 'Paperclip Process & Governance',
    attachedToSlugs: [
      'ceo',
      // 4 Heads
      'planner', 'executor', 'verifier', 'user-profiler',
      // 8 Architecture specialists
      'roadmapper', 'project-researcher', 'phase-researcher', 'advisor-researcher',
      'assumptions-analyzer', 'codebase-mapper', 'plan-checker', 'research-synthesizer',
    ],
  },
  {
    slug: 'company-creator',
    name: 'Company Creator',
    attachedToSlugs: ['ceo'],
  },
  {
    slug: 'design-guide',
    name: 'Design Guide',
    attachedToSlugs: ['ui-researcher', 'ui-auditor', 'ui-checker'],
  },
];

/**
 * Returns the agent mapping for the given slug, or undefined if not found.
 * Useful for cross-referencing during import.
 */
export function getAgentMappingBySlug(slug: string): AgentMapping | undefined {
  return AGENT_MAPPING.find((entry) => entry.slug === slug);
}

/**
 * Returns all specialists for a given Head's slug.
 */
export function getSpecialistsForHead(headSlug: string): AgentMapping[] {
  return AGENT_MAPPING.filter((entry) => entry.managerSlug === headSlug && !entry.isHead);
}

/**
 * Validates the mapping at module-load time.
 * Throws if invariants are broken (run via vitest or tsx import).
 */
export function validateMapping(): void {
  const slugs = new Set<string>();
  let headCount = 0;
  let specialistCount = 0;
  const departmentHeads = new Map<string, string>();

  for (const entry of AGENT_MAPPING) {
    if (slugs.has(entry.slug)) {
      throw new Error(`Duplicate slug in AGENT_MAPPING: ${entry.slug}`);
    }
    slugs.add(entry.slug);

    if (entry.isHead) {
      headCount += 1;
      if (departmentHeads.has(entry.department)) {
        throw new Error(`Multiple Heads for department ${entry.department}`);
      }
      departmentHeads.set(entry.department, entry.slug);
      if (entry.managerSlug !== 'ceo') {
        throw new Error(`Head ${entry.slug} should report to ceo, got ${entry.managerSlug}`);
      }
    } else {
      specialistCount += 1;
    }
  }

  if (AGENT_MAPPING.length !== 18) {
    throw new Error(`Expected 18 entries, got ${AGENT_MAPPING.length}`);
  }
  if (headCount !== 4) {
    throw new Error(`Expected 4 Heads, got ${headCount}`);
  }
  if (specialistCount !== 14) {
    throw new Error(`Expected 14 specialists, got ${specialistCount}`);
  }

  // Specialists must report to a Head in the same department.
  for (const entry of AGENT_MAPPING) {
    if (entry.isHead) continue;
    const head = AGENT_MAPPING.find((e) => e.slug === entry.managerSlug);
    if (!head) {
      throw new Error(`Specialist ${entry.slug} has unknown managerSlug ${entry.managerSlug}`);
    }
    if (!head.isHead) {
      throw new Error(`Specialist ${entry.slug} reports to non-Head ${head.slug}`);
    }
    if (head.department !== entry.department) {
      throw new Error(
        `Specialist ${entry.slug} (${entry.department}) reports to Head in ${head.department}`,
      );
    }
  }

  // Skill mapping references must exist.
  for (const skill of SKILL_MAPPING) {
    for (const slug of skill.attachedToSlugs) {
      if (slug === 'ceo') continue;
      if (!slugs.has(slug)) {
        throw new Error(`Skill ${skill.slug} references unknown agent ${slug}`);
      }
    }
  }
}
