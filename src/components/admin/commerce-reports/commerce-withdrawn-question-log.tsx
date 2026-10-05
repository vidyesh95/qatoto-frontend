"use client";

// The withdrawn-questions tab — product questions their asker took down.
//
// ⚠️ **A WITHDRAWAL IS NOT A MODERATION EVENT, SO THE LOG TAB NEVER SHOWS ONE.** This tab reads the
// `product_question_withdrawn` events off the SELLERS' audit chains — a question has no
// organization, so the record sits with the company it was asked of — and it is the only way a
// moderator can find a withdrawn question to put back. The case it exists for: a question whose
// answers buyers relied on, withdrawn and taking those answers down with it.
//
// ⚠️ **THE TEXT SHOWN HERE WAS WITHDRAWN BY THE PERSON WHO ASKED IT.** Restoring republishes it, and
// its answers, on the product page. Only `removed_by_author` offers the control.
//
// NEWEST FIRST, like the withdrawn-answers tab, so the next page is OLDER and the button says so.

import Link from "next/link";
import { useState } from "react";

import {
  useRestoreCommerceContentMutation,
  useWithdrawnProductQuestionLog,
} from "@/hooks/store/admin-content-reports";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  COMMERCE_UGC_VISIBILITY_STATE_LABELS,
  type WithdrawnAnswerStateFilter,
  type WithdrawnProductQuestion,
} from "@/lib/store/content-reports.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-outline-variant/60 p-4";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-outline-variant/60 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

type WithdrawnQuestionLogViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly withdrawals: readonly WithdrawnProductQuestion[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

export default function CommerceWithdrawnQuestionLog({
  state,
}: {
  readonly state: WithdrawnAnswerStateFilter;
}) {
  const log = useWithdrawnProductQuestionLog(state);

  const viewState: WithdrawnQuestionLogViewState = (() => {
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
            ? "No question is withdrawn right now."
            : "No question has been withdrawn yet."}
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3">
          {viewState.withdrawals.map((withdrawal) => (
            <WithdrawnQuestionCard key={withdrawal.auditEntryId} withdrawal={withdrawal} />
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

type WithdrawnQuestionRowState =
  | { readonly status: "idle" }
  | { readonly status: "restoring" }
  | { readonly status: "refused"; readonly message: string };

function WithdrawnQuestionCard({ withdrawal }: { readonly withdrawal: WithdrawnProductQuestion }) {
  const [rowState, setRowState] = useState<WithdrawnQuestionRowState>({ status: "idle" });
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
          targetKind: "question",
          targetId: withdrawal.questionId,
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
          Buyer question · {COMMERCE_UGC_VISIBILITY_STATE_LABELS[withdrawal.currentVisibilityState]}
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

      <p className="mt-3 text-xs text-muted-foreground">Withdrawn question</p>
      <p className="text-sm leading-5 whitespace-pre-line text-foreground">
        {withdrawal.questionBodyText}
      </p>

      <p className="mt-3 text-xs text-muted-foreground">
        {withdrawal.actorUserId === null
          ? "Withdrawn by its asker, whose account has since been erased."
          : "Withdrawn by its asker."}
        {withdrawal.answerCount > 0 &&
          ` ${String(withdrawal.answerCount)} ${withdrawal.answerCount === 1 ? "answer" : "answers"} came down with it.`}
      </p>
      <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
        {withdrawal.questionId}
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
            {rowState.status === "restoring" ? "Restoring…" : "Restore this question"}
          </button>
          <p className="text-xs text-muted-foreground">
            Restoring puts this question and its answers back on the product page under the person
            who asked it, who took it down. The withdrawal stays on record.
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
