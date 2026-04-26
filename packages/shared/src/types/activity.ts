export interface ActivityEvent {
  id: string;
  companyId: string;
  actorType: "agent" | "user" | "system" | "plugin";
  actorId: string;
  action: string;
  actionKey?: string | null;
  paramsJson?: Record<string, unknown> | null;
  entityType: string;
  entityId: string;
  agentId: string | null;
  runId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}
