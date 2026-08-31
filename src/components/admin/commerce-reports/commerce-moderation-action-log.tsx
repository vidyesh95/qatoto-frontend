"use client";

// The moderation-action log tab — every hide, restore, dismissal and listing-state change.
//
// ⚠️ **THIS IS THE ONLY SURFACE IN THE PRODUCT WHERE AN AUTOMATIC HIDE IS VISIBLE OR REVERSIBLE.**
// Three distinct reporters hide a review, question or answer inside the same transaction as the
// third report's insert: no moderator decided it, nobody was notified, and no audit entry names a
// person. A moderator working only the report queue never learns it happened. Without the restore
// control below, content taken down by three griefers whose reports were then upheld has no way
// back.
//
// ⚠️ **NO STATUS FILTER ON THIS TAB.** The backend shares one query schema with the report queue,
// so `?status=` parses here and `listModerationActions` then reads only `targetKind` and `cursor`.
// A status control would change the query key, refetch, and return byte-identical rows.
//
// ⚠️ **AN ALREADY-RESTORED TARGET KEEPS ITS OLD `content_hidden` ROW**, so restore can be pressed
// on a row whose content is already back. That is not derivable away: computing "the latest action
// per target" across the pages loaded so far would be a client-side answer over a partial list —
// exactly the thing this codebase refuses — and it would be wrong the moment a page is missing. So
// the copy says it instead: restoring something already visible changes nothing and is recorded.

import { useState } from "react";

import {
  useCommerceModerationActionLog,
  useRestoreCommerceContentMutation,
} from "@/hooks/store/admin-content-reports";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  COMMERCE_CONTENT_TARGET_KIND_NOUNS,
  COMMERCE_MODERATION_ACTION_KIND_LABELS,
  COMMERCE_MODERATION_ACTION_SOURCE_LABELS,
  resolveModerationTarget,
  type CommerceContentTargetKind,
  type CommerceModerationAction,
} from "@/lib/store/content-reports.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

type ActionLogViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly actions: readonly CommerceModerationAction[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

export default function CommerceModerationActionLog({
  targetKind,
}: {
  readonly targetKind: CommerceContentTargetKind | "all";
}) {
  const log = useCommerceModerationActionLog(targetKind);

  const viewState: ActionLogViewState = (() => {
    if (log.isLoadingFirstPage) return { status: "loading" };
    if (log.firstPageErrorMessage !== null) {
      return { status: "error", message: log.firstPageErrorMessage };
    }
    if (log.rows.length === 0) return { status: "empty" };
    return {
      status: "ready",
      actions: log.rows,
      hasNextPage: log.hasNextPage,
      isFetchingNextPage: log.isFetchingNextPage,
      loadMoreErrorMessage: log.loadMoreErrorMessage,
      loadNextPage: log.loadNextPage,
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
          Nothing has been actioned yet.
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3">
          {viewState.actions.map((action) => (
            <ActionCard key={action.id} action={action} />
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
              {viewState.isFetchingNextPage ? "Loading…" : "Load newer actions"}
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

type ActionRowState =
  | { readonly status: "idle" }
  | { readonly status: "restoring" }
  | { readonly status: "refused"; readonly message: string };

function ActionCard({ action }: { readonly action: CommerceModerationAction }) {
  const [rowState, setRowState] = useState<ActionRowState>({ status: "idle" });
  const [restoreReason, setRestoreReason] = useState("");

  const restoreMutation = useRestoreCommerceContentMutation();
  const restoreKey = useResettableAttemptIdempotencyKey();

  const target = resolveModerationTarget(action.targetKind, action.targetId);

  // Offered on a hide and nowhere else. A `content_restored` row is already the undo, and a
  // `report_dismissed` hid nothing.
  const canOfferRestore = action.actionKind === "content_hidden" && target.kind === "resolved";

  const handleRestoreClick = () => {
    if (target.kind !== "resolved" || restoreReason.trim() === "") return;
    setRowState({ status: "restoring" });
    restoreMutation.mutate(
      {
        input: {
          targetKind: target.targetKind,
          targetId: target.targetId,
          reasonNote: restoreReason.trim(),
        },
        idempotencyKey: restoreKey.getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            restoreKey.resetIdempotencyKey();
            setRestoreReason("");
            setRowState({ status: "idle" });
            return;
          }
          setRowState({ status: "refused", message: result.error.message });
        },
        onError: (error) => setRowState({ status: "refused", message: error.message }),
      },
    );
  };

  return (
    <article className={CARD_CLASS}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">
          {COMMERCE_MODERATION_ACTION_KIND_LABELS[action.actionKind]} ·{" "}
          {COMMERCE_CONTENT_TARGET_KIND_NOUNS[action.targetKind]}
        </h2>
        <span className="text-xs text-muted-foreground">
          {COMMERCE_MODERATION_ACTION_SOURCE_LABELS[action.actionSource]} ·{" "}
          {formatIsoInstantLabel(action.createdAt)}
        </span>
      </header>

      {target.kind === "resolved" ? (
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{target.targetId}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          This action has no target on record, so nothing can be restored from it.
        </p>
      )}

      {action.reasonNote !== null && (
        <p className="mt-2 text-sm leading-5 text-foreground">{action.reasonNote}</p>
      )}

      {canOfferRestore && (
        <div className="mt-3 space-y-2 border-t border-[#CAC4D0]/60 pt-3">
          <label className="block text-xs text-muted-foreground">
            Reason for putting this back (required)
            <textarea
              value={restoreReason}
              maxLength={2000}
              rows={2}
              onChange={(changeEvent) => setRestoreReason(changeEvent.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="button"
            disabled={rowState.status === "restoring" || restoreReason.trim() === ""}
            onClick={handleRestoreClick}
            className={QUIET_BUTTON_CLASS}
          >
            {rowState.status === "restoring" ? "Restoring…" : "Restore this content"}
          </button>
          <p className="text-xs text-muted-foreground">
            If this is already back up, restoring changes nothing — but it is recorded.
          </p>
        </div>
      )}

      {rowState.status === "refused" && (
        <output role="alert" className="mt-2 block text-xs text-red-700">
          {rowState.message}
        </output>
      )}
    </article>
  );
}
