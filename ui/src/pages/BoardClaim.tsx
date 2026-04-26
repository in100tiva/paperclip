import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "@/lib/router";
import { accessApi } from "../api/access";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { translateApiError } from "@/lib/translateApiError";
import { Button } from "@/components/ui/button";

export function BoardClaimPage() {
  const { t } = useTranslation(["auth", "common"]);
  const queryClient = useQueryClient();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const token = (params.token ?? "").trim();
  const code = (searchParams.get("code") ?? "").trim();
  const currentPath = useMemo(
    () => `/board-claim/${encodeURIComponent(token)}${code ? `?code=${encodeURIComponent(code)}` : ""}`,
    [token, code],
  );

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });
  const statusQuery = useQuery({
    queryKey: ["board-claim", token, code],
    queryFn: () => accessApi.getBoardClaimStatus(token, code),
    enabled: token.length > 0 && code.length > 0,
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: () => accessApi.claimBoard(token, code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.health });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.stats });
      await statusQuery.refetch();
    },
  });

  if (!token || !code) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-destructive">
        {t("auth:board-claim.invalid-url")}
      </div>
    );
  }

  if (statusQuery.isLoading || sessionQuery.isLoading) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">
        {t("auth:board-claim.loading")}
      </div>
    );
  }

  if (statusQuery.error) {
    const translated = translateApiError(statusQuery.error, t);
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">
            {t("auth:board-claim.challenge-unavailable-title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {translated.title || t("auth:board-claim.challenge-unavailable-fallback")}
          </p>
        </div>
      </div>
    );
  }

  const status = statusQuery.data;
  if (!status) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-destructive">
        {t("auth:board-claim.challenge-unavailable-title")}
      </div>
    );
  }

  if (status.status === "claimed") {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{t("auth:board-claim.claimed-title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth:board-claim.claimed-description")}
          </p>
          <Button asChild className="mt-4">
            <Link to="/">{t("auth:common.open-board")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionQuery.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{t("auth:board-claim.sign-in-required-title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth:board-claim.sign-in-required-description")}
          </p>
          <Button asChild className="mt-4">
            <Link to={`/auth?next=${encodeURIComponent(currentPath)}`}>
              {t("auth:board-claim.sign-in-cta")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{t("auth:board-claim.claim-title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("auth:board-claim.claim-description")}
        </p>

        {claimMutation.error && (
          <p className="mt-3 text-sm text-destructive">
            {translateApiError(claimMutation.error, t).title ||
              t("auth:board-claim.claim-failed-fallback")}
          </p>
        )}

        <Button
          className="mt-5"
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
        >
          {claimMutation.isPending
            ? t("auth:board-claim.claim-cta-pending")
            : t("auth:board-claim.claim-cta")}
        </Button>
      </div>
    </div>
  );
}
