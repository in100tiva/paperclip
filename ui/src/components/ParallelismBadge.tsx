import { cn } from "../lib/utils";

export type ParallelismPolicy = "serial" | "parallel" | "serial_gate";

interface ParallelismBadgeProps {
  /** The policy value, typically read from `agent.metadata.parallelismPolicy`. */
  policy: ParallelismPolicy | string | null | undefined;
  /** Optional className to override sizing/spacing. */
  className?: string;
}

const POLICY_STYLES: Record<string, { label: string; cls: string }> = {
  serial: {
    label: "Serial",
    cls: "border-amber-300/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  parallel: {
    label: "Parallel",
    cls: "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  serial_gate: {
    label: "Gate",
    cls: "border-purple-300/50 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
};

/**
 * Renders a small badge indicating an agent's parallelism policy.
 *
 * Reads `agent.metadata.parallelismPolicy` set by `pnpm sync-agents` (Phase 13).
 * - `serial`: agent must run one issue at a time (Architecture, planning).
 * - `parallel`: agent can run concurrent issues across workspaces (Engineering).
 * - `serial_gate`: serial gate after engineering (Quality, verification).
 *
 * Renders nothing when policy is null/undefined/unknown — agents created before
 * the framework sync (e.g. pre-existing CEO/CTO) gracefully skip the badge.
 */
export function ParallelismBadge({ policy, className }: ParallelismBadgeProps) {
  if (!policy) return null;
  const style = POLICY_STYLES[policy];
  if (!style) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap",
        style.cls,
        className,
      )}
      title={`Parallelism: ${style.label}`}
    >
      {style.label}
    </span>
  );
}
