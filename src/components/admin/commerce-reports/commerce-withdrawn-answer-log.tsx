"use client";

// The withdrawn-answers tab — product answers their author, or a teammate at the answering company,
// took down.
//
// ⚠️ **A WITHDRAWAL IS NOT A MODERATION EVENT, SO THE LOG TAB NEVER SHOWS ONE.** It writes no
// moderation action. This tab reads the `product_answer_withdrawn` events off the answering
// organizations' audit chains, and it is the only way a moderator can find a withdrawn answer to put
// back. The case it exists for: a teammate withdrawing a seller answer buyers relied on.
//
// ⚠️ **THE TEXT SHOWN HERE WAS WITHDRAWN BY THE PEOPLE WHO WROTE IT.** Restoring republishes it on
// the product page under their name. Only `removed_by_author` offers the control — an answer
// already back up, or hidden by a moderator since, is history here, not something to restore.
//
// NEWEST FIRST, unlike the queue: this is a record searched for a recent withdrawal, not a backlog
// worked from the front, so the next page is OLDER and the button says so.

import Link from "next/link";
import { useState } from "react";

import {
  useRestoreCommerceContentMutation,
  useWithdrawnProductAnswerLog,
} from "@/hooks/store/admin-content-reports";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  ANSWER_WITHDRAWER_KIND_LABELS,
  COMMERCE_UGC_VISIBILITY_STATE_LABELS,
  ORGANIZATION_MEMBER_ROLE_LABELS,
  PRODUCT_ANSWER_AUTHOR_KIND_LABELS,
  type WithdrawnAnswerStateFilter,
  type WithdrawnProductAnswer,
} from "@/lib/store/content-reports.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-outline-variant/60 p-4";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-outline-variant/60 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

type WithdrawnAnswerLogViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly withdrawals: readonly WithdrawnProductAnswer[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

export default function CommerceWithdrawnAnswerLog({
  state,
}: {
  readonly state: WithdrawnAnswerStateFilter;
}) {
  const log = useWithdrawnProductAnswerLog(state);

  const viewState: WithdrawnAnswerLogViewState = (() => {
    if (log.isLoadingFirstPage) return { status: "loading" };
    if (log.firstPageErrorMessage !== null) {
      return { status: "error", message: log.firstPageErrorMessage };
    }
    if (log.rows.length === 0) return { status: "empty" };
    return {
      status: "ready",
      withdrawals: log.rows,
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
        <p className="rounded-2xl border border-outline-variant/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          {state === "still_withdrawn"
            ? "No answer is withdrawn right now."
            : "No answer has been withdrawn yet."}
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3">
          {viewState.withdrawals.map((withdrawal) => (
            <WithdrawnAnswerCard key={withdrawal.auditEntryId} withdrawal={withdrawal} />
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
              {viewState.isFetchingNextPage ? "Loading…" : "Load older withdrawals"}
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

type WithdrawnAnswerRowState =
  | { readonly status: "idle" }
  | { readonly status: "restoring" }
  | { readonly status: "refused"; readonly message: string };

function WithdrawnAnswerCard({ withdrawal }: { readonly withdrawal: WithdrawnProductAnswer }) {
  const [rowState, setRowState] = useState<WithdrawnAnswerRowState>({ status: "idle" });
  const [restoreReason, setRestoreReason] = useState("");

  const restoreMutation = useRestoreCommerceContentMutation();
  const restoreKey = useResettableAttemptIdempotencyKey();

  const canOfferRestore = withdrawal.currentVisibilityState === "removed_by_author";

  const handleRestoreClick = () => {
    if (!canOfferRestore || restoreReason.trim() === "") return;
    setRowState({ status: "restoring" });
    restoreMutation.mutate(
      {
        input: {
          targetKind: "answer",
          targetId: withdrawal.answerId,
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
          {PRODUCT_ANSWER_AUTHOR_KIND_LABELS[withdrawal.authorKind]} ·{" "}
          {COMMERCE_UGC_VISIBILITY_STATE_LABELS[withdrawal.currentVisibilityState]}
        </h2>
        <span className="text-xs text-muted-foreground">
          {formatIsoInstantLabel(withdrawal.withdrawnAt)}
        </span>
      </header>

      <p className="mt-1 text-xs text-muted-foreground">
        {withdrawal.productPublicSlug === null ? (
          withdrawal.productTitle
        ) : (
          <Link
            href={`/store/product/${encodeURIComponent(withdrawal.productPublicSlug)}`}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {withdrawal.productTitle}
          </Link>
        )}
      </p>

      <p className="mt-3 text-xs text-muted-foreground">Question</p>
      <p className="text-sm leading-5 text-foreground">{withdrawal.questionBodyText}</p>

      <p className="mt-3 text-xs text-muted-foreground">Withdrawn answer</p>
      <p className="text-sm leading-5 whitespace-pre-line text-foreground">
        {withdrawal.answerBodyText}
      </p>

      <p className="mt-3 text-xs text-muted-foreground">
        {withdrawal.withdrawnBy === null
          ? "Who withdrew it isn't on record."
          : ANSWER_WITHDRAWER_KIND_LABELS[withdrawal.withdrawnBy]}
        {withdrawal.actorMemberRoleSnapshot !== null &&
          ` · ${ORGANIZATION_MEMBER_ROLE_LABELS[withdrawal.actorMemberRoleSnapshot]} at the time`}
      </p>
      <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
        {withdrawal.answerId}
      </p>

      {canOfferRestore && (
        <div className="mt-3 space-y-2 border-t border-outline-variant/60 pt-3">
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
            {rowState.status === "restoring" ? "Restoring…" : "Restore this answer"}
          </button>
          <p className="text-xs text-muted-foreground">
            Restoring puts this answer back on the product page under its original author, who took
            it down. The withdrawal stays on record.
          </p>
        </div>
      )}

      {rowState.status === "refused" && (
        <output role="alert" className="mt-2 block text-xs text-destructive">
          {rowState.message}
        </output>
      )}
    </article>
  );
}
