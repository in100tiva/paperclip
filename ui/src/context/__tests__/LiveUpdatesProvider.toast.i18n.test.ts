import { describe, it } from "vitest";

/**
 * Phase 10-03 — LiveUpdatesProvider toast i18n probe.
 *
 * Wave 0 skeleton. Tarefa 1 promotes each it.todo to a real assertion
 * after the LiveUpdatesProvider refactor lands (tRef pattern + 4 builders
 * receiving TFunction as last param).
 */
describe("LiveUpdatesProvider toast i18n (AGENT-MSG-04)", () => {
  it.todo("buildAgentStatusToast returns 'X com erro' in pt-BR");
  it.todo("buildRunStatusToast returns 'Execução de X falhou' in pt-BR");
  it.todo("buildActivityToast returns '{actor} criou {ref}' in pt-BR");
  it.todo("buildJoinRequestToast returns 'Um agente quer entrar' in pt-BR");
  it.todo(
    "language change does not trigger socket reconnect (closeSocketQuietly NOT called)",
  );
});
