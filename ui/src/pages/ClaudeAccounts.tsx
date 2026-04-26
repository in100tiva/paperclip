import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Power } from "lucide-react";
import {
  claudeAccountsApi,
  type ClaudeAccount,
  type ClaudeAccountScope,
  type ClaudeAccountStatus,
} from "@/api/claude-accounts";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";

/**
 * MULTI-09 (Phase 5) — Claude Accounts management page (D-25..29).
 *
 * Lists the company's Claude account pool, lets owner/admin register new
 * accounts (slug points at `~/.paperclip/claude-accounts/<slug>/`), toggle
 * status between live/disabled, and review the rotation history sourced from
 * the activity log (claude_account_rotated events from 05-03/05-04).
 *
 * Permissions are enforced server-side; this UI surfaces 403 errors via toast
 * but does not pre-hide controls — the operator gets clear feedback when they
 * lack the role.
 */

const SLUG_PATTERN = "^[a-z0-9][a-z0-9-]{0,62}$";

const STATUS_VARIANT: Record<ClaudeAccountStatus, "default" | "secondary" | "destructive" | "outline"> = {
  live: "default",
  exhausted: "destructive",
  cooldown: "secondary",
  disabled: "outline",
};

const STATUS_LABEL: Record<ClaudeAccountStatus, string> = {
  live: "Live",
  exhausted: "Exhausted",
  cooldown: "Cooldown",
  disabled: "Disabled",
};

function StatusBadge({ status }: { status: ClaudeAccountStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} data-status={status}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

export function ClaudeAccounts() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  // Phase 6 / D-05 / PROJ-02 — scope choice on register
  const [newScope, setNewScope] = useState<ClaudeAccountScope>("company");

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Settings", href: "/company/settings" },
      { label: "Claude Accounts" },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs]);

  const accountsKey = ["claude-accounts", "list", selectedCompanyId ?? ""] as const;
  const historyKey = ["claude-accounts", "rotation-history", selectedCompanyId ?? ""] as const;
  // Phase 6 / D-10 / PROJ-03 — cost summary aggregation
  const costsKey = ["claude-accounts", "cost-summary", selectedCompanyId ?? ""] as const;

  const accountsQuery = useQuery({
    queryKey: accountsKey,
    queryFn: () => claudeAccountsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const historyQuery = useQuery({
    queryKey: historyKey,
    queryFn: () => claudeAccountsApi.rotationHistory(selectedCompanyId!, 50),
    enabled: Boolean(selectedCompanyId),
  });

  const costsQuery = useQuery({
    queryKey: costsKey,
    queryFn: () => claudeAccountsApi.costSummary(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const createMutation = useMutation({
    mutationFn: (input: {
      label: string;
      configDirSlug: string;
      scope: ClaudeAccountScope;
    }) => claudeAccountsApi.create(selectedCompanyId!, input),
    onSuccess: async () => {
      pushToast({
        title: "Claude account registered",
        body: "Run `claude login` inside the slug directory to activate the new account.",
        tone: "success",
      });
      setNewLabel("");
      setNewSlug("");
      setNewScope("company");
      await queryClient.invalidateQueries({ queryKey: accountsKey });
    },
    onError: (err) => {
      pushToast({
        title: "Failed to register Claude account",
        body: err instanceof Error ? err.message : "Unknown error",
        tone: "error",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { accountId: string; status: ClaudeAccountStatus }) =>
      claudeAccountsApi.patch(selectedCompanyId!, input.accountId, { status: input.status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountsKey });
    },
    onError: (err) => {
      pushToast({
        title: "Failed to update Claude account",
        body: err instanceof Error ? err.message : "Unknown error",
        tone: "error",
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = newLabel.trim();
    const configDirSlug = newSlug.trim();
    if (!label || !configDirSlug) return;
    createMutation.mutate({ label, configDirSlug, scope: newScope });
  }

  if (!selectedCompanyId) {
    return (
      <div className="text-sm text-muted-foreground">Select a company to manage Claude accounts.</div>
    );
  }

  if (accountsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading Claude accounts…</div>;
  }

  if (accountsQuery.error) {
    const message =
      accountsQuery.error instanceof ApiError && accountsQuery.error.status === 403
        ? "You do not have permission to view Claude accounts for this company."
        : accountsQuery.error instanceof Error
          ? accountsQuery.error.message
          : "Failed to load Claude accounts.";
    return <div className="text-sm text-destructive">{message}</div>;
  }

  const accounts = accountsQuery.data?.accounts ?? [];
  const historyEntries = historyQuery.data?.entries ?? [];

  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Claude Accounts</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage the pool of Claude Code accounts available to this company. Agents rotate
          across live accounts when one hits a 429 quota window.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Register account</h2>
          <p className="text-sm text-muted-foreground">
            Reserve a slot in the pool. After saving, run <code className="rounded bg-muted px-1">claude login</code>
            {" "}inside <code className="rounded bg-muted px-1">~/.paperclip/claude-accounts/&lt;slug&gt;/</code> on
            the host machine to seed credentials.
          </p>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1 text-sm">
              <span className="block text-xs font-medium text-muted-foreground">Label</span>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Account A"
                required
                maxLength={100}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                data-testid="claude-account-label"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="block text-xs font-medium text-muted-foreground">Config dir slug</span>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="a"
                required
                pattern={SLUG_PATTERN}
                title="Lowercase letters, digits, dashes; 1-63 chars; must start with a letter or digit"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                data-testid="claude-account-slug"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Registering…" : "Register"}
              </Button>
            </div>
          </div>
          {/* Phase 6 / D-05 / PROJ-02 — scope radio */}
          <div className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Scope</span>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="company"
                  checked={newScope === "company"}
                  onChange={() => setNewScope("company")}
                  data-testid="scope-company"
                />
                This company only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="shared"
                  checked={newScope === "shared"}
                  onChange={() => setNewScope("shared")}
                  data-testid="scope-shared"
                />
                Shared with all companies (in shared mode)
              </label>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold">Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Round-robin pool sorted by last-used. Disabled accounts stay out of rotation.
          </p>
        </div>
        {accounts.length === 0 ? (
          <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">
            No Claude accounts registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Label</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Slug</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Scope</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Last used</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Exhausted until</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <ClaudeAccountRow
                    key={account.id}
                    account={account}
                    onToggle={(nextStatus) =>
                      toggleMutation.mutate({ accountId: account.id, status: nextStatus })
                    }
                    pending={toggleMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Phase 6 / D-10 / D-12 / PROJ-03 — Cost summary aggregated per Claude account */}
      <section className="rounded-xl border border-border">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold">Cost summary</h2>
          <p className="text-sm text-muted-foreground">
            Aggregated spend per Claude account for this company. Default range: since
            current month start.
          </p>
        </div>
        {costsQuery.isLoading ? (
          <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">
            Loading cost summary…
          </div>
        ) : !costsQuery.data || costsQuery.data.rows.length === 0 ? (
          <div
            className="border-t border-border px-5 py-8 text-sm text-muted-foreground"
            data-testid="costs-empty"
          >
            No usage recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="min-w-full text-left text-sm" data-testid="costs-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Account</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Cost (USD)
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Input tokens
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Output tokens
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Steps
                  </th>
                </tr>
              </thead>
              <tbody>
                {costsQuery.data.rows.map((row) => (
                  <tr
                    key={row.accountId}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-5 py-3">{row.accountLabel}</td>
                    <td className="px-5 py-3 text-right">
                      ${row.totalCostUsd.toFixed(4)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.totalInputTokens.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.totalOutputTokens.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">{row.stepCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold">Rotation history</h2>
          <p className="text-sm text-muted-foreground">
            Last 50 swap events emitted by the heartbeat. Strategy column reflects whether
            the resume worked or fell back to a full-context re-prompt.
          </p>
        </div>
        {historyQuery.isLoading ? (
          <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">
            Loading rotation history…
          </div>
        ) : historyEntries.length === 0 ? (
          <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">
            No rotations recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {historyEntries.map((entry) => {
              const details = entry.details;
              return (
                <li key={entry.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-muted-foreground">{formatTimestamp(entry.createdAt)}</span>
                    <span>
                      Agent <code>{shortId(details?.agentId ?? entry.agentId)}</code> swapped{" "}
                      <code>{shortId(details?.fromAccountId)}</code> →{" "}
                      <code>{shortId(details?.toAccountId)}</code>
                    </span>
                    {details?.reason ? (
                      <Badge variant="outline">{details.reason}</Badge>
                    ) : null}
                    {details?.errorFamily ? (
                      <Badge variant="secondary">{details.errorFamily}</Badge>
                    ) : null}
                    {details?.swapStrategy ? (
                      <Badge variant="outline">strategy: {details.swapStrategy}</Badge>
                    ) : null}
                    {details?.swapStatus ? (
                      <Badge variant={details.swapStatus === "succeeded" ? "default" : "destructive"}>
                        {details.swapStatus}
                      </Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ClaudeAccountRow({
  account,
  onToggle,
  pending,
}: {
  account: ClaudeAccount;
  onToggle: (nextStatus: ClaudeAccountStatus) => void;
  pending: boolean;
}) {
  const isDisabled = account.status === "disabled";
  const nextStatus: ClaudeAccountStatus = isDisabled ? "live" : "disabled";
  const actionLabel = isDisabled ? "Enable" : "Disable";
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-5 py-3 align-top">{account.label}</td>
      <td className="px-5 py-3 align-top">
        <code>{account.configDirSlug}</code>
      </td>
      <td className="px-5 py-3 align-top" data-testid={`scope-cell-${account.id}`}>
        {account.scope === "shared" ? (
          <Badge variant="secondary" data-scope="shared">
            shared
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground" data-scope="company">
            company
          </span>
        )}
      </td>
      <td className="px-5 py-3 align-top">
        <StatusBadge status={account.status} />
      </td>
      <td className="px-5 py-3 align-top text-muted-foreground">
        {formatTimestamp(account.lastUsedAt)}
      </td>
      <td className="px-5 py-3 align-top text-muted-foreground">
        {formatTimestamp(account.exhaustedUntil)}
      </td>
      <td className="px-5 py-3 text-right align-top">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggle(nextStatus)}
          disabled={pending}
          data-testid={`claude-account-toggle-${account.id}`}
        >
          <Power className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      </td>
    </tr>
  );
}
