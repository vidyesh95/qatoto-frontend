// TRANSPORT: client-query — the list, the confirm and the dismiss all call hooks in
// `@/hooks/store/admin-product-relations`. The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/product-relations`. What sellers claim goes with what.
//
// WHY IT IS MODERATED: a relation is a CLAIM, not a fact — §15.3's rule is that "a seller saying its
// bolt fits a given bicycle is a claim", and only a moderator can promote one to something the
// buyer's sheet renders with confirmatory language. Until this page existed the promote route had
// no way to be reached, so every relation on the platform read as "seller says so" forever.
//
// THIS QUEUE DRAINS, in both directions: confirm promotes a claim, dismiss refuses it, and either
// decision removes it from this list. `dismissed_at` + `dismissed_by_user_id` carry the refusal, so
// `sourceKind` still records only PROVENANCE and a dismissed seller claim stays distinguishable
// from a dismissed derived edge.
//
// ⚠️ **DISMISSING HIDES THE CLAIM FROM BUYERS — IT IS NOT "NOT NOW".** The server filters
// `dismissed_at IS NULL` on the PDP companions rail, the spare-parts read and the pathway candidate
// resolver. A fitment claim is a safety claim, so refusing one has to stop it reaching anybody.
//
// ⚠️ **AND IT BINDS THE SELLER.** Their replace-set skips dismissed rows, so re-sending that edge
// is a 409 naming the dismissal. They cannot re-appeal in-product.
//
// ⚠️ **CONFIRMING CANNOT BE UNDONE, BY ANYONE.** One UPDATE of this table exists in the whole
// backend and nothing reverses it; the seller cannot delete a curated row either. Hence the confirm
// step, the same shape `/admin/pathways` uses for publishing.

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useDismissProductRelationMutation,
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
          Both actions are permanent and the copy has to say so — dismissing is not a "not now", it
          takes the claim off every buyer-facing surface and the seller cannot put it back.
        */}
        <p className="max-w-2xl text-xs text-muted-foreground">
          Dismissing a claim hides it from buyers everywhere and cannot be undone — the seller
          cannot re-add it either. Leaving a claim alone keeps it here for the next reviewer.
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
              confirmed. Empty now means "nothing UNREVIEWED": a decided claim, confirmed or
              dismissed, has left this list. It does not mean no claims exist. */}
          Nothing is waiting for review.
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

/**
 * ⚠️ **`confirming` AND `working` CARRY THE ACTION.** With two mutually exclusive decisions on one
 * card, an unparameterised state cannot say WHICH is pending, and the panel would offer the wrong
 * confirmation copy. Same shape as the commerce report queue's row state.
 */
type CardAction = "verify" | "dismiss";

type CardState =
  | { readonly status: "idle" }
  | { readonly status: "confirming"; readonly action: CardAction }
  | { readonly status: "working"; readonly action: CardAction }
  | { readonly status: "refused"; readonly message: string };

function RelationCard({ relation }: { readonly relation: ModerationProductRelation }) {
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });

  const verifyRelation = useVerifyProductRelationMutation();
  const dismissRelation = useDismissProductRelationMutation();

  /**
   * ⚠️ **ONE KEY PER ACTION, NOT ONE PER CARD.** A key rotates only on a confirmed success, so a
   * failed confirm followed by a dismiss would send the dismiss under the confirm attempt's key and
   * the server — whose idempotency is user-scoped — would replay the verify response instead.
   */
  const verifyKey = useResettableAttemptIdempotencyKey();
  const dismissKey = useResettableAttemptIdempotencyKey();

  // The seller's own listing is what they are claiming FROM, so a target that is no longer public
  // is the interesting case: the claim stands while the thing it points at has gone.
  const isTargetPubliclyVisible =
    relation.toProductStatus === "active" && relation.toProductModerationState === "approved";

  const handleDecideClick = (action: CardAction) => {
    setCardState({ status: "working", action });
    const isVerify = action === "verify";
    const mutation = isVerify ? verifyRelation : dismissRelation;
    const attemptKey = isVerify ? verifyKey : dismissKey;
    mutation.mutate(
      { relationId: relation.id, idempotencyKey: attemptKey.getIdempotencyKey() },
      {
        onSuccess: (result) => {
          if (result.success) {
            // Rotated ONLY on a confirmed success — a retry after a network failure must carry the
            // key of the attempt it is retrying.
            attemptKey.resetIdempotencyKey();
            setCardState({ status: "idle" });
            return;
          }
          // ⚠️ A 403 here is PER-ROW, not per-page: the moderator belongs to this seller's
          // organization. The client cannot know their memberships, so the controls stay visible
          // and the refusal is shown where it happened.
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
          {/*
            The two consequences are NOT symmetrical and the copy must not pretend they are.
            Confirming publishes a claim as checked; dismissing removes it from every buyer surface
            and locks the seller out of re-adding it.
          */}
          <p className="text-xs">
            {cardState.action === "verify"
              ? "Confirming marks this as checked by us, and it is permanent — there is no way to undo it, and the seller cannot remove it afterwards either."
              : "Dismissing hides this claim from buyers everywhere — the companions list, spare parts and pathways. It is permanent, and the seller cannot re-add this pairing afterwards."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDecideClick(cardState.action)}
              className={PRIMARY_BUTTON_CLASS}
            >
              {cardState.action === "verify" ? "Confirm it anyway" : "Dismiss it anyway"}
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={cardState.status === "working"}
            onClick={() => setCardState({ status: "confirming", action: "verify" })}
            className={PRIMARY_BUTTON_CLASS}
          >
            {cardState.status === "working" && cardState.action === "verify"
              ? "Confirming…"
              : "Confirm this fits"}
          </button>
          <button
            type="button"
            disabled={cardState.status === "working"}
            onClick={() => setCardState({ status: "confirming", action: "dismiss" })}
            className={QUIET_BUTTON_CLASS}
          >
            {cardState.status === "working" && cardState.action === "dismiss"
              ? "Dismissing…"
              : "Dismiss"}
          </button>
        </div>
      )}

      {cardState.status === "refused" && (
        <output role="alert" className="mt-2 block text-xs text-red-700">
          {cardState.message}
        </output>
      )}
    </article>
  );
}
