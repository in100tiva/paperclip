import { describe, it, expect } from 'vitest';
import { AGENT_MAPPING, SKILL_MAPPING, validateMapping, getAgentMappingBySlug, getSpecialistsForHead } from './mapping.js';

describe('AGENT_MAPPING (v1.3 — 25 agents)', () => {
  it('has 25 entries total', () => {
    expect(AGENT_MAPPING.length).toBe(25);
  });

  it('has 4 heads (unchanged from v1.2)', () => {
    const heads = AGENT_MAPPING.filter((e) => e.isHead);
    expect(heads).toHaveLength(4);
    expect(heads.map((h) => h.slug).sort()).toEqual(['executor', 'planner', 'user-profiler', 'verifier']);
  });

  it('has 21 specialists (was 14 in v1.2, +7)', () => {
    expect(AGENT_MAPPING.filter((e) => !e.isHead)).toHaveLength(21);
  });

  const NEW_AGENTS_TABLE = [
    { slug: 'orchestrator-maintenance', department: 'engineering', parallelismPolicy: 'serial',      managerSlug: 'executor' },
    { slug: 'research-doc',             department: 'engineering', parallelismPolicy: 'parallel',    managerSlug: 'orchestrator-maintenance' },
    { slug: 'code-analyzer',            department: 'engineering', parallelismPolicy: 'parallel',    managerSlug: 'orchestrator-maintenance' },
    { slug: 'qa-loop',                  department: 'quality',     parallelismPolicy: 'serial_gate', managerSlug: 'verifier' },
    { slug: 'supabase-executor',        department: 'engineering', parallelismPolicy: 'serial',      managerSlug: 'orchestrator-maintenance' },
    { slug: 'supabase-diagnostician',   department: 'quality',     parallelismPolicy: 'parallel',    managerSlug: 'verifier' },
    { slug: 'doc-before-after',         department: 'analytics',   parallelismPolicy: 'parallel',    managerSlug: 'user-profiler' },
  ] as const;

  it.each(NEW_AGENTS_TABLE)('registers $slug with correct department/policy/manager', (row) => {
    const entry = getAgentMappingBySlug(row.slug);
    expect(entry).toBeDefined();
    expect(entry!.department).toBe(row.department);
    expect(entry!.parallelismPolicy).toBe(row.parallelismPolicy);
    expect(entry!.managerSlug).toBe(row.managerSlug);
    expect(entry!.role).toBe('specialist');
    expect(entry!.isHead).toBe(false);
  });

  it('validateMapping() does not throw under v1.3 invariants', () => {
    expect(() => validateMapping()).not.toThrow();
  });

  it('orchestrator-maintenance has 3 direct reports (research-doc, code-analyzer, supabase-executor)', () => {
    const reports = getSpecialistsForHead('orchestrator-maintenance').map((e) => e.slug);
    expect(reports).toEqual(expect.arrayContaining(['research-doc', 'code-analyzer', 'supabase-executor']));
    expect(reports).toHaveLength(3);
  });

  it('preserves v1.2 spot-check slugs', () => {
    for (const slug of ['planner', 'executor', 'verifier', 'user-profiler', 'debugger', 'integration-checker', 'ui-researcher']) {
      expect(getAgentMappingBySlug(slug)).toBeDefined();
    }
  });
});

describe('SKILL_MAPPING (v1.3 — unchanged from v1.2)', () => {
  it('paperclip skill still attached to 13 agents', () => {
    const paperclip = SKILL_MAPPING.find((s) => s.slug === 'paperclip')!;
    expect(paperclip.attachedToSlugs).toHaveLength(13);
  });

  it('design-guide skill still attached to 3 agents', () => {
    const design = SKILL_MAPPING.find((s) => s.slug === 'design-guide')!;
    expect(design.attachedToSlugs).toHaveLength(3);
  });

  it('company-creator skill still attached only to ceo', () => {
    const creator = SKILL_MAPPING.find((s) => s.slug === 'company-creator')!;
    expect(creator.attachedToSlugs).toEqual(['ceo']);
  });
});
