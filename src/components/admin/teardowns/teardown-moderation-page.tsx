// TRANSPORT: client-query — the queue reads `@/hooks/blueprints/teardown-moderation`. The
// capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/teardowns`. Surveys publishers have sent, waiting for a moderator.
//
// ⚠️ THIS CONSOLE IS THE ONLY PLACE A PENDING TEARDOWN EXISTS. It has no public address until
// somebody publishes it, so there is no page to open in another tab and nothing to compare a card
// against — the card carries everything the publisher sent, because it is the whole review surface.
//
// ⚠️ AND EVERY ONE OF THEM IS A SURVEY OF SOMEBODY ELSE'S PRODUCT. The permission block is rendered
// first for that reason: the licence, the manufacturer's authorisation, or neither.

import TeardownReviewCard from "@/components/admin/teardowns/teardown-review-card";
import { useTeardownReviewQueue } from "@/hooks/blueprints/teardown-moderation";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import type { TeardownReviewItem } from "@/lib/blueprints/teardown-moderation.schemas";

const PANEL_CLASS =
  "block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

type ConsoleState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

export default function TeardownModerationPage() {
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
        <h1 className="text-2xl font-semibold">Teardowns</h1>
        <p className="text-sm text-muted-foreground">
          Surveys publishers have sent, oldest first. Read each one against where they say the unit
          came from and what permission, if any, they have to publish it.
        </p>
        <p className="text-sm text-muted-foreground">
          A decision takes effect immediately. Publishing gives the teardown a public address and
          needs a thumbnail and a difficulty the publisher never sent; a send-back carries your
          note, and it is the only thing they see.
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
          Reviewing teardowns needs the `moderate_content` capability. Your role is{" "}
          {state.platformRole ?? "none"}, so this page is not loaded.
        </output>
      );
    case "permitted":
      // Mounted only once the capability answers, because `useKeysetList` has no `enabled`.
      return <TeardownReviewQueue />;
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
      readonly submissions: readonly TeardownReviewItem[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

function TeardownReviewQueue() {
  const queue = useTeardownReviewQueue();

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
            <TeardownReviewCard key={submission.submissionId} submission={submission} />
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
