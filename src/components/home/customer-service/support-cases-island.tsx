// TRANSPORT: client-query — reads GET /support/cases and hosts the open-case form.
"use client";

// `signedOut` IS A VIEW STATE AND IT WINS OVER `loading`, the ordering the admin queues
// established: a disabled React Query sits in `pending` forever, so checking `isPending` first
// would spin permanently for every signed-out visitor — and this page has plenty of them,
// because the sidebar's "Help and settings" row carries no session requirement.
//
// The signed-in answer is SEEDED FROM THE SERVER (`hasCallerSession()` threaded down as a
// prop) so the first client render matches the HTML. It is an initial value, not an authority:
// the backend re-authorizes every request regardless.

import { useMemo, useState } from "react";

import Link from "next/link";

import OpenCaseForm from "@/components/home/customer-service/open-case-form";
import StatusPanel from "@/components/home/shared/status-panel";
import { useOwnSupportCasesQuery } from "@/hooks/support/cases";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import { isUnauthorized } from "@/lib/http";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  SUPPORT_CASE_CATEGORY_LABELS,
  SUPPORT_CASE_STATE_LABELS,
  type SupportCaseSummary,
} from "@/lib/support/schemas";

type OwnCasesViewState =
  | { status: "signedOut" }
  | { status: "loading" }
  | { status: "signInRequired" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; cases: readonly SupportCaseSummary[]; hasNextPage: boolean };

/**
 * `awaiting_user` gets the emphatic treatment — it is the one state that asks the reader to
 * do something, and a row that looks like every other row does not say so.
 */
const STATE_PILL_CLASSES: Readonly<Record<SupportCaseSummary["state"], string>> = {
  open: "bg-muted text-muted-foreground",
  awaiting_user: "bg-foreground text-background",
  resolved: "bg-muted text-muted-foreground",
  closed: "bg-muted text-muted-foreground",
};

export default function SupportCasesIsland({ isViewerSignedIn }: { isViewerSignedIn: boolean }) {
  const [isShowingAllCases, setIsShowingAllCases] = useState(false);
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);

  const ownCasesQuery = useOwnSupportCasesQuery(undefined, isSignedIn);

  const viewState = useMemo<OwnCasesViewState>(() => {
    // Before `isPending` — see the header.
    if (!isSignedIn) return { status: "signedOut" };
    if (ownCasesQuery.isPending) return { status: "loading" };
    if (ownCasesQuery.isError) {
      // A stale cookie that got past the seed. The affordance is signing in, not retrying.
      if (isUnauthorized(ownCasesQuery.error.apiError)) return { status: "signInRequired" };
      return { status: "error", message: ownCasesQuery.error.apiError.message };
    }

    const cases = ownCasesQuery.data.pages.flatMap((page) => page.rows);
    if (cases.length === 0) return { status: "empty" };
    return { status: "ready", cases, hasNextPage: ownCasesQuery.hasNextPage };
  }, [isSignedIn, ownCasesQuery]);

  return (
    <div className="space-y-4">
      {viewState.status === "signedOut" && (
        <StatusPanel
          message="Sign in to open a support case, or to read the ones you have already opened."
          className="border border-border px-6 py-12"
          action={
            <Link
              href="/sign-in"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          }
        />
      )}

      {viewState.status === "signInRequired" && (
        <StatusPanel
          message="Your session has expired. Sign in again to see your cases."
          className="border border-border px-6 py-12"
          action={
            <Link
              href="/sign-in"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          }
        />
      )}

      {viewState.status === "loading" && (
        <p className="text-sm text-muted-foreground">Loading your cases…</p>
      )}

      {viewState.status === "error" && (
        <StatusPanel message={viewState.message} className="border border-border px-6 py-12" />
      )}

      {viewState.status === "empty" && (
        <p className="text-sm leading-5 text-muted-foreground">
          You have no support cases. Most problems are faster to solve on the pages above — open a
          case when none of them fits, or when one of them did not answer.
        </p>
      )}

      {viewState.status === "ready" && (
        <>
          <ul className="space-y-2">
            {(isShowingAllCases ? viewState.cases : viewState.cases.slice(0, 5)).map(
              (supportCase) => (
                <li key={supportCase.id}>
                  <Link
                    href={`/customer-service/cases/${supportCase.id}`}
                    className="block rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {supportCase.subject}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium ${STATE_PILL_CLASSES[supportCase.state]}`}
                      >
                        {SUPPORT_CASE_STATE_LABELS[supportCase.state]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">
                      {SUPPORT_CASE_CATEGORY_LABELS[supportCase.category]} · opened{" "}
                      {formatIsoInstantLabel(supportCase.createdAt)}
                    </p>
                  </Link>
                </li>
              ),
            )}
          </ul>

          {(viewState.cases.length > 5 || viewState.hasNextPage) && !isShowingAllCases && (
            <button
              type="button"
              onClick={() => setIsShowingAllCases(true)}
              className="cursor-pointer text-sm font-medium text-foreground underline"
            >
              Show all your cases
            </button>
          )}

          {isShowingAllCases && viewState.hasNextPage && (
            <button
              type="button"
              disabled={ownCasesQuery.isFetchingNextPage}
              onClick={() => void ownCasesQuery.fetchNextPage()}
              className="cursor-pointer text-sm font-medium text-foreground underline disabled:opacity-50"
            >
              {ownCasesQuery.isFetchingNextPage ? "Loading…" : "Load older cases"}
            </button>
          )}
        </>
      )}

      {isSignedIn && <OpenCaseForm />}
    </div>
  );
}
