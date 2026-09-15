"use client";

// TRANSPORT: client-query — `GET /admin/feedback` and `POST /admin/feedback/:id/decisions`,
// behind `moderate_content`.
//
// `restricted` IS A VIEW STATE AND IT WINS OVER `loading`, the ordering the other queues
// established: "nothing to show because you may not look" is a different answer from "nothing
// to show", and a disabled React Query sits in `pending` forever — so checking `isPending`
// first would spin permanently for anyone without the capability.
//
// ## ⚠️ THIS IS THE ONLY PLACE FEEDBACK IS READ, AND IT DID NOT EXIST FOR MONTHS
//
// `GET /admin/feedback` shipped with the write, capability check and all, and nothing in this
// repo called it. Feedback was write-only in practice: people filed notes and there was no
// surface on which anybody could see them. Deleting this page puts the product back there.
//
// ## TRIAGE IS NOT A VERDICT, AND THE COPY MUST NOT DRIFT INTO ONE
//
// `Reviewed` means a staff member read it. It is not "accepted", "planned" or "fixed", and the
// person who wrote the note sees this flag on their own page as "Read by the team" — so a
// moderator pressing it is making a claim to somebody, just a very small one. `Closed` means
// nobody intends to look again. Neither writes an audit entry, neither notifies anyone, and
// neither can be undone through this page: the wire enum has no `new`.
//
// ## NO REPLY BOX, AND THERE IS NOTHING TO BUILD ONE ON
//
// The support queue beside this one has a composer because a case is a conversation with a
// thread table behind it. Feedback has one row and no correspondence. A reply box here would
// need somewhere to put the reply and somewhere to deliver it, and there is neither.

import { useMemo, useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useDecidePlatformFeedbackMutation,
  usePlatformFeedbackQueueQuery,
} from "@/hooks/platform/admin-feedback";
import { FEEDBACK_QUEUE_CAPABILITY } from "@/lib/platform/admin-feedback.api";
import {
  PLATFORM_FEEDBACK_CATEGORY_LABELS,
  PLATFORM_FEEDBACK_STATUSES,
  PLATFORM_FEEDBACK_STATUS_QUEUE_LABELS,
  type PlatformFeedbackStatus,
  type StaffPlatformFeedback,
} from "@/lib/platform/feedback.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

type QueueViewState =
  | { readonly status: "restricted" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly rows: readonly StaffPlatformFeedback[] };

export default function FeedbackQueuePage() {
  const [statusFilter, setStatusFilter] = useState<PlatformFeedbackStatus | undefined>("new");

  const staffContextQuery = useOwnStaffContextQuery();
  const canModerateContent =
    staffContextQuery.data?.capabilities.includes(FEEDBACK_QUEUE_CAPABILITY) ?? false;

  const queueQuery = usePlatformFeedbackQueueQuery(statusFilter, canModerateContent);
  const decideMutation = useDecidePlatformFeedbackMutation();

  const viewState = useMemo<QueueViewState>(() => {
    // `canModerateContent` first — see the header.
    if (!canModerateContent) return { status: "restricted" };
    if (queueQuery.isPending) return { status: "loading" };
    if (queueQuery.isError) return { status: "error", message: queueQuery.error.apiError.message };

    const rows = queueQuery.data.pages.flatMap((page) => page.rows);
    if (rows.length === 0) return { status: "empty" };
    return { status: "ready", rows };
  }, [canModerateContent, queueQuery]);

  return (
    <div className="p-6">
      <header className="pb-4">
        <h1 className="text-lg font-semibold text-foreground">Site feedback</h1>
        <p className="max-w-2xl text-xs leading-4 text-muted-foreground">
          What people say about Qatoto itself, oldest first. Nothing here is a report about a person
          or a piece of content, so there is nobody to action and no verdict to reach. Marking a
          note read tells its author that somebody looked; it does not promise them anything.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 pb-4">
        <button
          type="button"
          aria-pressed={statusFilter === undefined}
          onClick={() => setStatusFilter(undefined)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${
            statusFilter === undefined
              ? "bg-foreground text-background"
              : "bg-background text-muted-foreground outline -outline-offset-1 outline-border"
          }`}
        >
          Everything
        </button>
        {PLATFORM_FEEDBACK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground outline -outline-offset-1 outline-border"
            }`}
          >
            {PLATFORM_FEEDBACK_STATUS_QUEUE_LABELS[status]}
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
          {viewState.rows.map((note) => (
            <li key={note.feedbackId} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {PLATFORM_FEEDBACK_CATEGORY_LABELS[note.category]}
                </p>
                <span className="text-xs text-muted-foreground">
                  {PLATFORM_FEEDBACK_STATUS_QUEUE_LABELS[note.status]}
                </span>
              </div>

              <p className="mt-2 text-sm leading-5 whitespace-pre-line text-foreground">
                {note.message}
              </p>

              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                {/* AN ERASED AUTHOR IS AN ORDINARY ROW. `user_id` is `ON DELETE SET NULL` and
                    the anonymization manifest nulls it, keeping the note. Say "account erased"
                    rather than printing a blank or inventing a placeholder name. */}
                {note.author === null ? (
                  "Account erased"
                ) : (
                  <>
                    {note.author.name}
                    {note.author.handle !== null && ` @${note.author.handle}`}
                  </>
                )}
                {" · sent "}
                {formatIsoInstantLabel(note.createdAt)}
                {" · from "}
                {note.pagePath}
              </p>

              {note.userAgent !== null && (
                <p className="mt-1 text-[11px] leading-4 break-all text-muted-foreground">
                  {note.userAgent}
                </p>
              )}

              {/* CLOSED IS THE END OF THE ROAD: the wire enum has no `new`, so there is no
                  control that could bring a closed note back, and rendering dead buttons
                  would imply otherwise. */}
              {note.status === "closed" ? (
                <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
                  Closed. This cannot be reopened from here.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {note.status !== "reviewed" && (
                    <button
                      type="button"
                      disabled={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({
                          feedbackId: note.feedbackId,
                          decision: "reviewed",
                        })
                      }
                      className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={decideMutation.isPending}
                    onClick={() =>
                      decideMutation.mutate({ feedbackId: note.feedbackId, decision: "closed" })
                    }
                    className="cursor-pointer text-sm font-medium text-foreground underline disabled:opacity-60"
                  >
                    Close
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewState.status === "ready" && queueQuery.hasNextPage && (
        <button
          type="button"
          disabled={queueQuery.isFetchingNextPage}
          onClick={() => void queueQuery.fetchNextPage()}
          className="mt-4 cursor-pointer rounded-full border border-border px-4 py-1.5 text-xs disabled:opacity-50"
        >
          {queueQuery.isFetchingNextPage ? "Loading…" : "Load older feedback"}
        </button>
      )}

      {decideMutation.error !== null && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {decideMutation.error.apiError.message} (code {decideMutation.error.apiError.code})
        </p>
      )}
    </div>
  );
}
