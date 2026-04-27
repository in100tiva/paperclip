import { cn } from "../lib/utils";
import { statusBadge, statusBadgeDefault } from "../lib/status-colors";

interface StatusBadgeProps {
  status: string;
  /**
   * Optional translated label. When provided, replaces the legacy
   * `status.replace(/_/g, " ")` rendering. Consumers that have not
   * migrated to t() (issues, runs, workspaces, DesignGuide) continue
   * to work via the fallback.
   */
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        statusBadge[status] ?? statusBadgeDefault
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
