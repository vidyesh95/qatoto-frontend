"use client";

// TRANSPORT: client-query — `GET /feed/admin/search-terms/suppressions` and
// `DELETE /feed/admin/search-terms/suppressions/:term`, behind `moderate_content`.
//
// HIDDEN SEARCH TERMS: WHAT MODERATORS HAVE WITHHELD FROM "EVERYONE IS SEARCHING FOR".
//
// A term is hidden from the watch page itself (`trending-searches.tsx`), and a hidden term never
// renders there again, so this list is the only way back. Unhiding does not force the term onto
// the page: it returns only if it still clears the five-searcher floor on the next read.
//
// `restricted` WINS OVER `loading`, the ordering every staff queue here uses: a disabled query sits
// in `pending` forever, so checking `isPending` first would spin for anyone without the capability.
// A 404 on Unhide means another moderator lifted it first; the list refetches either way.

import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/shared/admin-page-header";
import {
  useLiftSearchTermSuppressionMutation,
  useSuppressedSearchTermsQuery,
} from "@/hooks/feed/search-term-suppression-admin";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { SEARCH_TERM_SUPPRESSION_ADMIN_CAPABILITY } from "@/lib/feed/search-term-suppression-admin.api";
import type { SuppressedSearchTerm } from "@/lib/feed/search-term-suppression-admin.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

type SuppressedTermListViewState =
  | { readonly status: "checking" }
  | { readonly status: "restricted" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly suppressedTerms: readonly SuppressedSearchTerm[] };

export default function SuppressedSearchTermsPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canModerateContent =
    staffContextQuery.data?.capabilities.includes(SEARCH_TERM_SUPPRESSION_ADMIN_CAPABILITY) ??
    false;
  const suppressedTermsQuery = useSuppressedSearchTermsQuery(canModerateContent);
  const liftMutation = useLiftSearchTermSuppressionMutation();
  const [unhideCandidateTerm, setUnhideCandidateTerm] = useState<string | null>(null);

  const viewState = deriveViewState();

  function deriveViewState(): SuppressedTermListViewState {
    if (staffContextQuery.isPending) return { status: "checking" };
    if (!canModerateContent) return { status: "restricted" };
    if (suppressedTermsQuery.isPending) return { status: "loading" };
    if (suppressedTermsQuery.isError)
      return { status: "error", message: suppressedTermsQuery.error.apiError.message };
    const suppressedTerms = suppressedTermsQuery.data.pages.flatMap((page) => page.rows);
    return suppressedTerms.length === 0
      ? { status: "empty" }
      : { status: "ready", suppressedTerms };
  }

  function handleConfirmUnhideClick(term: string) {
    if (liftMutation.isPending) return;
    liftMutation.mutate({ term }, { onSettled: () => setUnhideCandidateTerm(null) });
  }

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Hidden search terms"
        description="Terms a moderator withheld from “Everyone is searching for” on the watch page, newest first."
        secondaryDescription="Unhiding is audited. The term comes back only if enough people still search for it on the next read."
      />

      {liftMutation.error !== null && (
        <p role="alert" className="text-xs text-destructive">
          {liftMutation.error.apiError.code === "404"
            ? `${liftMutation.error.apiError.message} Another moderator may have unhidden it; the list has been refreshed.`
            : `${liftMutation.error.apiError.message} (code ${liftMutation.error.apiError.code})`}
        </p>
      )}

      {renderListBody(viewState)}

      {viewState.status === "ready" && suppressedTermsQuery.hasNextPage && (
        <button
          type="button"
          disabled={suppressedTermsQuery.isFetchingNextPage}
          onClick={() => void suppressedTermsQuery.fetchNextPage()}
          className="cursor-pointer rounded-full border border-border px-4 py-1.5 text-xs disabled:opacity-50"
        >
          {suppressedTermsQuery.isFetchingNextPage ? "Loading…" : "Load older"}
        </button>
      )}
    </div>
  );

  function renderListBody(state: SuppressedTermListViewState) {
    switch (state.status) {
      case "checking":
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading…</p>;
      case "restricted":
        return (
          <p className="text-sm text-muted-foreground">
            Hidden search terms are open to staff who can moderate content.
          </p>
        );
      case "error":
        return <p className="text-sm text-muted-foreground">{state.message}</p>;
      case "empty":
        return <p className="text-sm text-muted-foreground">No search term is hidden.</p>;
      case "ready":
        return (
          <ul className="divide-y divide-border">
            {state.suppressedTerms.map((suppressedTerm) => (
              <li
                key={suppressedTerm.term}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium break-words text-foreground">
                    {suppressedTerm.term}
                  </p>
                  <p className="text-xs leading-4 text-muted-foreground">
                    Hidden {formatIsoInstantLabel(suppressedTerm.suppressedAt)}
                    {suppressedTerm.suppressedBy === null
                      ? " · moderator erased"
                      : ` by ${suppressedTerm.suppressedBy.name}`}
                  </p>
                  <p className="text-xs leading-4 break-words text-foreground">
                    {suppressedTerm.reason}
                  </p>
                </div>
                {unhideCandidateTerm === suppressedTerm.term ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={liftMutation.isPending}
                      onClick={() => handleConfirmUnhideClick(suppressedTerm.term)}
                      className="cursor-pointer rounded-full bg-primary-imprint px-4 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-60"
                    >
                      {liftMutation.isPending ? "Unhiding…" : "Confirm unhide"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnhideCandidateTerm(null)}
                      className="cursor-pointer text-xs font-medium text-foreground underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUnhideCandidateTerm(suppressedTerm.term)}
                    className="cursor-pointer text-xs font-medium text-foreground underline"
                  >
                    Unhide
                  </button>
                )}
              </li>
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = state;
        return exhaustiveCheck;
      }
    }
  }
}
