// TRANSPORT: client-query — writes replies, accept-answer, helpful votes and reports.
"use client";

// The interactive half of `/store/forum/:threadSlug`. The server component renders the question;
// everything a signed-in reader can DO to the thread lives here, because all of it is
// session-scoped and none of it is cacheable.
//
// FIVE RULES THIS COMPONENT EXISTS TO HOLD, each one a thing the UI must be unable to say:
//
//  1. THERE IS NO DOWNVOTE, and there is no place to add one. `helpfulCount` is a count, not a
//     score. A negative signal against a named organization on a commerce platform is a
//     reputational act, and this surface has no appeal process to put behind one. The toggle has
//     two positions: endorsed, and not endorsed.
//
//  2. `viewer === null` IS NOT `hasMarkedHelpful === false`. The first means nobody is signed in,
//     so the control is a sign-in link; the second means a signed-in reader has not endorsed this,
//     so it is an empty toggle they can press. Rendering a defaulted `false` for an anonymous
//     reader shows them a control that will 401 (A11/A24).
//
//  3. ONLY THE THREAD AUTHOR SEES ACCEPT-ANSWER, read from `detail.viewer.isThreadAuthor`. The
//     backend enforces it either way; showing the control to everybody would just mean most people
//     press a button that refuses.
//
//  4. A LOCKED THREAD REFUSES REPLIES AND STILL ACCEPTS AN ANSWER. Locking stops new text, not
//     bookkeeping — so the composer disappears and the accept control does not.
//
//  5. A HIDDEN REPLY KEEPS ITS PLACE. It renders as a removal notice rather than vanishing,
//     because a conversation with a silent hole in it reads as though the answer above it was
//     never challenged. The body arrives on the wire and this component is what withholds it.
//
// NOTHING IS OPTIMISTIC, including the helpful toggle — see `hooks/store/forum.ts` for why.

import Link from "next/link";
import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import {
  useAcceptForumReply,
  useClearForumAcceptedReply,
  useCreateCommunityReport,
  useCreateForumReply,
  useSetForumReplyHelpful,
} from "@/hooks/store/forum";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  COMMUNITY_REPORT_REASON_LABELS,
  COMMUNITY_REPORT_REASONS,
  type CommunityReportReason,
  type CommunityReportTargetKind,
  type ForumReply,
  type ForumThreadDetail,
} from "@/lib/store/forum.schemas";

const PANEL_CLASS = "rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]";

/**
 * A `<select>` value narrowed to the enum, by LOOKUP rather than by assertion.
 *
 * `event.target.value` is a `string` and `as CommunityReportReason` would be a lie the compiler
 * accepts — the same lie CLAUDE.md Pattern 2 forbids on a network payload, and a DOM value is no
 * more trustworthy than a network one. Finding the member in the real tuple is the check.
 */
function toReportReason(candidate: string): CommunityReportReason {
  return COMMUNITY_REPORT_REASONS.find((reason) => reason === candidate) ?? "other";
}

const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const QUIET_BUTTON_CLASS =
  "rounded-full px-3 py-1 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-muted disabled:opacity-50";

export default function ForumThreadConversation({ detail }: { detail: ForumThreadDetail }) {
  const { thread, replies } = detail;
  const isThreadAuthor = detail.viewer?.isThreadAuthor ?? false;
  // `open` and `answered` accept replies; `locked` does not. `pending_review` never reaches a
  // public read at all, so it cannot appear here — but the check is written positively rather
  // than as `!== "locked"` so a new state defaults to refusing rather than to allowing.
  const isAcceptingReplies = thread.state === "open" || thread.state === "answered";

  return (
    <section className="px-4 pt-6 lg:px-6" aria-label="Replies">
      <h2 className="pb-2 text-sm font-medium tracking-wide text-[#191C1C]">
        {replies.items.length === 0
          ? "No replies yet"
          : `${formatCountLabel(thread.replyCount)} ${thread.replyCount === 1 ? "reply" : "replies"}`}
      </h2>

      {replies.items.length === 0 ? (
        <p className="text-sm leading-5 text-[#6F7979]">
          Nobody has answered this one. It is still open.
        </p>
      ) : (
        <ul className="space-y-3">
          {replies.items.map((reply) => (
            <li key={reply.id}>
              {/* The accepted reply appears here too, in sequence — see the page header. */}
              <ReplyCard
                reply={reply}
                threadId={thread.id}
                isAccepted={reply.id === thread.acceptedReplyId}
                isThreadAuthor={isThreadAuthor}
              />
            </li>
          ))}
        </ul>
      )}

      {isAcceptingReplies ? (
        <ReplyComposer threadId={thread.id} />
      ) : (
        <p className={`mt-6 ${PANEL_CLASS}`}>
          This thread is locked, so nobody can add to it. The author can still mark an answer.
        </p>
      )}

      <ReportControl targetKind="forum_thread" targetId={thread.id} label="Report this thread" />
    </section>
  );
}

// --- One reply ---------------------------------------------------------------

function ReplyCard({
  reply,
  threadId,
  isAccepted,
  isThreadAuthor,
}: {
  reply: ForumReply;
  threadId: string;
  isAccepted: boolean;
  isThreadAuthor: boolean;
}) {
  if (reply.visibilityState === "hidden") {
    return (
      <div className="rounded-xl border border-dashed border-[#CAC4D0]/60 px-4 py-3">
        {/* The removal is rendered, not the text. The reply keeps its place — see rule 5. */}
        <p className="text-xs leading-4 text-[#6F7979]">
          A moderator removed this reply. It stays here so the thread still reads in order.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isAccepted ? "border-[#00696E]/50 bg-[#00696E]/5" : "border-[#CAC4D0]/60"
      }`}
    >
      <p className="text-xs leading-4 text-[#6F7979]">
        {reply.authorDisplayName}
        {reply.authorOrganizationName === null
          ? " · posting as an individual"
          : ` · ${reply.authorOrganizationName}`}
        {" · "}
        {formatIsoInstantLabel(reply.createdAt)}
      </p>
      <p className="mt-1.5 text-sm leading-6 whitespace-pre-line text-[#191C1C]">{reply.body}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <HelpfulControl reply={reply} />
        {isThreadAuthor && (
          <AcceptAnswerControl threadId={threadId} replyId={reply.id} isAccepted={isAccepted} />
        )}
        <ReportControl targetKind="forum_reply" targetId={reply.id} label="Report" />
      </div>
    </div>
  );
}

// --- Helpful -----------------------------------------------------------------

/**
 * The endorsement toggle.
 *
 * `reply.viewer === null` RENDERS A SIGN-IN LINK, not a pressable empty toggle. See rule 2 — an
 * anonymous reader pressing an endorse button gets a 401, and the count beside it is still worth
 * showing them.
 */
function HelpfulControl({ reply }: { reply: ForumReply }) {
  const setHelpful = useSetForumReplyHelpful();
  const hasMarkedHelpful = reply.viewer?.hasMarkedHelpful ?? false;

  const countLabel = `${formatCountLabel(reply.helpfulCount)} found this helpful`;

  if (reply.viewer === null) {
    return (
      <span className="text-[11px] leading-4 text-[#6F7979]">
        {/* Zero renders as zero — see `ForumReplySchema`. */}
        {countLabel}
        {" · "}
        <Link href="/sign-in" className="text-[#00696E] hover:underline">
          Sign in to endorse
        </Link>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        className={QUIET_BUTTON_CLASS}
        disabled={setHelpful.isPending}
        aria-pressed={hasMarkedHelpful}
        onClick={() => setHelpful.mutate({ replyId: reply.id, isHelpful: !hasMarkedHelpful })}
      >
        {/* Two positions and no third. Withdrawing an endorsement is not a downvote. */}
        {hasMarkedHelpful ? "Endorsed" : "Helpful"}
      </button>
      <span className="text-[11px] leading-4 text-[#6F7979]">{countLabel}</span>
      <MutationNotice
        result={setHelpful.data}
        fallbackMessage="That did not save. Try again."
        hasThrown={setHelpful.isError}
      />
    </span>
  );
}

// --- Accept answer -----------------------------------------------------------

/**
 * Marks or unmarks the accepted answer. Author only.
 *
 * ALLOWED WHILE THE THREAD IS LOCKED, deliberately — locking stops new text, not bookkeeping. The
 * copy says "mark as the answer" rather than "this is correct": the author is pointing at what
 * helped them, and the platform is not certifying it.
 */
function AcceptAnswerControl({
  threadId,
  replyId,
  isAccepted,
}: {
  threadId: string;
  replyId: string;
  isAccepted: boolean;
}) {
  const acceptReply = useAcceptForumReply();
  const clearAcceptedReply = useClearForumAcceptedReply();
  const activeMutation = isAccepted ? clearAcceptedReply : acceptReply;

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        className={QUIET_BUTTON_CLASS}
        disabled={acceptReply.isPending || clearAcceptedReply.isPending}
        onClick={() => {
          if (isAccepted) {
            clearAcceptedReply.mutate({ threadId });
            return;
          }
          acceptReply.mutate({ threadId, input: { replyId } });
        }}
      >
        {isAccepted ? "Unmark as the answer" : "Mark as the answer"}
      </button>
      <MutationNotice
        result={activeMutation.data}
        fallbackMessage="That did not save. Try again."
        hasThrown={activeMutation.isError}
      />
    </span>
  );
}

// --- Reply composer ----------------------------------------------------------

/**
 * Appends a reply.
 *
 * THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT and rotated only after a success, so a retry
 * after a network failure reuses it and cannot post the answer twice.
 */
function ReplyComposer({ threadId }: { threadId: string }) {
  const [body, setBody] = useState("");
  const createReply = useCreateForumReply();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const isSubmittable = body.trim().length > 0 && !createReply.isPending;
  const hasPosted = createReply.data?.success === true;

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable) return;
        createReply.mutate(
          { threadId, input: { body: body.trim() }, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (result) => {
              // ROTATED ONLY ON A CONFIRMED SUCCESS. A failure keeps the key, because a retry
              // after a network error must carry the key of the attempt it is retrying.
              if (!result.success) return;
              setBody("");
              resetIdempotencyKey();
            },
          },
        );
      }}
    >
      <label htmlFor="forum-reply-body" className="text-sm font-medium text-[#191C1C]">
        Add a reply
      </label>
      <textarea
        id="forum-reply-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={5}
        className="mt-1.5 w-full rounded-xl border border-[#CAC4D0]/60 px-3 py-2 text-sm leading-6 text-[#191C1C] outline-none focus:border-[#00696E]"
        placeholder="Answer from what you have actually done. Say what you are unsure about."
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={!isSubmittable}>
          Post reply
        </button>
        {hasPosted && (
          <span className="text-xs leading-4 text-[#4A6364]">Posted. Thanks for answering.</span>
        )}
      </div>
      <MutationNotice
        result={createReply.data}
        fallbackMessage="That reply did not post. Try again."
        hasThrown={createReply.isError}
      />
    </form>
  );
}

// --- Reporting ---------------------------------------------------------------

/**
 * Reports a thread or a reply.
 *
 * `note` IS REQUIRED ON `other` AND OPTIONAL OTHERWISE. A reason code with nothing attached is
 * unworkable for the moderator who has to act on it; requiring prose for the five named codes
 * would collect restatements of the code.
 *
 * The success copy says the report was RECEIVED, never that anything happened to the content.
 * Nothing does until a moderator decides, and implying otherwise is how a reporter concludes the
 * queue is broken when they check back.
 */
function ReportControl({
  targetKind,
  targetId,
  label,
}: {
  targetKind: CommunityReportTargetKind;
  targetId: string;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<CommunityReportReason>("off_topic");
  const [note, setNote] = useState("");
  const createReport = useCreateCommunityReport();

  const isNoteRequired = reason === "other";
  const isSubmittable = (!isNoteRequired || note.trim().length > 0) && !createReport.isPending;
  const hasReported = createReport.data?.success === true;

  if (hasReported) {
    return (
      <span className="text-[11px] leading-4 text-[#6F7979]">
        Report received. A moderator will look at it.
      </span>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="text-[11px] leading-4 text-[#6F7979] hover:underline"
        onClick={() => setIsOpen(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <form
      className="mt-2 w-full rounded-xl border border-[#CAC4D0]/60 px-3 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable) return;
        createReport.mutate({
          input: {
            targetKind,
            targetId,
            reason,
            // Omitted rather than sent as "" — a blank input is an absence, never an empty string.
            ...(note.trim().length > 0 ? { note: note.trim() } : {}),
          },
        });
      }}
    >
      <label htmlFor={`report-reason-${targetId}`} className="text-xs font-medium text-[#191C1C]">
        Why are you reporting this?
      </label>
      <select
        id={`report-reason-${targetId}`}
        value={reason}
        onChange={(event) => setReason(toReportReason(event.target.value))}
        className="mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-xs text-[#191C1C]"
      >
        {COMMUNITY_REPORT_REASONS.map((reportReason) => (
          <option key={reportReason} value={reportReason}>
            {COMMUNITY_REPORT_REASON_LABELS[reportReason]}
          </option>
        ))}
      </select>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        className="mt-2 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-xs leading-5 text-[#191C1C]"
        placeholder={isNoteRequired ? "Required — say what is wrong." : "Optional context."}
      />

      <div className="mt-2 flex items-center gap-2">
        <button type="submit" className={QUIET_BUTTON_CLASS} disabled={!isSubmittable}>
          Send report
        </button>
        <button
          type="button"
          className="text-[11px] leading-4 text-[#6F7979] hover:underline"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </button>
      </div>
      <MutationNotice
        result={createReport.data}
        fallbackMessage="That report did not send. Try again."
        hasThrown={createReport.isError}
      />
    </form>
  );
}
