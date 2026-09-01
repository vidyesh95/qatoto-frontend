"use client";

// TRANSPORT: client-query — `GET/POST /support/admin/*`, behind `handle_support_cases`.
//
// `restricted` IS A VIEW STATE AND IT WINS OVER `loading`, the ordering the report queues
// established: "nothing to show because you may not look" is a different answer from "nothing
// to show", and a disabled React Query sits in `pending` forever — so checking `isPending`
// first would spin permanently for anyone without the capability.
//
// ## ⚠️ WHAT AN ANSWER HERE CAN AND CANNOT DO
//
// It can explain, ask for detail, and point at the surface that records what happened. It
// CANNOT move money: Qatoto holds no funds, there is no escrow, and nothing on this page
// releases or refunds anything. A reply that promises a recovery is a promise the platform
// cannot keep, and the person will hold us to it.
//
// ## RESOLVE IS NOT CLOSE
//
// `resolved` leaves the door open — the person can reply and reopen the case for a while.
// `closed` is terminal for everybody, staff included. Both require a note, and that note is
// appended to the thread as the last message: it is the sentence the person reads, not an
// internal annotation.
//
// ## THE THREAD IS FETCHED PER OPENED CARD
//
// The queue read carries summaries only, so expanding a card mounts its own detail query
// rather than the list over-fetching every thread nobody opened. Each card also holds its OWN
// draft — one shared textarea across two open cards is how a reply lands on the wrong case.

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useAddStaffSupportCaseMessageMutation,
  useDecideSupportCaseMutation,
  useStaffSupportCaseQuery,
  useSupportCaseQueueQuery,
} from "@/hooks/support/admin-queue";
import { newIdempotencyKey } from "@/lib/idempotency";
import { formatIsoInstantLabel } from "@/lib/store/format";
import { SUPPORT_QUEUE_CAPABILITY } from "@/lib/support/admin.api";
import {
  SUPPORT_CASE_CATEGORIES,
  SUPPORT_CASE_CATEGORY_LABELS,
  SUPPORT_CASE_MESSAGE_MAXIMUM_LENGTH,
  SUPPORT_CASE_STATE_QUEUE_LABELS,
  SUPPORT_STAFF_AUTHOR_LABEL,
  type StaffSupportCaseSummary,
  type SupportCaseCategory,
  type SupportCaseState,
} from "@/lib/support/schemas";

type QueueViewState =
  | { readonly status: "restricted" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly rows: readonly StaffSupportCaseSummary[] };

const STATE_FILTERS: readonly SupportCaseState[] = ["open", "awaiting_user", "resolved", "closed"];

export default function SupportCaseQueuePage() {
  const [stateFilter, setStateFilter] = useState<SupportCaseState>("open");
  const [categoryFilter, setCategoryFilter] = useState<SupportCaseCategory | undefined>(undefined);
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);

  const staffContextQuery = useOwnStaffContextQuery();
  const canHandleSupportCases =
    staffContextQuery.data?.capabilities.includes(SUPPORT_QUEUE_CAPABILITY) ?? false;

  const queueQuery = useSupportCaseQueueQuery(
    { state: stateFilter, ...(categoryFilter === undefined ? {} : { category: categoryFilter }) },
    canHandleSupportCases,
  );

  // `canHandleSupportCases` first — see the header.
  const viewState: QueueViewState = !canHandleSupportCases
    ? { status: "restricted" }
    : queueQuery.isPending
      ? { status: "loading" }
      : queueQuery.isError
        ? { status: "error", message: queueQuery.error.apiError.message }
        : queueQuery.data.rows.length === 0
          ? { status: "empty" }
          : { status: "ready", rows: queueQuery.data.rows };

  return (
    <div className="p-6">
      <header className="pb-4">
        <h1 className="text-lg font-semibold text-foreground">Support cases</h1>
        <p className="text-xs text-muted-foreground">
          People who wrote in. A reply reaches them in the app and by email. Qatoto holds no money,
          so nothing here can refund or release a payment — say what happened and point at the
          record of it.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 pb-2">
        {STATE_FILTERS.map((state) => (
          <button
            key={state}
            type="button"
            aria-pressed={stateFilter === state}
            onClick={() => setStateFilter(state)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              stateFilter === state
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground outline -outline-offset-1 outline-border"
            }`}
          >
            {SUPPORT_CASE_STATE_QUEUE_LABELS[state]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pb-4">
        <button
          type="button"
          aria-pressed={categoryFilter === undefined}
          onClick={() => setCategoryFilter(undefined)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
            categoryFilter === undefined
              ? "bg-foreground text-background"
              : "bg-background text-muted-foreground outline -outline-offset-1 outline-border"
          }`}
        >
          Every kind
        </button>
        {SUPPORT_CASE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={categoryFilter === category}
            onClick={() => setCategoryFilter(category)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
              categoryFilter === category
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground outline -outline-offset-1 outline-border"
            }`}
          >
            {category.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {viewState.status === "restricted" && (
        <p className="text-sm text-muted-foreground">
          You do not hold the capability that opens this queue.
        </p>
      )}
      {viewState.status === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}
      {viewState.status === "error" && (
        <p className="text-sm text-muted-foreground">{viewState.message}</p>
      )}
      {viewState.status === "empty" && (
        <p className="text-sm text-muted-foreground">Nothing in this queue.</p>
      )}

      {viewState.status === "ready" && (
        <ul className="space-y-4">
          {viewState.rows.map((supportCase) => (
            <li key={supportCase.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{supportCase.subject}</p>
                <span className="text-xs text-muted-foreground">
                  {SUPPORT_CASE_STATE_QUEUE_LABELS[supportCase.state]}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-muted-foreground">
                {supportCase.openerName}
                {supportCase.openerHandle !== null && ` @${supportCase.openerHandle}`} ·{" "}
                {SUPPORT_CASE_CATEGORY_LABELS[supportCase.category]} · opened{" "}
                {formatIsoInstantLabel(supportCase.createdAt)}
                {supportCase.orderReference !== null &&
                  ` · order reference ${supportCase.orderReference}`}
              </p>

              <button
                type="button"
                onClick={() =>
                  setOpenCaseId((currentId) =>
                    currentId === supportCase.id ? null : supportCase.id,
                  )
                }
                className="mt-2 cursor-pointer text-sm font-medium text-foreground underline"
              >
                {openCaseId === supportCase.id ? "Hide the conversation" : "Open the conversation"}
              </button>

              {openCaseId === supportCase.id && <SupportCaseWorkspace caseId={supportCase.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One opened case: the thread, a reply box, and the two verdicts.
 *
 * ITS OWN COMPONENT so the draft and the idempotency key live per case. Hoisting either into
 * the list would share one textarea across every expanded card, and a reply would land on
 * whichever case was open last.
 */
function SupportCaseWorkspace({ caseId }: { caseId: string }) {
  const [replyBody, setReplyBody] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const caseQuery = useStaffSupportCaseQuery(caseId, true);
  const replyMutation = useAddStaffSupportCaseMessageMutation();
  const decideMutation = useDecideSupportCaseMutation();

  const trimmedReply = replyBody.trim();
  const trimmedDecisionNote = decisionNote.trim();

  const activeError = replyMutation.error ?? decideMutation.error ?? caseQuery.error ?? null;

  if (caseQuery.isPending) {
    return <p className="mt-3 text-xs text-muted-foreground">Loading the conversation…</p>;
  }
  if (caseQuery.isError) {
    return <p className="mt-3 text-xs text-muted-foreground">{caseQuery.error.apiError.message}</p>;
  }

  const supportCase = caseQuery.data;
  const isWritable = supportCase.state !== "closed";

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg bg-muted px-3 py-2">
        <p className="text-[11px] font-medium text-foreground">What they wrote</p>
        <p className="mt-1 text-xs whitespace-pre-line text-foreground">
          {supportCase.description}
        </p>
      </div>

      {supportCase.messages.length > 0 && (
        <ol className="space-y-2">
          {supportCase.messages
            .toSorted((left, right) => left.sequence - right.sequence)
            .map((message) => (
              <li key={message.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  {message.authorKind === "staff"
                    ? SUPPORT_STAFF_AUTHOR_LABEL
                    : supportCase.openerName}{" "}
                  · {formatIsoInstantLabel(message.createdAt)}
                </p>
                <p className="mt-1 text-xs whitespace-pre-line text-foreground">{message.body}</p>
              </li>
            ))}
        </ol>
      )}

      {isWritable ? (
        <>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">
              Reply — they read this
            </span>
            <textarea
              value={replyBody}
              onChange={(changeEvent) => setReplyBody(changeEvent.target.value)}
              rows={3}
              maxLength={SUPPORT_CASE_MESSAGE_MAXIMUM_LENGTH}
              className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            disabled={trimmedReply === "" || replyMutation.isPending}
            onClick={() =>
              replyMutation.mutate(
                {
                  caseId,
                  body: trimmedReply,
                  // Minted per press and rotated by the fresh call on the next one: a retry of
                  // THIS press carries this key, which is what dedupes a timed-out reply.
                  idempotencyKey: newIdempotencyKey(),
                },
                { onSuccess: () => setReplyBody("") },
              )
            }
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {replyMutation.isPending ? "Sending…" : "Send reply"}
          </button>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">
              Closing note (required to resolve or close — they read this too)
            </span>
            <textarea
              value={decisionNote}
              onChange={(changeEvent) => setDecisionNote(changeEvent.target.value)}
              rows={2}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={trimmedDecisionNote === "" || decideMutation.isPending}
              onClick={() =>
                decideMutation.mutate(
                  {
                    caseId,
                    decision: "resolved",
                    note: trimmedDecisionNote,
                    idempotencyKey: newIdempotencyKey(),
                  },
                  { onSuccess: () => setDecisionNote("") },
                )
              }
              className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Resolve
            </button>
            <button
              type="button"
              disabled={trimmedDecisionNote === "" || decideMutation.isPending}
              onClick={() =>
                decideMutation.mutate(
                  {
                    caseId,
                    decision: "closed",
                    note: trimmedDecisionNote,
                    idempotencyKey: newIdempotencyKey(),
                  },
                  { onSuccess: () => setDecisionNote("") },
                )
              }
              className="cursor-pointer text-sm font-medium text-foreground underline disabled:opacity-60"
            >
              Close for good
            </button>
          </div>
          <p className="text-[11px] leading-4 text-muted-foreground">
            Resolving leaves the case reopenable — they can reply and it comes back. Closing is
            final for both of you.
          </p>
        </>
      ) : (
        <p className="text-[11px] leading-4 text-muted-foreground">
          This case is closed. Nothing further can be added to it by either side.
        </p>
      )}

      {activeError !== null && (
        <p role="alert" className="text-xs text-destructive">
          {activeError.apiError.message} (code {activeError.apiError.code})
        </p>
      )}
    </div>
  );
}
