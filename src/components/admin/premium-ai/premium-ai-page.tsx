"use client";

// TRANSPORT: client-query — `GET|POST /assistant/admin/cloud-access` and
// `POST /assistant/admin/cloud-access/:userId/revocation`, behind `grant_ai_assistant_cloud`.
//
// PREMIUM AI: WHO MAY ASK THE ASSISTANT THROUGH GOOGLE GEMINI ON QATOTO'S KEY.
//
// Everyone else chats with Chrome's built-in model on their own device, or not at all. There is no
// billing behind this; an admin grants it per account, by exact email, and can revoke it. Revoking
// keeps the grant as history on the server — this page lists only the active ones.
//
// `restricted` WINS OVER `loading`, the ordering every staff queue here uses: a disabled query sits
// in `pending` forever, so checking `isPending` first would spin for anyone without the capability.
// Every refusal is shown as the backend's own words (404 unknown email, 409 already active).

import { useMemo, useState, type FormEvent } from "react";

import {
  useCloudAccessGrantsQuery,
  useGrantCloudAccessMutation,
  useRevokeCloudAccessMutation,
} from "@/hooks/assistant/cloud-access-admin";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { CLOUD_ACCESS_ADMIN_CAPABILITY } from "@/lib/assistant/cloud-access-admin.api";
import {
  CLOUD_ACCESS_NOTE_MAXIMUM_LENGTH,
  type CloudAccessGrant,
} from "@/lib/assistant/cloud-access-admin.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

type GrantListViewState =
  | { readonly status: "restricted" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly grants: readonly CloudAccessGrant[] };

export default function PremiumAiPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canGrant =
    staffContextQuery.data?.capabilities.includes(CLOUD_ACCESS_ADMIN_CAPABILITY) ?? false;
  const grantsQuery = useCloudAccessGrantsQuery(canGrant);
  const grantMutation = useGrantCloudAccessMutation();
  const revokeMutation = useRevokeCloudAccessMutation();

  const [draftEmail, setDraftEmail] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [revokeCandidateUserId, setRevokeCandidateUserId] = useState<string | null>(null);

  const viewState = useMemo<GrantListViewState>(() => {
    if (!canGrant) return { status: "restricted" };
    if (grantsQuery.isPending) return { status: "loading" };
    if (grantsQuery.isError)
      return { status: "error", message: grantsQuery.error.apiError.message };
    const grants = grantsQuery.data.pages.flatMap((page) => page.rows);
    return grants.length === 0 ? { status: "empty" } : { status: "ready", grants };
  }, [canGrant, grantsQuery]);

  const handleGrantSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const email = draftEmail.trim();
    if (email.length === 0 || grantMutation.isPending) return;
    const note = draftNote.trim();
    grantMutation.mutate(
      { email, note: note.length === 0 ? null : note },
      {
        onSuccess: () => {
          setDraftEmail("");
          setDraftNote("");
        },
      },
    );
  };

  return (
    <div className="p-6">
      <header className="pb-4">
        <h1 className="text-lg font-semibold text-foreground">Premium AI</h1>
        <p className="max-w-2xl text-xs leading-4 text-muted-foreground">
          Accounts listed here may ask the AI assistant through Google Gemini on Qatoto&apos;s key.
          Everyone else chats with Chrome&apos;s built-in model on their own device, or not at all.
          There is no billing behind this: you grant it by email and can revoke it. Revoking keeps
          the grant as history.
        </p>
      </header>

      {viewState.status === "restricted" ? (
        <p className="text-sm text-muted-foreground">
          You do not hold the capability that opens this page.
        </p>
      ) : (
        <form
          onSubmit={handleGrantSubmit}
          className="mb-6 flex max-w-2xl flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
            Account email
            <input
              type="email"
              required
              value={draftEmail}
              onChange={(changeEvent) => setDraftEmail(changeEvent.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
            Note for other admins (optional)
            <input
              type="text"
              maxLength={CLOUD_ACCESS_NOTE_MAXIMUM_LENGTH}
              value={draftNote}
              onChange={(changeEvent) => setDraftNote(changeEvent.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="submit"
            disabled={grantMutation.isPending || draftEmail.trim().length === 0}
            className="cursor-pointer rounded-full bg-primary-imprint px-5 py-2 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {grantMutation.isPending ? "Granting…" : "Grant Premium AI"}
          </button>
        </form>
      )}

      {grantMutation.error !== null && (
        <p role="alert" className="mb-4 text-xs text-destructive">
          {grantMutation.error.apiError.message} (code {grantMutation.error.apiError.code})
        </p>
      )}

      {viewState.status === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}
      {viewState.status === "error" && (
        <p className="text-sm text-muted-foreground">{viewState.message}</p>
      )}
      {viewState.status === "empty" && (
        <p className="text-sm text-muted-foreground">No account has Premium AI.</p>
      )}

      {viewState.status === "ready" && (
        <ul className="divide-y divide-border">
          {viewState.grants.map((grant) => (
            <li
              key={grant.userId}
              className="flex flex-wrap items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {grant.name}
                  {grant.handle !== null && (
                    <span className="text-muted-foreground"> @{grant.handle}</span>
                  )}
                </p>
                <p className="text-xs leading-4 text-muted-foreground">{grant.email}</p>
                <p className="text-xs leading-4 text-muted-foreground">
                  Granted {formatIsoInstantLabel(grant.grantedAt)}
                  {grant.grantedBy === null ? " · granter erased" : ` by ${grant.grantedBy.name}`}
                </p>
                {grant.note !== null && (
                  <p className="mt-1 text-xs leading-4 text-foreground">{grant.note}</p>
                )}
              </div>
              {revokeCandidateUserId === grant.userId ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={revokeMutation.isPending}
                    onClick={() =>
                      revokeMutation.mutate(
                        { userId: grant.userId },
                        { onSettled: () => setRevokeCandidateUserId(null) },
                      )
                    }
                    className="cursor-pointer rounded-full bg-destructive px-4 py-1.5 text-xs font-medium text-destructive-foreground disabled:opacity-60"
                  >
                    {revokeMutation.isPending ? "Revoking…" : "Confirm revoke"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevokeCandidateUserId(null)}
                    className="cursor-pointer text-xs font-medium text-foreground underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevokeCandidateUserId(grant.userId)}
                  className="cursor-pointer text-xs font-medium text-foreground underline"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewState.status === "ready" && grantsQuery.hasNextPage && (
        <button
          type="button"
          disabled={grantsQuery.isFetchingNextPage}
          onClick={() => void grantsQuery.fetchNextPage()}
          className="mt-4 cursor-pointer rounded-full border border-border px-4 py-1.5 text-xs disabled:opacity-50"
        >
          {grantsQuery.isFetchingNextPage ? "Loading…" : "Load older grants"}
        </button>
      )}

      {revokeMutation.error !== null && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {revokeMutation.error.apiError.message} (code {revokeMutation.error.apiError.code})
        </p>
      )}
    </div>
  );
}
