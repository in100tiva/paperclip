---
phase: 17-funda-o-dos-agentes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/sync-agents/mapping.ts
  - scripts/sync-agents/mapping.test.ts
autonomous: true
requirements:
  - AGENT-01
  - AGENT-02

must_haves:
  truths:
    - "Desenvolvedor abre mapping.ts e vê 7 novas entradas (orchestrator-maintenance, research-doc, code-analyzer, qa-loop, supabase-executor, supabase-diagnostician, doc-before-after) com department + parallelismPolicy + managerSlug corretos conforme tabela canônica de CONTEXT.md"
    - "validateMapping() não lança erro quando AGENT_MAPPING.length=25, headCount=4, specialistCount=21"
    - "Especialistas reportando a orchestrator-maintenance (não-Head em Engineering) são aceitos pelo validateMapping() — invariante 'specialist must report to a Head' relaxado para 'specialist must report to a Head OR to orchestrator-maintenance'"
  artifacts:
    - path: "scripts/sync-agents/mapping.ts"
      provides: "AGENT_MAPPING canônico com 25 entradas e validateMapping() atualizado para 25/21"
      contains: "orchestrator-maintenance"
      min_lines: 350
    - path: "scripts/sync-agents/mapping.test.ts"
      provides: "Suite de testes do mapping com 25 agentes"
      contains: "orchestrator-maintenance"
  key_links:
    - from: "scripts/sync-agents/mapping.ts (AGENT_MAPPING)"
      to: "validateMapping() invariantes"
      via: "contagens hard-coded 25/4/21 + lookup managerSlug"
      pattern: "AGENT_MAPPING.length !== 25"
---

<objective>
Estender `scripts/sync-agents/mapping.ts` com as 7 novas entradas canônicas do milestone v1.3 e atualizar `validateMapping()` para aceitar a nova topologia (25 agentes, 21 specialists), incluindo o caso novo de specialists que reportam a outro specialist (orchestrator-maintenance é specialist em Engineering mas tem subordinados research-doc, code-analyzer, supabase-executor).

Purpose: Sem mapping atualizado, `pnpm sync-agents` (Plano 17-03) não tem fonte de verdade para criar os novos agentes. As invariantes runtime-checked (`validateMapping()`) precisam aceitar 25 agentes ANTES da execução do sync — caso contrário o script falha cedo.

Output: `mapping.ts` com 25 entradas, `validateMapping()` atualizado com invariantes 25/4/21 e suporte a specialist-reports-to-specialist (orchestrator-maintenance), suite de testes em `mapping.test.ts` cobrindo as novas entradas e o caso de hierarquia em 2 níveis dentro de Engineering.
</objective>

<execution_context>
@./.claude/framework/workflows/execute-plan.md
@./.claude/framework/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/17-funda-o-dos-agentes/17-CONTEXT.md
@.planning/research/SUMMARY.md
@scripts/sync-agents/mapping.ts
@scripts/sync-agents/types.ts

<interfaces>
<!-- Tipos canônicos extraídos de scripts/sync-agents/types.ts — executor deve usar diretamente, sem explorar codebase. -->

From scripts/sync-agents/types.ts:
```typescript
export type Department = 'architecture' | 'engineering' | 'quality' | 'analytics';
export type ParallelismPolicy = 'serial' | 'parallel' | 'serial_gate';
export type AgentRole = 'ceo' | 'head' | 'specialist';

export interface AgentMapping {
  slug: string;
  name: string;
  title: string;
  role: AgentRole;
  department: Department;
  isHead: boolean;
  managerSlug: string;
  parallelismPolicy: ParallelismPolicy;
  desiredSkillKeys: string[];
}

export const TARGET_COMPANY_ID = '4b0a1c03-b502-4f28-acfd-dfd646cd5cf6';
export const CEO_AGENT_ID = 'd64a9f21-3ad0-4ca5-b7e8-58dbefb55b75';
export const CEO_SLUG_SENTINEL = 'ceo';
```

From scripts/sync-agents/mapping.ts (current state — invariantes existentes):
```typescript
// Linhas 305-313: invariantes hard-coded que devem ser atualizadas
if (AGENT_MAPPING.length !== 18) throw new Error(`Expected 18 entries, got ${AGENT_MAPPING.length}`);
if (headCount !== 4) throw new Error(`Expected 4 Heads, got ${headCount}`);
if (specialistCount !== 14) throw new Error(`Expected 14 specialists, got ${specialistCount}`);

// Linhas 316-330: invariante "specialist must report to a Head"
// EXIGE atualização: orchestrator-maintenance é specialist mas tem 3 subordinados specialists.
// Lógica nova: specialist pode reportar a Head OU a orchestrator-maintenance (único specialist-manager permitido).
```

Tabela canônica das 7 novas entradas (de 17-CONTEXT.md):

| slug | name | title | role | department | isHead | managerSlug | parallelismPolicy | desiredSkillKeys |
|------|------|-------|------|-----------|--------|-------------|-------------------|------------------|
| orchestrator-maintenance | Orchestrator Maintenance | Engineering Specialist | specialist | engineering | false | executor | serial | [] |
| research-doc | Research Doc | Engineering Specialist | specialist | engineering | false | orchestrator-maintenance | parallel | [] |
| code-analyzer | Code Analyzer | Engineering Specialist | specialist | engineering | false | orchestrator-maintenance | parallel | [] |
| qa-loop | QA Loop | Quality Specialist | specialist | quality | false | verifier | serial_gate | [] |
| supabase-executor | Supabase Executor | Engineering Specialist | specialist | engineering | false | orchestrator-maintenance | serial | [] |
| supabase-diagnostician | Supabase Diagnostician | Quality Specialist | specialist | quality | false | verifier | parallel | [] |
| doc-before-after | Doc Before After | Analytics Specialist | specialist | analytics | false | user-profiler | parallel | [] |
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Tarefa 1: RED — escrever testes do mapping para 25 agentes</name>

  <read_first>
    - scripts/sync-agents/mapping.ts (estado atual com 18 entradas + validateMapping com invariantes 18/4/14)
    - scripts/sync-agents/types.ts (tipos AgentMapping, Department, ParallelismPolicy, AgentRole)
    - .planning/phases/17-funda-o-dos-agentes/17-CONTEXT.md (tabela canônica autoridade)
    - .planning/research/SUMMARY.md (linha 67-77 — tabela canônica de pesquisa, deve coincidir com CONTEXT.md)
  </read_first>

  <files>scripts/sync-agents/mapping.test.ts</files>

  <behavior>
    Suite de teste em vitest que valida o mapping após atualização. Casos obrigatórios:

    - Teste 1: `AGENT_MAPPING.length === 25` (era 18, +7)
    - Teste 2: contagem de heads = 4 (planner, executor, verifier, user-profiler) — INALTERADA
    - Teste 3: contagem de specialists = 21 (era 14, +7)
    - Teste 4: cada um dos 7 novos slugs existe em AGENT_MAPPING — verificar via `getAgentMappingBySlug`
    - Teste 5: para cada novo slug, asserções exatas sobre department + parallelismPolicy + managerSlug + role conforme tabela canônica:
      - orchestrator-maintenance → engineering / serial / executor / specialist
      - research-doc → engineering / parallel / orchestrator-maintenance / specialist
      - code-analyzer → engineering / parallel / orchestrator-maintenance / specialist
      - qa-loop → quality / serial_gate / verifier / specialist
      - supabase-executor → engineering / serial / orchestrator-maintenance / specialist
      - supabase-diagnostician → quality / parallel / verifier / specialist
      - doc-before-after → analytics / parallel / user-profiler / specialist
    - Teste 6: `validateMapping()` não lança quando chamado (smoke — invariantes 25/4/21 satisfeitos)
    - Teste 7: caso de hierarquia 2-níveis em Engineering — `getSpecialistsForHead('orchestrator-maintenance')` retorna exatamente [research-doc, code-analyzer, supabase-executor] (3 entradas, ordem irrelevante; usar `expect.arrayContaining`)
    - Teste 8: regressão — slugs existentes da v1.2 ainda presentes (planner, executor, verifier, user-profiler, debugger, integration-checker, ui-researcher) — apenas spot-check para garantir que não foram removidos acidentalmente
    - Teste 9: SKILL_MAPPING preservado byte-for-byte (paperclip ainda anexado aos 13 mesmos slugs do v1.2; design-guide ainda anexado a ui-researcher/ui-auditor/ui-checker; company-creator ainda em ceo apenas) — spot-check de tamanhos: paperclip.attachedToSlugs.length === 13, design-guide.attachedToSlugs.length === 3
  </behavior>

  <action>
    Criar `scripts/sync-agents/mapping.test.ts` com vitest. Importe via:

    ```typescript
    import { describe, it, expect } from 'vitest';
    import { AGENT_MAPPING, SKILL_MAPPING, validateMapping, getAgentMappingBySlug, getSpecialistsForHead } from './mapping.js';
    ```

    Estrutura sugerida:

    ```typescript
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
        { slug: 'orchestrator-maintenance', department: 'engineering', parallelismPolicy: 'serial', managerSlug: 'executor' },
        { slug: 'research-doc',             department: 'engineering', parallelismPolicy: 'parallel', managerSlug: 'orchestrator-maintenance' },
        { slug: 'code-analyzer',            department: 'engineering', parallelismPolicy: 'parallel', managerSlug: 'orchestrator-maintenance' },
        { slug: 'qa-loop',                  department: 'quality',     parallelismPolicy: 'serial_gate', managerSlug: 'verifier' },
        { slug: 'supabase-executor',        department: 'engineering', parallelismPolicy: 'serial', managerSlug: 'orchestrator-maintenance' },
        { slug: 'supabase-diagnostician',   department: 'quality',     parallelismPolicy: 'parallel', managerSlug: 'verifier' },
        { slug: 'doc-before-after',         department: 'analytics',   parallelismPolicy: 'parallel', managerSlug: 'user-profiler' },
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
    ```

    Após criar o arquivo, execute o teste e confirme RED — todos os testes do `describe('AGENT_MAPPING (v1.3 — 25 agents)')` devem falhar (mapping ainda tem 18 entradas e validateMapping ainda exige 18/4/14). Os testes do SKILL_MAPPING devem passar imediatamente (não mexem no estado novo).
  </action>

  <verify>
    <automated>cd /home/tech-lead/Documentos/DEV/paperclip-master && npx vitest run scripts/sync-agents/mapping.test.ts 2>&1 | tee /tmp/17-01-task1-red.log; grep -E "FAIL|✗|expected 18 to be 25" /tmp/17-01-task1-red.log</automated>
  </verify>

  <acceptance_criteria>
    - Arquivo `scripts/sync-agents/mapping.test.ts` existe (verificável: `[ -f scripts/sync-agents/mapping.test.ts ]`)
    - Arquivo importa de `./mapping.js` (grep: `grep -q "from './mapping.js'" scripts/sync-agents/mapping.test.ts`)
    - Arquivo contém os 7 novos slugs literalmente (grep: `for slug in orchestrator-maintenance research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do grep -q "$slug" scripts/sync-agents/mapping.test.ts || echo MISSING:$slug; done` — saída vazia esperada)
    - Vitest reporta pelo menos 1 falha contendo "expected 18 to be 25" OU "Expected 18 entries, got 18" antes da Tarefa 2 (RED state)
    - Commit criado com prefixo `test(17-01): add failing test for v1.3 mapping (25 agents)`
  </acceptance_criteria>

  <done>
    Suite de teste em RED. Pelo menos 5 dos casos `it.each` falham + `'has 25 entries total'` falha + `'validateMapping() does not throw under v1.3 invariants'` falha. SKILL_MAPPING tests passam (estado v1.2 preservado).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Tarefa 2: GREEN — adicionar 7 entradas ao AGENT_MAPPING e atualizar validateMapping()</name>

  <read_first>
    - scripts/sync-agents/mapping.ts (estado atual completo, 342 linhas — atenção a comentários de seção, ordem dos blocos por departamento, formato exato de cada entrada)
    - scripts/sync-agents/mapping.test.ts (criado na Tarefa 1 — autoridade dos valores)
    - .planning/phases/17-funda-o-dos-agentes/17-CONTEXT.md (tabela canônica autoridade)
  </read_first>

  <files>scripts/sync-agents/mapping.ts</files>

  <behavior>
    Após esta tarefa, todos os testes da Tarefa 1 passam GREEN. Mudanças exigidas:

    1. Adicionar 7 entradas a `AGENT_MAPPING` com valores literais conforme tabela canônica
    2. Atualizar comentário de cabeçalho do array (linhas 3-14) — corrigir contagens 18→25, 14→21
    3. Atualizar comentários de seção por departamento — Engineering "1 head + 3 specialists" → "1 head + 7 specialists" (3 v1.2 + orchestrator-maintenance + research-doc + code-analyzer + supabase-executor); Quality "1 head + 3 specialists" → "1 head + 5 specialists" (3 v1.2 + qa-loop + supabase-diagnostician); Analytics "solo" → "1 head + 1 specialist" (doc-before-after)
    4. Atualizar `validateMapping()`:
       - Linha 305: `AGENT_MAPPING.length !== 18` → `!== 25`
       - Linha 308: erro string idem
       - Linha 311: `specialistCount !== 14` → `!== 21`
       - Linha 312: erro string idem
       - Loop de validação specialist→manager (linhas 316-330): aceitar specialist reportando a outro specialist EXCLUSIVAMENTE quando o manager é `orchestrator-maintenance`. Implementação: depois de encontrar `head = AGENT_MAPPING.find((e) => e.slug === entry.managerSlug)`, em vez de exigir `head.isHead === true`, exigir: `head.isHead === true OR head.slug === 'orchestrator-maintenance'`. Manter a checagem de `head.department === entry.department` (todos os 3 subordinados de orchestrator-maintenance estão em engineering, mesmo dele).
  </behavior>

  <action>
    Editar `scripts/sync-agents/mapping.ts` aplicando as 4 mudanças do bloco `<behavior>`. Valores literais a adicionar ao final do array (preservar ordem por departamento, dentro de cada departamento adicionar APÓS specialists v1.2):

    ```typescript
    // Adicionar dentro do bloco ENGINEERING (após ui-researcher, linha ~165, antes do comentário QUALITY):
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

    // Adicionar dentro do bloco QUALITY (após ui-checker, linha ~213, antes do comentário ANALYTICS):
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

    // Adicionar dentro do bloco ANALYTICS (após user-profiler, linha ~228, antes do `];` final):
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
    ```

    Atualizar `validateMapping()` — substituir o bloco da invariante de contagem (linhas 305-313):

    ```typescript
    if (AGENT_MAPPING.length !== 25) {
      throw new Error(`Expected 25 entries, got ${AGENT_MAPPING.length}`);
    }
    if (headCount !== 4) {
      throw new Error(`Expected 4 Heads, got ${headCount}`);
    }
    if (specialistCount !== 21) {
      throw new Error(`Expected 21 specialists, got ${specialistCount}`);
    }
    ```

    Substituir o loop de validação specialist→manager (linhas 316-330) por:

    ```typescript
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
    ```

    Atualizar comentário de cabeçalho do `AGENT_MAPPING` (linhas 3-14) substituindo:
    - "all 18 framework agents" → "all 25 framework agents (18 from v1.2 + 7 from v1.3 maintenance pipeline)"
    - "14 specialists distributed: architecture=8, engineering=3, quality=3, analytics=0" → "21 specialists distributed: architecture=8, engineering=7, quality=5, analytics=1"
    - "4 Heads + 14 specialists = 18 entries" → "4 Heads + 21 specialists = 25 entries"

    Atualizar comentários de seção:
    - Engineering: "1 head + 3 specialists, parallel" → "1 head + 7 specialists (mixed policies — orchestrator-maintenance manages 3 sub-specialists)"
    - Quality: "1 head + 3 specialists, serial_gate" → "1 head + 5 specialists (mixed policies)"
    - Analytics: "solo, parallel" → "1 head + 1 specialist (doc-before-after), parallel"

    SKILL_MAPPING permanece INTACTO (zero mudanças — os 7 novos agentes têm `desiredSkillKeys: []`, não recebem skills nesta fase; skill `supabase-mcp` é deferida para Fase 20 conforme 17-CONTEXT.md `<deferred>`).

    Após aplicar todas as mudanças, executar a suite de testes — DEVE ficar GREEN.
  </action>

  <verify>
    <automated>cd /home/tech-lead/Documentos/DEV/paperclip-master && npx vitest run scripts/sync-agents/mapping.test.ts 2>&1 | tee /tmp/17-01-task2-green.log; grep -E "Test Files.*passed|✓ AGENT_MAPPING" /tmp/17-01-task2-green.log; grep -cE "^✗|FAIL " /tmp/17-01-task2-green.log</automated>
  </verify>

  <acceptance_criteria>
    - Vitest output contém "Test Files  1 passed" OU "passed" sem nenhum "FAIL" / "✗"
    - `grep -c "slug: '" scripts/sync-agents/mapping.ts` retorna 25 (vs 18 antes)
    - `grep -c "AGENT_MAPPING.length !== 25" scripts/sync-agents/mapping.ts` retorna 1
    - `grep -c "specialistCount !== 21" scripts/sync-agents/mapping.ts` retorna 1
    - `grep -c "ALLOWED_SPECIALIST_MANAGER = 'orchestrator-maintenance'" scripts/sync-agents/mapping.ts` retorna 1
    - Cada um dos 7 novos slugs aparece exatamente 1x como `slug: '<slug>'` (grep `grep -c "slug: 'orchestrator-maintenance'" scripts/sync-agents/mapping.ts` == 1, idem para os outros 6)
    - Typecheck passa: `cd /home/tech-lead/Documentos/DEV/paperclip-master && pnpm --filter @paperclipai/* typecheck 2>&1 | grep -v "pre-existing" | grep -E "error TS" | wc -l` retorna 0 (ou apenas erros pré-existentes documentados em STATE.md como `services/recovery/service.ts:459` baseline)
    - Commit criado com prefixo `feat(17-01): register 7 v1.3 agents in mapping.ts (25 total)`
  </acceptance_criteria>

  <done>
    Suite GREEN. AGENT_MAPPING tem 25 entradas, validateMapping() aceita 25/4/21 + specialist-reports-to-orchestrator-maintenance. Comentários atualizados. SKILL_MAPPING preservado.
  </done>
</task>

</tasks>

<verification>
Após ambas as tarefas:

```bash
# 1. Suite completa GREEN
cd /home/tech-lead/Documentos/DEV/paperclip-master && npx vitest run scripts/sync-agents/mapping.test.ts

# 2. validateMapping() invocável de tsx sem throw
cd /home/tech-lead/Documentos/DEV/paperclip-master && npx tsx -e "import('./scripts/sync-agents/mapping.ts').then(m => { m.validateMapping(); console.log('OK:', m.AGENT_MAPPING.length, 'agents'); })"
# Esperado: "OK: 25 agents"

# 3. Cobertura literal de slugs
for slug in orchestrator-maintenance research-doc code-analyzer qa-loop supabase-executor supabase-diagnostician doc-before-after; do
  count=$(grep -c "slug: '$slug'" scripts/sync-agents/mapping.ts)
  [ "$count" = "1" ] && echo "OK $slug" || echo "MISMATCH $slug count=$count"
done
```
</verification>

<success_criteria>
- AGENT_MAPPING tem 25 entradas (18 v1.2 + 7 v1.3) verificável via `grep -c "slug: '"`
- validateMapping() não lança quando invocado via tsx — verificável via comando node tsx em `<verification>` retorna "OK: 25 agents"
- Suite mapping.test.ts 100% GREEN (todos os casos `it.each` + smoke + spot-check + SKILL_MAPPING preservation)
- 7 novos slugs com department/parallelismPolicy/managerSlug exatos conforme tabela canônica
- SKILL_MAPPING byte-equivalente ao v1.2 (zero mudanças nesta fase — skill supabase-mcp é Fase 20)
- 2 commits atômicos (test RED + feat GREEN)
- Typecheck preserva apenas baseline pré-existente
</success_criteria>

<output>
After completion, create `.planning/phases/17-funda-o-dos-agentes/17-01-SUMMARY.md`
</output>
