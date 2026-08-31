// TRANSPORT: client-query — the list and the confirm both call hooks in
// `@/hooks/store/admin-product-relations`. The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/product-relations`. What sellers claim goes with what.
//
// WHY IT IS MODERATED: a relation is a CLAIM, not a fact — §15.3's rule is that "a seller saying its
// bolt fits a given bicycle is a claim", and only a moderator can promote one to something the
// buyer's sheet renders with confirmatory language. Until this page existed the promote route had
// no way to be reached, so every relation on the platform read as "seller says so" forever.
//
// ⚠️ **THIS IS NOT A QUEUE THAT DRAINS, AND THE COPY MUST NOT PRETEND IT IS.** There is no way to
// dismiss a claim: the schema has no review state beside `sourceKind`, and its CHECK constraint ties
// verification attribution to `moderator_curated`, so nothing can record "a moderator read this and
// left it". A claim you judge false stays here and comes back to the next reviewer. The list shrinks
// only when a claim is CONFIRMED or the seller retracts it. Adding real dismissal is a migration.
//
// ⚠️ **CONFIRMING CANNOT BE UNDONE, BY ANYONE.** One UPDATE of this table exists in the whole
// backend and nothing reverses it; the seller cannot delete a curated row either. Hence the confirm
// step, the same shape `/admin/pathways` uses for publishing.

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useProductRelationModerationList,
  useVerifyProductRelationMutation,
} from "@/hooks/store/admin-product-relations";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import type { ModerationProductRelation } from "@/lib/store/admin-product-relations.api";
import { PRODUCT_RELATION_KIND_LABELS } from "@/lib/store/merchandising.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

type ConsoleState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

export default function RelationVerificationPage() {
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
        <h1 className="text-2xl font-semibold">Related-product claims</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Sellers say which of their products go together, replace one another, or are spare parts
          for something. Confirming a claim is what lets a buyer see it as checked rather than as
          the seller&apos;s own word.
        </p>
        {/*
          The honest sentence about a list with only one action. Saying "queue" here would promise a
          thing that empties, and this one cannot.
        */}
        <p className="max-w-2xl text-xs text-muted-foreground">
          There is no way to dismiss a claim — leaving one alone simply leaves it a claim, and it
          will still be here next time. Only confirming, or the seller withdrawing it, removes it
          from this list.
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
          Confirming related-product claims needs the `moderate_commerce` capability. Your role is{" "}
          {state.platformRole ?? "none"}, so this page is not loaded.
        </output>
      );
    case "permitted":
      // Mounted only once the capability answers — `useKeysetList` has no `enabled`, so this is how
      // the read stays unfired rather than a disabled query sitting in `pending` for ever.
      return <RelationList />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

type ListViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly relations: readonly ModerationProductRelation[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

function RelationList() {
  const list = useProductRelationModerationList();

  const viewState: ListViewState = (() => {
    if (list.isLoadingFirstPage) return { status: "loading" };
    if (list.firstPageErrorMessage !== null) {
      return { status: "error", message: list.firstPageErrorMessage };
    }
    if (list.rows.length === 0) return { status: "empty" };
    return {
      status: "ready",
      relations: list.rows,
      hasNextPage: list.hasNextPage,
      isFetchingNextPage: list.isFetchingNextPage,
      loadMoreErrorMessage: list.loadMoreErrorMessage,
      loadNextPage: list.loadNextPage,
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
          {/* Never "you are not a moderator" — this subtree only exists once the capability was
              confirmed, so empty means exactly one thing. */}
          No seller has claimed a related product yet.
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3">
          {viewState.relations.map((relation) => (
            <RelationCard key={relation.id} relation={relation} />
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
              {/* Oldest first, so the next page is forward in time. */}
              {viewState.isFetchingNextPage ? "Loading…" : "Load newer claims"}
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
  | { readonly status: "confirming" }
  | { readonly status: "working" }
  | { readonly status: "refused"; readonly message: string };

function RelationCard({ relation }: { readonly relation: ModerationProductRelation }) {
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });

  const verifyRelation = useVerifyProductRelationMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  // The seller's own listing is what they are claiming FROM, so a target that is no longer public
  // is the interesting case: the claim stands while the thing it points at has gone.
  const isTargetPubliclyVisible =
    relation.toProductStatus === "active" && relation.toProductModerationState === "approved";

  const handleConfirmClick = () => {
    setCardState({ status: "working" });
    verifyRelation.mutate(
      { relationId: relation.id, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (result) => {
          if (result.success) {
            resetIdempotencyKey();
            setCardState({ status: "idle" });
            return;
          }
          setCardState({ status: "refused", message: result.error.message });
        },
        onError: (error) => setCardState({ status: "refused", message: error.message }),
      },
    );
  };

  return (
    <article className={CARD_CLASS}>
      <h2 className="text-sm">
        <span className="font-medium">{relation.fromProductTitle}</span>
        <span className="text-muted-foreground">
          {" "}
          · {PRODUCT_RELATION_KIND_LABELS[relation.relationKind]} ·{" "}
        </span>
        <span className="font-medium">{relation.toProductTitle}</span>
      </h2>

      <p className="mt-1 text-xs text-muted-foreground">
        {/* The claimant. A claim with nobody behind it cannot be judged. */}
        Claimed by {relation.sellerOrganizationDisplayName} ·{" "}
        {formatIsoInstantLabel(relation.createdAt)}
      </p>

      {!isTargetPubliclyVisible && (
        <p className="mt-2 text-xs text-[#8C1D18]">
          {/*
            Surfaced deliberately. The public companions read hides a non-visible target, so
            resolving this list the same way would have let a seller hide a claim from review by
            unpublishing what it points at.
          */}
          The product this points at is not publicly visible right now ({relation.toProductStatus} ·{" "}
          {relation.toProductModerationState}).
        </p>
      )}

      {cardState.status === "confirming" ? (
        <div className="mt-3 rounded-lg bg-muted/40 p-3">
          <p className="text-xs">
            Confirming marks this as checked by us, and it is permanent — there is no way to undo
            it, and the seller cannot remove it afterwards either.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={handleConfirmClick} className={PRIMARY_BUTTON_CLASS}>
              Confirm it anyway
            </button>
            <button
              type="button"
              onClick={() => setCardState({ status: "idle" })}
              className={QUIET_BUTTON_CLASS}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={cardState.status === "working"}
          onClick={() => setCardState({ status: "confirming" })}
          className={`${PRIMARY_BUTTON_CLASS} mt-3`}
        >
          {cardState.status === "working" ? "Confirming…" : "Confirm this fits"}
        </button>
      )}

      {cardState.status === "refused" && (
        <output role="alert" className="mt-2 block text-xs text-red-700">
          {cardState.message}
        </output>
      )}
    </article>
  );
}
