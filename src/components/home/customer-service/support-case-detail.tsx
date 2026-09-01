// TRANSPORT: client-query — reads GET /support/cases/:caseId and writes
// POST /support/cases/:caseId/messages.
"use client";

// FOUR RULES, three of them inherited from `dispute-detail.tsx` because they are the same
// problem:
//
//  1. A 404 IS NOT A PERMISSION HINT. The backend answers 404 for "no such case" and "not
//     yours" with one code so the route cannot enumerate ids. One sentence covers both, and it
//     never says "you do not have access" — that would undo the protection in the copy.
//  2. THE THREAD ORDERS BY `sequence`, NOT BY TIME. Sequence is gapless and assigned under the
//     case's row lock; two messages can share a millisecond, and a record that reorders itself
//     on refresh is one nobody can cite.
//  3. NOTHING IS OPTIMISTIC. The write answers the whole updated case and the hook writes that
//     into the cache, so what is on screen is what the server holds.
//  4. THE COMPOSER OBEYS `canOpenerReply`, WHICH IS THE SERVER'S ANSWER. A resolved case is
//     reopenable by replying, but only inside a window measured on the backend's clock. This
//     component must not compute its own version of that rule — it would eventually disagree,
//     and the failure mode is a composer that 409s or a missing one that would have worked.
//
// THE STAFF SIDE IS NEVER NAMED. The wire carries `authorKind` and no author, so a reply shows
// as "Qatoto support" — naming the person who answered makes a decision personal, the same
// reasoning that keeps a moderator out of `/report-history`.

import { useMemo, useState } from "react";

import Link from "next/link";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import StatusPanel from "@/components/home/shared/status-panel";
import { useAddOwnSupportCaseMessageMutation, useOwnSupportCaseQuery } from "@/hooks/support/cases";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { ApiRequestError, isUnauthorized } from "@/lib/http";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  SUPPORT_CASE_CATEGORY_LABELS,
  SUPPORT_CASE_MESSAGE_MAXIMUM_LENGTH,
  SUPPORT_CASE_STATE_LABELS,
  SUPPORT_STAFF_AUTHOR_LABEL,
  type SupportCaseDetail as SupportCaseDetailValue,
  type SupportCaseMessage,
} from "@/lib/support/schemas";

type SupportCaseViewState =
  | { status: "loading" }
  | { status: "signInRequired" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "ready"; supportCase: SupportCaseDetailValue };

export default function SupportCaseDetail({ caseId }: { caseId: string }) {
  const supportCaseQuery = useOwnSupportCaseQuery(caseId);

  const viewState = useMemo<SupportCaseViewState>(() => {
    if (supportCaseQuery.isPending) return { status: "loading" };
    if (supportCaseQuery.isError) {
      const { apiError } = supportCaseQuery.error;
      if (isUnauthorized(apiError)) return { status: "signInRequired" };
      // ONE BRANCH FOR BOTH FACTS — see rule 1.
      if (apiError.code === "404") return { status: "notFound" };
      return { status: "error", message: apiError.message };
    }
    return { status: "ready", supportCase: supportCaseQuery.data };
  }, [supportCaseQuery]);

  switch (viewState.status) {
    case "loading":
      return <p className="text-sm text-muted-foreground">Loading this case…</p>;
    case "signInRequired":
      return (
        <StatusPanel
          message="Sign in to read this case."
          className="border border-border px-6 py-16"
          action={
            <Link
              href="/sign-in"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          }
        />
      );
    case "notFound":
      return (
        <StatusPanel
          message="We can't find that case."
          className="border border-border px-6 py-16"
          action={
            <Link
              href="/customer-service"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Customer service
            </Link>
          }
        />
      );
    case "error":
      return (
        <StatusPanel message={viewState.message} className="border border-border px-6 py-16" />
      );
    case "ready":
      return <SupportCaseBody supportCase={viewState.supportCase} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function SupportCaseBody({ supportCase }: { supportCase: SupportCaseDetailValue }) {
  return (
    <div>
      <header>
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Support case · {SUPPORT_CASE_STATE_LABELS[supportCase.state]}
        </p>
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          {supportCase.subject}
        </h1>
        <p className="mt-2 text-xs leading-4 text-muted-foreground">
          {SUPPORT_CASE_CATEGORY_LABELS[supportCase.category]} · opened{" "}
          {formatIsoInstantLabel(supportCase.createdAt)}
          {supportCase.orderReference !== null && (
            <>
              {" · "}
              {/* Text the person typed, shown back as text. There is nothing to link to —
                  the backend stores a reference, not an order id. */}
              order reference {supportCase.orderReference}
            </>
          )}
        </p>
      </header>

      <section aria-label="The conversation" className="mt-4">
        <ol className="space-y-3">
          <li className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs leading-4 text-muted-foreground">
              You · {formatIsoInstantLabel(supportCase.createdAt)}
            </p>
            <p className="mt-1 text-sm leading-5 whitespace-pre-line text-foreground">
              {supportCase.description}
            </p>
          </li>

          {/* `toSorted` rather than trusting arrival order — see rule 2. */}
          {supportCase.messages
            .toSorted((left, right) => left.sequence - right.sequence)
            .map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
        </ol>
      </section>

      {supportCase.canOpenerReply ? (
        <ReplyComposer caseId={supportCase.id} />
      ) : (
        <p className="mt-4 text-xs leading-4 text-muted-foreground">
          {supportCase.state === "closed"
            ? "This case is closed and nothing further can be added to it."
            : "This case was resolved too long ago to reopen. Open a new case if the problem is back."}
        </p>
      )}
    </div>
  );
}

function MessageRow({ message }: { message: SupportCaseMessage }) {
  const isStaffMessage = message.authorKind === "staff";

  return (
    <li
      className={`rounded-xl px-4 py-3 ${
        isStaffMessage ? "border-l-4 border-[#00696E] bg-muted" : "border border-border"
      }`}
    >
      <p className="text-xs leading-4 text-muted-foreground">
        {isStaffMessage ? SUPPORT_STAFF_AUTHOR_LABEL : "You"} ·{" "}
        {formatIsoInstantLabel(message.createdAt)}
      </p>
      <p className="mt-1 text-sm leading-5 whitespace-pre-line text-foreground">{message.body}</p>
    </li>
  );
}

/**
 * The person's reply.
 *
 * THE KEY ROTATES ONLY AFTER A CONFIRMED SUCCESS. This composer stays mounted, so a second,
 * different reply minutes later must not dedupe against the first — and a retry of a
 * timed-out one must carry the original key, which is the entire mechanism.
 */
function ReplyComposer({ caseId }: { caseId: string }) {
  const [replyBody, setReplyBody] = useState("");
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const addMessageMutation = useAddOwnSupportCaseMessageMutation(caseId);

  const trimmedReply = replyBody.trim();
  const isSubmittable = trimmedReply.length > 0 && !addMessageMutation.isPending;

  const replyError =
    addMessageMutation.error instanceof ApiRequestError ? addMessageMutation.error.apiError : null;

  return (
    <section aria-label="Reply" className="mt-4">
      <label className="block text-xs leading-4 text-muted-foreground" htmlFor="support-reply">
        Add to this case
      </label>
      <textarea
        id="support-reply"
        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
        rows={4}
        maxLength={SUPPORT_CASE_MESSAGE_MAXIMUM_LENGTH}
        value={replyBody}
        onChange={(changeEvent) => setReplyBody(changeEvent.target.value)}
      />
      <button
        type="button"
        disabled={!isSubmittable}
        onClick={() =>
          addMessageMutation.mutate(
            { body: trimmedReply, idempotencyKey: getIdempotencyKey() },
            {
              onSuccess: () => {
                setReplyBody("");
                resetIdempotencyKey();
              },
            },
          )
        }
        className="mt-2 cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {addMessageMutation.isPending ? "Sending…" : "Send"}
      </button>
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        Messages cannot be edited or removed once sent.
      </p>

      {replyError !== null && (
        <div className="mt-2">
          <MutationErrorNotice error={replyError} />
        </div>
      )}
    </section>
  );
}
