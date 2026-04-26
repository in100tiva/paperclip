import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { accessApi } from "../api/access";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { translateApiError } from "@/lib/translateApiError";

export function CliAuthPage() {
  const { t } = useTranslation(["auth", "common"]);
  const queryClient = useQueryClient();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const challengeId = (params.id ?? "").trim();
  const token = (searchParams.get("token") ?? "").trim();
  const currentPath = useMemo(
    () => `/cli-auth/${encodeURIComponent(challengeId)}${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    [challengeId, token],
  );

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });
  const challengeQuery = useQuery({
    queryKey: ["cli-auth-challenge", challengeId, token],
    queryFn: () => accessApi.getCliAuthChallenge(challengeId, token),
    enabled: challengeId.length > 0 && token.length > 0,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: () => accessApi.approveCliAuthChallenge(challengeId, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await challengeQuery.refetch();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => accessApi.cancelCliAuthChallenge(challengeId, token),
    onSuccess: async () => {
      await challengeQuery.refetch();
    },
  });

  if (!challengeId || !token) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-destructive">
        {t("auth:cli-auth.invalid-url")}
      </div>
    );
  }

  if (sessionQuery.isLoading || challengeQuery.isLoading) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">
        {t("auth:cli-auth.loading")}
      </div>
    );
  }

  if (challengeQuery.error) {
    const translated = translateApiError(challengeQuery.error, t);
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{t("auth:cli-auth.challenge-unavailable-title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {translated.title || t("auth:cli-auth.challenge-unavailable-fallback")}
          </p>
        </div>
      </div>
    );
  }

  const challenge = challengeQuery.data;
  if (!challenge) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-destructive">
        {t("auth:cli-auth.challenge-unavailable-title")}
      </div>
    );
  }

  if (challenge.status === "approved") {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{t("auth:cli-auth.approved-title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth:cli-auth.approved-description")}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("auth:cli-auth.command-label")}{" "}
            <span className="font-mono text-foreground">{challenge.command}</span>
          </p>
        </div>
      </div>
    );
  }

  if (challenge.status === "cancelled" || challenge.status === "expired") {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">
            {challenge.status === "expired"
              ? t("auth:cli-auth.expired-title")
              : t("auth:cli-auth.cancelled-title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth:cli-auth.expired-description")}
          </p>
        </div>
      </div>
    );
  }

  if (challenge.requiresSignIn || !sessionQuery.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{t("auth:cli-auth.sign-in-required-title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth:cli-auth.sign-in-required-description")}
          </p>
          <Button asChild className="mt-4">
            <Link to={`/auth?next=${encodeURIComponent(currentPath)}`}>
              {t("auth:cli-auth.sign-in-cta")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{t("auth:cli-auth.approve-title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("auth:cli-auth.approve-description")}
        </p>

        <div className="mt-5 space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">{t("auth:cli-auth.field.command")}</div>
            <div className="font-mono text-foreground">{challenge.command}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("auth:cli-auth.field.client")}</div>
            <div className="text-foreground">
              {challenge.clientName ?? t("auth:cli-auth.client-fallback")}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("auth:cli-auth.field.requested-access")}</div>
            <div className="text-foreground">
              {challenge.requestedAccess === "instance_admin_required"
                ? t("auth:cli-auth.access.instance-admin")
                : t("auth:cli-auth.access.board")}
            </div>
          </div>
          {challenge.requestedCompanyName && (
            <div>
              <div className="text-muted-foreground">
                {t("auth:cli-auth.field.requested-company")}
              </div>
              <div className="text-foreground">{challenge.requestedCompanyName}</div>
            </div>
          )}
        </div>

        {(approveMutation.error || cancelMutation.error) && (
          <p className="mt-4 text-sm text-destructive">
            {translateApiError(approveMutation.error ?? cancelMutation.error, t).title ||
              t("auth:cli-auth.update-failed-fallback")}
          </p>
        )}

        {!challenge.canApprove && (
          <p className="mt-4 text-sm text-destructive">
            {t("auth:cli-auth.requires-instance-admin")}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={!challenge.canApprove || approveMutation.isPending || cancelMutation.isPending}
          >
            {approveMutation.isPending
              ? t("auth:cli-auth.approving")
              : t("auth:cli-auth.approve-cta")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={approveMutation.isPending || cancelMutation.isPending}
          >
            {cancelMutation.isPending
              ? t("auth:cli-auth.cancelling")
              : t("auth:cli-auth.cancel-cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
