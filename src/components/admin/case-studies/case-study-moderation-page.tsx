// TRANSPORT: client-query — the queue reads `@/hooks/blueprints/case-study-moderation`, which is
// mock-backed today. The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/case-studies`. Case studies writers have sent, waiting for a moderator.
//
// ⚠️ A PRACTICE QUEUE, AND THE HEADER SAYS SO ONCE. The rows are samples and a decision is checked
// and discarded (`case-study-moderation.api.ts`). The disclosure sits in the header rather than on
// each decided card, because a moderator reading sample rows as real writers is the failure, and a
// warning repeated on every card stops being read.
//
// ⚠️ WITHHELD COMPANY NAMES ARE SHOWN HERE, marked "Withheld from readers". This page is moderator-only
// and the moderator is exactly who a writer agreed may see the name; the public read carries `null`.

import CaseStudyReviewCard from "@/components/admin/case-studies/case-study-review-card";
import { useCaseStudyReviewQueue } from "@/hooks/blueprints/case-study-moderation";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import type { CaseStudyReviewItem } from "@/lib/blueprints/case-study-moderation.schemas";

const PANEL_CLASS =
  "block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

type ConsoleState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

export default function CaseStudyModerationPage() {
  const staffContextQuery = useOwnStaffContextQuery();

  const consoleState: ConsoleState = staffContextQuery.isError
    ? { status: "capabilityUnknown" }
    : !staffContextQuery.isSuccess
      ? { status: "checking" }
      : staffContextQuery.data.capabilities.includes("moderate_content")
        ? { status: "permitted" }
        : { status: "restricted", platformRole: staffContextQuery.data.platformRole };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="max-w-3xl space-y-1">
        <h1 className="text-2xl font-semibold">Case studies</h1>
        <p className="text-sm text-muted-foreground">
          Case studies writers have sent, oldest first. Read each one against how the writer says
          they know it, and against the statements they ticked.
        </p>
        <p className="text-sm text-muted-foreground">
          These are sample submissions. Decisions are checked against the real rules and then
          discarded: nothing is published and no writer is told.
        </p>
      </header>

      {renderConsole(consoleState)}
    </div>
  );
}

function renderConsole(state: ConsoleState) {
  switch (state.status) {
    case "checking":
      return <div className="h-28 max-w-3xl animate-pulse rounded-2xl bg-muted/40" aria-hidden />;
    case "capabilityUnknown":
      return (
        <output className={`${PANEL_CLASS} max-w-3xl`}>
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      );
    case "restricted":
      return (
        <output className={`${PANEL_CLASS} max-w-3xl`}>
          Reviewing case studies needs the `moderate_content` capability. Your role is{" "}
          {state.platformRole ?? "none"}, so this page is not loaded.
        </output>
      );
    case "permitted":
      // Mounted only once the capability answers, because `useKeysetList` has no `enabled`.
      return <CaseStudyReviewQueue />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

type QueueViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly submissions: readonly CaseStudyReviewItem[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

function CaseStudyReviewQueue() {
  const queue = useCaseStudyReviewQueue();

  const viewState: QueueViewState = (() => {
    if (queue.isLoadingFirstPage) return { status: "loading" };
    if (queue.firstPageErrorMessage !== null) {
      return { status: "error", message: queue.firstPageErrorMessage };
    }
    if (queue.rows.length === 0) return { status: "empty" };
    return {
      status: "ready",
      submissions: queue.rows,
      hasNextPage: queue.hasNextPage,
      isFetchingNextPage: queue.isFetchingNextPage,
      loadMoreErrorMessage: queue.loadMoreErrorMessage,
      loadNextPage: queue.loadNextPage,
    };
  })();

  switch (viewState.status) {
    case "loading":
      return (
        <div
          className="h-40 max-w-3xl animate-pulse rounded-2xl border border-[#CAC4D0]/60 bg-muted/40"
          aria-hidden
        />
      );
    case "error":
      return (
        <output className="block max-w-3xl rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
          {viewState.message}
        </output>
      );
    case "empty":
      return <p className={`${PANEL_CLASS} max-w-3xl`}>Nothing is waiting for review.</p>;
    case "ready":
      return (
        <div className="max-w-3xl space-y-4">
          {viewState.submissions.map((submission) => (
            <CaseStudyReviewCard key={submission.submissionId} submission={submission} />
          ))}
          {viewState.loadMoreErrorMessage !== null && (
            <output className="block rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
              {viewState.loadMoreErrorMessage}
            </output>
          )}
          {viewState.hasNextPage && (
            <button
              type="button"
              onClick={viewState.loadNextPage}
              disabled={viewState.isFetchingNextPage}
              className={QUIET_BUTTON_CLASS}
            >
              {viewState.isFetchingNextPage ? "Loading…" : "Load more submissions"}
            </button>
          )}
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
