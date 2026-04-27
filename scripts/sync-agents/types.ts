/**
 * Canonical types for the framework agents → in100tiva paperclip employees sync.
 *
 * Decisions in `.planning/phases/12-mapping-schema-decisions/12-CONTEXT.md`:
 * - Heads = reuse of existing framework agents (planner / executor / verifier / user-profiler).
 * - Department + parallelismPolicy persisted in `agents.metadata` JSON (column already exists).
 * - Hierarchy persisted via `agents.reports_to` UUID (column already exists).
 * - Role bucket persisted via `agents.role` text (column already exists, default 'general').
 * - Skill attachment via `adapter_config.desiredSkillKeys: string[]`.
 */

export type Department = 'architecture' | 'engineering' | 'quality' | 'analytics';
export type ParallelismPolicy = 'serial' | 'parallel' | 'serial_gate';
export type AgentRole = 'ceo' | 'head' | 'specialist';

export interface AgentMapping {
  /** Slug from .claude/agents/{slug}.md filename (without extension). */
  slug: string;
  /** Display name written to `agents.name` (e.g. "Planner"). */
  name: string;
  /** Title written to `agents.title` (e.g. "Head of Architecture"). */
  title: string;
  /** Internal role bucket written to `agents.role`. */
  role: AgentRole;
  /** Department for `agents.metadata.department`. */
  department: Department;
  /** Whether this agent is the Head of its department. */
  isHead: boolean;
  /** Slug of the manager agent. "ceo" resolves to the pre-existing CEO at import time. */
  managerSlug: string;
  /** Concurrency policy for `agents.metadata.parallelismPolicy`. */
  parallelismPolicy: ParallelismPolicy;
  /** Skill keys for `agents.adapter_config.desiredSkillKeys`. */
  desiredSkillKeys: string[];
}

export interface SkillMapping {
  /** Skill directory name under `.claude/skills/{slug}/`. */
  slug: string;
  /** Human-readable skill name. */
  name: string;
  /** Slugs of agents that should have this skill attached.
   *  "ceo" is a sentinel resolved at import-time to the pre-existing CEO agent. */
  attachedToSlugs: string[];
}

/** Pre-existing CEO and target company in the live Supabase database. */
export const TARGET_COMPANY_ID = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6';
export const CEO_AGENT_ID = 'd64a9f21-3ad0-4ca5-b7e8-58dbefb55b75';
export const CEO_SLUG_SENTINEL = 'ceo';
