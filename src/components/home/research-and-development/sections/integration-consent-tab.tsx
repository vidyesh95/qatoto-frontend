// TRANSPORT: client-query — "use client" island. Grants arrive as a view state from the
// server page (GET …/integrations); connecting writes POST …/integrations/:provider/
// authorize-url and revoking writes DELETE …/integrations/:provider.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import {
  useIntegrationAuthorizeUrlMutation,
  useRevokeIntegrationGrantMutation,
} from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationGrant,
  type IntegrationGrantStatus,
  type IntegrationProvider,
} from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedListViewState } from "@/lib/rnd/view-state";

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  figma: "Figma",
  jira: "Jira",
  linear: "Linear",
};

const GRANT_STATUS_LABELS: Record<IntegrationGrantStatus, string> = {
  pending: "Authorization started, not finished",
  active: "Connected",
  revoked: "Revoked",
  expired: "Expired",
};

/**
 * Integration consent — which providers this member let Qatoto read, and what it may read.
 *
 * WHY THIS SCREEN IS NOT OPTIONAL CHROME. Without a connected provider the verification
 * pipeline degrades honestly rather than silently: `artifact_grounding` resolves `flagged`
 * instead of `passed` — real evidence withheld pending a human — and the claim lands at
 * `flagged_for_review` with zero slices. This is where a member fixes that, so it is
 * directly upstream of what they earn.
 *
 * THE TOKEN NEVER APPEARS HERE, only `hasStoredToken`. A response carrying the ciphertext
 * would put an org-scoped token in every browser cache and proxy log on the path.
 *
 * CONNECTING IS SCOPE-LESS TODAY, and that is a backend gap rather than a choice. `GET
 * …/integrations` returns existing grants only, so there is no catalogue describing a
 * provider that has never been connected and no way to learn valid `requestedResourceIds`
 * before authorizing. The first authorization therefore requests nothing specific and the
 * narrowing happens at the provider's own consent screen. Recorded in
 * R_AND_D_BACKEND_STRUCTURE.md Appendix D.
 *
 * REVOKING IS SELF-ONLY, and it destroys the token and purges the payloads it fetched. The
 * HASHES SURVIVE — which is why a revoked grant does not erase past slices, and why a
 * dispute against a purged claim answers `409 EVIDENCE_PURGED` rather than silently
 * re-running against nothing.
 */
export default function IntegrationConsentTab({
  grantsState,
  projectSlug,
}: {
  grantsState: MemberScopedListViewState<IntegrationGrant>;
  projectSlug: string;
}) {
  const authorizeUrlMutation = useIntegrationAuthorizeUrlMutation(projectSlug);
  const revokeMutation = useRevokeIntegrationGrantMutation(projectSlug);
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null);

  const firstError = [authorizeUrlMutation.error, revokeMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const grantsByProvider = new Map<IntegrationProvider, IntegrationGrant>(
    grantsState.status === "ready" ? grantsState.rows.map((grant) => [grant.provider, grant]) : [],
  );

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-2">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">
          What Qatoto may read on your behalf
        </h3>
        <p className="text-xs text-muted-foreground">
          Connecting a provider is how your work gets independently timestamped. Without one, the
          pipeline flags your claims for human review instead of verifying them — it does not assume
          you did nothing, but it cannot confirm that you did.
        </p>
      </section>

      {renderGrants()}

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}

      <p className="text-xs text-muted-foreground">
        Revoking deletes the stored token and the copies of anything it fetched. It does not remove
        slices you already earned: the hashes of that evidence stay in the audit chain, so past
        decisions remain checkable without keeping your data.
      </p>
    </div>
  );

  function renderGrants() {
    switch (grantsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load your connections." />;
      case "restricted":
        return grantsState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to manage your connections." />
        ) : (
          <RndMembersOnlyPanel message="Connections are managed inside the project team." />
        );
      case "empty":
      case "ready":
        return (
          <ul className="grid gap-3 sm:grid-cols-2">
            {INTEGRATION_PROVIDERS.map((provider) => {
              const grant = grantsByProvider.get(provider);
              const isConnected = grant?.status === "active";

              return (
                <li key={provider} className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{PROVIDER_LABELS[provider]}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {grant === undefined ? "Not connected" : GRANT_STATUS_LABELS[grant.status]}
                    </span>
                  </div>

                  {grant !== undefined && (
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {grant.externalAccountLabel !== null && <p>{grant.externalAccountLabel}</p>}
                      {grant.grantedAt !== null && (
                        <p>Granted {formatIsoInstant(grant.grantedAt)}</p>
                      )}
                      {grant.expiresAt !== null && (
                        <p>Expires {formatIsoInstant(grant.expiresAt)}</p>
                      )}
                      {grant.revokedAt !== null && (
                        <p>Revoked {formatIsoInstant(grant.revokedAt)}</p>
                      )}
                      {grant.allowedResourceIds.length > 0 && (
                        <p>Scoped to {grant.allowedResourceIds.length} resources</p>
                      )}
                      {!grant.hasStoredToken && grant.status === "pending" && (
                        <p>No token held yet — the provider has not sent you back.</p>
                      )}
                    </div>
                  )}

                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => revokeMutation.mutate(provider)}
                      disabled={revokeMutation.isPending}
                      className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      {revokeMutation.isPending ? "Revoking…" : "Revoke"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={authorizeUrlMutation.isPending}
                      onClick={() => {
                        setConnectingProvider(provider);
                        authorizeUrlMutation.mutate(
                          { provider, requestedResourceIds: [] },
                          {
                            onSuccess: (authorizeUrlView) => {
                              // Navigated immediately and never stored: the signed state
                              // is single-use and expires in ten minutes.
                              window.location.assign(authorizeUrlView.authorizeUrl);
                            },
                          },
                        );
                      }}
                      className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {authorizeUrlMutation.isPending && connectingProvider === provider
                        ? "Opening…"
                        : "Connect"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = grantsState;
        return exhaustiveCheck;
      }
    }
  }
}
