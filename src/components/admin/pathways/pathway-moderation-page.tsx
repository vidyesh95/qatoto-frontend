// TRANSPORT: client-query — the queue and the decision call hooks in `@/hooks/store/admin-pathways`.
// The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/pathways`. Curated product sets waiting to go out.
//
// WHY THIS IS MODERATED AT ALL, in the backend's own words: without review "a seller composes a set
// entirely from its own SKUs and a curated look becomes an advertisement."
//
// ⚠️ **BUT `ownCandidateShare` IS SURFACED, NEVER ACTED ON** — "a bicycle maker legitimately
// supplies most of a bicycle kit, and only a reviewer can tell that from self-dealing." No
// threshold, no auto-reject, no sorting by it. It is context for a person.
//
// ⚠️ **`null` IS NOT ZERO.** It is null for a platform-curated set with no owner, and null for one
// with no STORED candidates — including a set built entirely from derived slots, whose candidates
// are resolved at read time and never stored. A fully-derived set therefore reports null however
// self-dealing it is. That is a limit of the signal, and the copy says so rather than printing 0%.
//
// ⚠️ **PUBLISHING IS A ONE-WAY DOOR.** There is no delete, withdraw or unpublish route anywhere in
// the module, so `active` is terminal. Reject is the recoverable decision — it returns the set to
// the author, editable.

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useModeratePathwayMutation,
  usePathwayModerationQueue,
} from "@/hooks/store/admin-pathways";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import type { PathwayModeration } from "@/lib/store/pathway-authoring.schemas";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm outline-none focus:border-primary";

type ConsoleState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

export default function PathwayModerationPage() {
  const staffContextQuery = useOwnStaffContextQuery();

  const consoleState: ConsoleState = staffContextQuery.isError
    ? { status: "capabilityUnknown" }
    : !staffContextQuery.isSuccess
      ? { status: "checking" }
      : staffContextQuery.data.capabilities.includes("moderate_commerce")
        ? { status: "permitted" }
        : { status: "restricted", platformRole: staffContextQuery.data.platformRole };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Curated sets</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Shopping lists a seller or a merchandiser wants to publish. Read them for self-dealing: a
          set made entirely of one seller&apos;s own products is an advertisement, though a
          manufacturer legitimately supplies most of their own kit.
        </p>
      </header>

      {renderConsole(consoleState)}
    </div>
  );
}

function renderConsole(state: ConsoleState) {
  switch (state.status) {
    case "checking":
      return <div className="h-28 animate-pulse rounded-2xl bg-muted/40" aria-hidden />;
    case "capabilityUnknown":
      return (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      );
    case "restricted":
      return (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Deciding curated sets needs the `moderate_commerce` capability. Your role is{" "}
          {state.platformRole ?? "none"}, so this page is not loaded.
        </output>
      );
    case "permitted":
      // Mounted only once the capability answers — `useKeysetList` has no `enabled`, so this is
      // how the read stays unfired rather than a disabled query sitting in `pending` forever.
      return <PathwayQueue />;
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
      readonly pathways: readonly PathwayModeration[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

function PathwayQueue() {
  const queue = usePathwayModerationQueue();

  const viewState: QueueViewState = (() => {
    if (queue.isLoadingFirstPage) return { status: "loading" };
    if (queue.firstPageErrorMessage !== null) {
      return { status: "error", message: queue.firstPageErrorMessage };
    }
    if (queue.rows.length === 0) return { status: "empty" };
    return {
      status: "ready",
      pathways: queue.rows,
      hasNextPage: queue.hasNextPage,
      isFetchingNextPage: queue.isFetchingNextPage,
      loadMoreErrorMessage: queue.loadMoreErrorMessage,
      loadNextPage: queue.loadNextPage,
    };
  })();

  switch (viewState.status) {
    case "loading":
      return <div className={`${CARD_CLASS} h-28 animate-pulse bg-muted/40`} aria-hidden />;
    case "error":
      return (
        <output className="block rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
          {viewState.message}
        </output>
      );
    case "empty":
      return (
        <p className="rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Nothing is waiting for review.
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3">
          {viewState.pathways.map((pathway) => (
            <PathwayCard key={pathway.id} pathway={pathway} />
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
              {viewState.isFetchingNextPage ? "Loading…" : "Load newer submissions"}
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

type CardState =
  | { readonly status: "idle" }
  | { readonly status: "confirmingPublish" }
  | { readonly status: "deciding" }
  | { readonly status: "refused"; readonly message: string };

function PathwayCard({ pathway }: { readonly pathway: PathwayModeration }) {
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });
  const [reviewNote, setReviewNote] = useState("");

  const moderatePathway = useModeratePathwayMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const decide = (decision: "publish" | "reject") => {
    setCardState({ status: "deciding" });
    const trimmedNote = reviewNote.trim();
    moderatePathway.mutate(
      {
        pathwayId: pathway.id,
        input: {
          decision,
          ...(trimmedNote === "" ? {} : { reviewNote: trimmedNote }),
        },
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            resetIdempotencyKey();
            setCardState({ status: "idle" });
            return;
          }
          // A 403 here is per-row: a moderator who belongs to the owning organization cannot
          // decide its set. The client cannot know their memberships, so the control stays and
          // the refusal is shown where it happened.
          setCardState({ status: "refused", message: result.error.message });
        },
        onError: (error) => setCardState({ status: "refused", message: error.message }),
      },
    );
  };

  const isBusy = cardState.status === "deciding";

  return (
    <article className={CARD_CLASS}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">{pathway.title}</h2>
        <span className="text-xs text-muted-foreground">
          {pathway.slots.length} piece{pathway.slots.length === 1 ? "" : "s"} ·{" "}
          {pathway.candidateCount} product{pathway.candidateCount === 1 ? "" : "s"}
        </span>
      </header>

      {pathway.summary !== null && (
        <p className="mt-1 text-sm text-muted-foreground">{pathway.summary}</p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {pathway.ownCandidateShare === null
          ? /* Stated rather than printed as 0% — null means "no stored candidates to measure",
               which includes a fully-derived set, not "none of them are theirs." */
            "How much of this set is the author's own stock cannot be measured — either nobody owns it, or its pieces fill themselves from the anchor."
          : `${Math.round(pathway.ownCandidateShare * 100)}% of the products are the author's own.`}
      </p>

      <ul className="mt-2 space-y-1">
        {pathway.slots.map((slot) => (
          <li key={slot.id} className="text-xs text-muted-foreground">
            <span className="text-foreground">{slot.roleLabel}</span>
            {slot.derivedRelationKind !== null
              ? " — fills itself from the anchor"
              : ` — ${slot.candidates.map((candidate) => candidate.productTitle ?? "an unavailable listing").join(", ")}`}
          </li>
        ))}
      </ul>

      <label className="mt-3 block text-xs text-muted-foreground">
        Note to the author {/* Required to reject; the route refines on it. */}
        <textarea
          value={reviewNote}
          maxLength={2000}
          rows={2}
          onChange={(changeEvent) => setReviewNote(changeEvent.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      {cardState.status === "confirmingPublish" ? (
        <div className="mt-2 rounded-lg bg-muted/40 p-3">
          <p className="text-xs">
            Publishing is permanent. There is no way to edit or take down a published set — only the
            author&apos;s end date, if they set one, will ever retire it.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => decide("publish")}
              className={PRIMARY_BUTTON_CLASS}
            >
              Publish it anyway
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setCardState({ status: "idle" })}
              className={QUIET_BUTTON_CLASS}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setCardState({ status: "confirmingPublish" })}
            className={PRIMARY_BUTTON_CLASS}
          >
            Publish
          </button>
          <button
            type="button"
            // A rejection must say why — refused here so the author never gets an empty verdict.
            disabled={isBusy || reviewNote.trim() === ""}
            onClick={() => decide("reject")}
            className={QUIET_BUTTON_CLASS}
          >
            Send back
          </button>
        </div>
      )}

      {reviewNote.trim() === "" && cardState.status !== "confirmingPublish" && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Sending a set back needs a note — it is the only thing the author will see.
        </p>
      )}

      {cardState.status === "refused" && (
        <output role="alert" className="mt-2 block text-xs text-red-700">
          {cardState.message}
        </output>
      )}
    </article>
  );
}
