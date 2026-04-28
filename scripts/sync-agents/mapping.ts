import type { AgentMapping, SkillMapping } from './types.js';

/**
 * Canonical mapping of all 25 framework agents in `.claude/agents/*.md`
 * to their paperclip employee identity in the in100tiva company.
 *
 * Decisions captured in `.planning/phases/12-mapping-schema-decisions/12-CONTEXT.md`:
 * - 4 Heads = existing agents (planner / executor / verifier / user-profiler).
 * - 21 specialists distributed: architecture=8, engineering=7, quality=5, analytics=1.
 * - Concurrency: architecture=serial, engineering=mixed, quality=mixed, analytics=parallel.
 * - The pre-existing CEO (id `d64a9f21-...`) is NOT in this list and must not be touched by sync.
 *
 * Total: 4 Heads + 21 specialists = 25 entries (18 from v1.2 + 7 from v1.3 maintenance pipeline).
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
  // ENGINEERING (Head: executor) — 1 head + 7 specialists
  // (mixed policies — orchestrator-maintenance manages 3 sub-specialists)
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
  {
    slug: 'orchestrator-maintenance',
    name: 'Orchestrator Maintenance',
    title: 'Engineering Specialist',
    role: 'specialist',
    department: 'engineering',
    isHead: false,
    managerSlug: 'executor',
    parallelismPolicy: 'serial',
    desiredSkillKeys: [],
  },
  {
    slug: 'research-doc',
    name: 'Research Doc',
    title: 'Engineering Specialist',
    role: 'specialist',
    department: 'engineering',
    isHead: false,
    managerSlug: 'orchestrator-maintenance',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: [],
  },
  {
    slug: 'code-analyzer',
    name: 'Code Analyzer',
    title: 'Engineering Specialist',
    role: 'specialist',
    department: 'engineering',
    isHead: false,
    managerSlug: 'orchestrator-maintenance',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: [],
  },
  {
    slug: 'supabase-executor',
    name: 'Supabase Executor',
    title: 'Engineering Specialist',
    role: 'specialist',
    department: 'engineering',
    isHead: false,
    managerSlug: 'orchestrator-maintenance',
    parallelismPolicy: 'serial',
    desiredSkillKeys: [],
  },

  // ============================================================
  // QUALITY (Head: verifier) — 1 head + 5 specialists (mixed policies)
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
  {
    slug: 'qa-loop',
    name: 'QA Loop',
    title: 'Quality Specialist',
    role: 'specialist',
    department: 'quality',
    isHead: false,
    managerSlug: 'verifier',
    parallelismPolicy: 'serial_gate',
    desiredSkillKeys: [],
  },
  {
    slug: 'supabase-diagnostician',
    name: 'Supabase Diagnostician',
    title: 'Quality Specialist',
    role: 'specialist',
    department: 'quality',
    isHead: false,
    managerSlug: 'verifier',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: [],
  },

  // ============================================================
  // ANALYTICS (Head: user-profiler) — 1 head + 1 specialist (doc-before-after), parallel
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
  {
    slug: 'doc-before-after',
    name: 'Doc Before After',
    title: 'Analytics Specialist',
    role: 'specialist',
    department: 'analytics',
    isHead: false,
    managerSlug: 'user-profiler',
    parallelismPolicy: 'parallel',
    desiredSkillKeys: [],
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

  if (AGENT_MAPPING.length !== 25) {
    throw new Error(`Expected 25 entries, got ${AGENT_MAPPING.length}`);
  }
  if (headCount !== 4) {
    throw new Error(`Expected 4 Heads, got ${headCount}`);
  }
  if (specialistCount !== 21) {
    throw new Error(`Expected 21 specialists, got ${specialistCount}`);
  }

  // Specialists must report to a Head in the same department,
  // OR to orchestrator-maintenance (the single specialist-manager allowed in v1.3).
  const ALLOWED_SPECIALIST_MANAGER = 'orchestrator-maintenance';
  for (const entry of AGENT_MAPPING) {
    if (entry.isHead) continue;
    const manager = AGENT_MAPPING.find((e) => e.slug === entry.managerSlug);
    if (!manager) {
      throw new Error(`Specialist ${entry.slug} has unknown managerSlug ${entry.managerSlug}`);
    }
    const managerIsHead = manager.isHead;
    const managerIsAllowedSpecialist = manager.slug === ALLOWED_SPECIALIST_MANAGER;
    if (!managerIsHead && !managerIsAllowedSpecialist) {
      throw new Error(
        `Specialist ${entry.slug} reports to non-Head ${manager.slug} (only Heads or '${ALLOWED_SPECIALIST_MANAGER}' allowed)`,
      );
    }
    if (manager.department !== entry.department) {
      throw new Error(
        `Specialist ${entry.slug} (${entry.department}) reports to manager in ${manager.department}`,
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
