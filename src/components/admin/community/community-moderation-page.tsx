// TRANSPORT: client-query — three queues and five decisions, all through `@/hooks/store/admin-community`.
// The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/community`. Forum threads, the replies under them, community reports and cofounder
// profiles — four surfaces, ONE capability (`moderate_content`), one page.
//
// ONE PAGE RATHER THAN FOUR, because they are one shift. A moderator working an off-topic thread
// is the same person working the report that named it and the cofounder profile that arrived an
// hour later. Splitting them into four nav entries would make the report queue the one nobody
// opens.
//
// AND SEPARATE FROM `/admin/store-categories`, because that is `moderate_commerce`. §17.4 is
// explicit about why the queues do not merge: a moderator working a counterfeit-listing queue and
// one working an off-topic-thread queue are not the same shift, they are gated by different
// capabilities, and merging them creates the coupling capabilities exist to prevent.
//
// THREE THINGS THE CONSOLE MUST NOT LET A MODERATOR BELIEVE:
//
//  1. THAT `reject` DELETES A THREAD. It does not. The thread stays `pending_review` and gains a
//     note — invisible in every public read, readable by its author on `/mine`. That pairing is
//     also why the queue predicate is "pending_review AND not yet moderated": filtering on state
//     alone would show every rejection this console has ever made, forever.
//  2. THAT DISMISSING A REPORT DOES ANYTHING TO THE CONTENT. It closes the claim. Hiding the reply
//     or rejecting the thread is a second, separate call — two routes, so the audit trail can say
//     which one happened.
//  3. THAT REJECTING A COFOUNDER PROFILE WORKS LIKE REJECTING A THREAD. It does not: a profile
//     goes back to `draft` so its owner can fix it and resubmit. Nobody edits a posted question;
//     everybody edits their own profile.
//
// `restricted` IS A VIEW STATE AND IT WINS OVER `loading`, the same call
// `store-category-admin-page.tsx` makes. None of these reads is public — the thread queue exposes
// text nobody has approved, and the report queue exposes who accused whom — so the queries are
// disabled without the capability, and "nothing to show because you may not look" is a different
// answer from "nothing to show".

import { useState } from "react";

import {
  useAdminCofounderProfilesQuery,
  useAdminForumThreadsQuery,
  useCommunityContentReportsQuery,
  useDismissCommunityContentReportMutation,
  useModerateCofounderProfileMutation,
  useModerateForumReplyMutation,
  useModerateForumThreadMutation,
} from "@/hooks/store/admin-community";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  COFOUNDER_COMMITMENT_LABELS,
  COFOUNDER_CONTRIBUTION_LABELS,
  COFOUNDER_IDENTITY_LABELS,
  type AdminCofounderProfile,
} from "@/lib/store/cofounders.schemas";
import { countryLabelFromCode, formatIsoInstantLabel } from "@/lib/store/format";
import {
  COMMUNITY_REPORT_REASON_LABELS,
  COMMUNITY_REPORT_TARGET_LABELS,
  FORUM_BOARD_LABELS,
  type AdminForumThread,
  type CommunityContentReport,
} from "@/lib/store/forum.schemas";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const NOTE_FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary";

/** One shape for all four queues. `restricted` is first, and it wins over `loading`. */
type QueueViewState<TRow> =
  | { status: "restricted" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; rows: TRow[] };

/**
 * Turns a query into a queue state.
 *
 * `isEnabled` IS CHECKED BEFORE `isPending`, deliberately: a disabled React Query sits in
 * `pending` forever, so reading `isPending` first would render a spinner that never resolves to
 * anybody without the capability.
 */
function toQueueViewState<TRow>(
  isEnabled: boolean,
  query: {
    readonly isPending: boolean;
    readonly isError: boolean;
    readonly data:
      | { readonly success: true; readonly data: { readonly items: TRow[] } }
      | { readonly success: false; readonly error: { readonly message: string } }
      | undefined;
  },
  transportErrorMessage: string,
): QueueViewState<TRow> {
  if (!isEnabled) return { status: "restricted" };
  if (query.isPending) return { status: "loading" };
  if (query.isError) return { status: "error", message: transportErrorMessage };
  const result = query.data;
  if (result === undefined) return { status: "loading" };
  if (!result.success) return { status: "error", message: result.error.message };
  if (result.data.items.length === 0) return { status: "empty" };
  return { status: "ready", rows: result.data.items };
}

export default function CommunityModerationPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canModerateContent =
    staffContextQuery.data?.capabilities.includes("moderate_content") ?? false;

  const forumThreadsQuery = useAdminForumThreadsQuery(canModerateContent);
  const contentReportsQuery = useCommunityContentReportsQuery(canModerateContent);
  const cofounderProfilesQuery = useAdminCofounderProfilesQuery(canModerateContent);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Community</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The business forum and the cofounder directory. Public text written by people, on a
          commerce platform&apos;s domain — which is the whole reason a queue sits in front of it.
        </p>
      </header>

      {/* Three distinct cases, said apart — a failed permission check is not the same as failing
          it, and neither is the same as passing it. */}
      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      )}
      {staffContextQuery.isSuccess && !canModerateContent && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Moderating community content needs the `moderate_content` capability. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so these queues are not loaded.
        </output>
      )}

      <ForumThreadQueue
        viewState={toQueueViewState(
          canModerateContent,
          forumThreadsQuery,
          "The thread queue could not be loaded.",
        )}
      />

      <ContentReportQueue
        viewState={toQueueViewState(
          canModerateContent,
          contentReportsQuery,
          "The report queue could not be loaded.",
        )}
      />

      <CofounderProfileQueue
        viewState={toQueueViewState(
          canModerateContent,
          cofounderProfilesQuery,
          "The profile queue could not be loaded.",
        )}
      />
    </div>
  );
}

// --- Shared queue chrome -----------------------------------------------------

function QueueSection<TRow>({
  title,
  description,
  viewState,
  emptyMessage,
  renderRow,
}: {
  title: string;
  description: string;
  viewState: QueueViewState<TRow>;
  emptyMessage: string;
  renderRow: (row: TRow) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {renderQueueBody(viewState, emptyMessage, renderRow)}
    </section>
  );
}

function renderQueueBody<TRow>(
  viewState: QueueViewState<TRow>,
  emptyMessage: string,
  renderRow: (row: TRow) => React.ReactNode,
): React.ReactNode {
  switch (viewState.status) {
    case "restricted":
      return null;
    case "loading":
      return (
        <div className="animate-pulse space-y-3" aria-hidden>
          {Array.from({ length: 2 }, (_unused, rowIndex) => (
            <div key={rowIndex} className={`${CARD_CLASS} h-28 bg-muted/40`} />
          ))}
        </div>
      );
    case "error":
      return (
        <output className="block rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
          {viewState.message}
        </output>
      );
    case "empty":
      return (
        <p className="rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      );
    case "ready":
      return <ul className="space-y-3">{viewState.rows.map(renderRow)}</ul>;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

// --- Forum threads -----------------------------------------------------------

function ForumThreadQueue({ viewState }: { viewState: QueueViewState<AdminForumThread> }) {
  return (
    <QueueSection
      title="Threads waiting for review"
      description="A new thread is never live on submit. Publishing puts it on the board; rejecting keeps it out of every public read and shows the author your reason."
      viewState={viewState}
      emptyMessage="Nothing is waiting."
      renderRow={(thread) => (
        <li key={thread.id}>
          <ForumThreadCard thread={thread} />
        </li>
      )}
    />
  );
}

function ForumThreadCard({ thread }: { thread: AdminForumThread }) {
  const [note, setNote] = useState("");
  const moderateThread = useModerateForumThreadMutation();

  const isNoteFilled = note.trim().length > 0;

  return (
    <article className={CARD_CLASS}>
      <p className="text-xs text-muted-foreground">
        {FORUM_BOARD_LABELS[thread.board]}
        {" · "}
        {thread.authorDisplayName}
        {/* Null is a real distinction, not a missing join: a reader weighing an answer about
            customs wants to know whether it came from a broker or a stranger. */}
        {thread.authorOrganizationName === null
          ? " · posting as an individual"
          : ` · ${thread.authorOrganizationName}`}
        {" · "}
        {formatIsoInstantLabel(thread.createdAt)}
      </p>

      <h3 className="mt-1 text-sm font-medium text-foreground">{thread.title}</h3>
      <p className="mt-1 text-sm leading-6 whitespace-pre-line text-foreground">{thread.body}</p>

      <p className="mt-2 text-xs text-muted-foreground">
        {/* Zero is the common case and is not a verdict in either direction. */}
        {thread.openReportCount === 0
          ? "No reports against this."
          : `${String(thread.openReportCount)} open report${thread.openReportCount === 1 ? "" : "s"} against this.`}
      </p>

      <label className="mt-3 block text-xs text-muted-foreground">
        Reason — required to reject, and the author reads it
        <textarea
          className={NOTE_FIELD_CLASS}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          disabled={moderateThread.isPending}
          onClick={() =>
            moderateThread.mutate({ threadId: thread.id, input: { decision: "publish" } })
          }
        >
          Publish
        </button>
        <button
          type="button"
          className={QUIET_BUTTON_CLASS}
          // The note is REQUIRED on this arm and on no other — a rejection the author cannot read
          // the reason for is one they will simply repost.
          disabled={!isNoteFilled || moderateThread.isPending}
          onClick={() =>
            moderateThread.mutate({
              threadId: thread.id,
              input: { decision: "reject", note: note.trim() },
            })
          }
        >
          Reject
        </button>
        <button
          type="button"
          className={QUIET_BUTTON_CLASS}
          disabled={moderateThread.isPending}
          onClick={() =>
            moderateThread.mutate({
              threadId: thread.id,
              input: isNoteFilled ? { decision: "lock", note: note.trim() } : { decision: "lock" },
            })
          }
        >
          Lock
        </button>
        <button
          type="button"
          className={QUIET_BUTTON_CLASS}
          disabled={moderateThread.isPending}
          onClick={() =>
            moderateThread.mutate({ threadId: thread.id, input: { decision: "unlock" } })
          }
        >
          Unlock
        </button>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        {/* Said outright, because a moderator who thinks "reject" deletes will be surprised. */}
        Rejecting does not delete anything. The thread stays out of every public read and its author
        sees your reason on their own page.
      </p>

      {thread.replyCount > 0 && (
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          {String(thread.replyCount)} repl{thread.replyCount === 1 ? "y" : "ies"}. Hiding one is a
          separate decision, made from the thread itself — a hidden reply keeps its place rather
          than vanishing.
        </p>
      )}

      {moderateThread.data !== undefined && !moderateThread.data.success && (
        <p className="mt-1 text-xs leading-4 text-destructive">
          {moderateThread.data.error.message}
        </p>
      )}
    </article>
  );
}

// --- Content reports ---------------------------------------------------------

function ContentReportQueue({ viewState }: { viewState: QueueViewState<CommunityContentReport> }) {
  return (
    <QueueSection
      title="Reports"
      description="Somebody objected to a thread or a reply. Dismissing closes the claim — it does nothing to the content, which is a separate decision above."
      viewState={viewState}
      emptyMessage="No open reports."
      renderRow={(report) => (
        <li key={report.id}>
          <ContentReportCard report={report} />
        </li>
      )}
    />
  );
}

/**
 * One report, and the two decisions it can lead to.
 *
 * REPLY MODERATION LIVES HERE RATHER THAN ON THE THREAD QUEUE, and that is not an arbitrary
 * placement. The thread queue holds `pending_review` threads, which by definition have no replies
 * yet — a hide control there would never have anything to act on. A report is the only place in
 * this console that names an individual reply, so it is the only place the control can work.
 *
 * The two decisions stay two calls: dismissing closes the claim, hiding acts on the text. A single
 * "reject" button doing both would leave the audit trail unable to say which the moderator meant.
 */
function ContentReportCard({ report }: { report: CommunityContentReport }) {
  const [note, setNote] = useState("");
  const dismissReport = useDismissCommunityContentReportMutation();
  const moderateReply = useModerateForumReplyMutation();
  const isReplyReport = report.targetKind === "forum_reply";

  return (
    <article className={CARD_CLASS}>
      <p className="text-xs text-muted-foreground">
        {COMMUNITY_REPORT_TARGET_LABELS[report.targetKind]}
        {" · "}
        {COMMUNITY_REPORT_REASON_LABELS[report.reason]}
        {" · reported by "}
        {report.reporterDisplayName}
        {" · "}
        {formatIsoInstantLabel(report.createdAt)}
      </p>

      <h3 className="mt-1 text-sm font-medium text-foreground">
        {/* A reply report carries its parent thread, so the queue always has somewhere to point. */}
        <a href={`/store/forum/${report.threadSlug}`} className="hover:underline">
          {report.threadTitle}
        </a>
      </h3>

      {report.note !== null && (
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{report.note}</p>
      )}

      <label className="mt-3 block text-xs text-muted-foreground">
        Why you are dismissing it
        <textarea
          className={NOTE_FIELD_CLASS}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={QUIET_BUTTON_CLASS}
          disabled={note.trim().length === 0 || dismissReport.isPending}
          onClick={() =>
            dismissReport.mutate({ reportId: report.id, input: { note: note.trim() } })
          }
        >
          Dismiss the report
        </button>

        {isReplyReport && (
          <>
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              disabled={note.trim().length === 0 || moderateReply.isPending}
              onClick={() =>
                moderateReply.mutate({
                  replyId: report.targetId,
                  input: { decision: "hidden", note: note.trim() },
                })
              }
            >
              Hide the reply
            </button>
            <button
              type="button"
              className={QUIET_BUTTON_CLASS}
              disabled={moderateReply.isPending}
              onClick={() =>
                moderateReply.mutate({
                  replyId: report.targetId,
                  input: { decision: "restored" },
                })
              }
            >
              Restore it
            </button>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        Dismissing closes the report and does nothing to the text.
        {isReplyReport
          ? " Hiding is the separate decision, and a hidden reply keeps its place in the thread rather than vanishing."
          : " To act on a thread, publish or reject it in the queue above."}{" "}
        Two decisions, so the record says which one you made.
      </p>

      {dismissReport.data !== undefined && !dismissReport.data.success && (
        <p className="mt-1 text-xs leading-4 text-destructive">
          {dismissReport.data.error.message}
        </p>
      )}
      {moderateReply.data !== undefined && !moderateReply.data.success && (
        <p className="mt-1 text-xs leading-4 text-destructive">
          {moderateReply.data.error.message}
        </p>
      )}
    </article>
  );
}

// --- Cofounder profiles ------------------------------------------------------

function CofounderProfileQueue({
  viewState,
}: {
  viewState: QueueViewState<AdminCofounderProfile>;
}) {
  return (
    <QueueSection
      title="Cofounder profiles waiting for review"
      description="People describing themselves. Rejecting sends the profile back to its owner as a draft with your note, so they can fix it and submit again."
      viewState={viewState}
      emptyMessage="Nothing is waiting."
      renderRow={(profile) => (
        <li key={profile.id}>
          <CofounderProfileCard profile={profile} />
        </li>
      )}
    />
  );
}

function CofounderProfileCard({ profile }: { profile: AdminCofounderProfile }) {
  const [note, setNote] = useState("");
  const moderateProfile = useModerateCofounderProfileMutation();

  return (
    <article className={CARD_CLASS}>
      <p className="text-xs text-muted-foreground">
        {countryLabelFromCode(profile.countryCode)}
        {" · "}
        {COFOUNDER_COMMITMENT_LABELS[profile.commitmentLevel]}
        {" · "}
        {/* Says what was checked. It is NOT a statement about their track record or their money,
            neither of which anybody verified. */}
        {COFOUNDER_IDENTITY_LABELS[profile.identityState]}
        {" · submitted "}
        {formatIsoInstantLabel(profile.submittedAt)}
      </p>

      <h3 className="mt-1 text-sm font-medium text-foreground">{profile.displayName}</h3>
      <p className="text-sm text-muted-foreground">{profile.headline}</p>
      <p className="mt-1 text-sm leading-6 whitespace-pre-line text-foreground">{profile.bio}</p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        Looking for: {profile.lookingFor}
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        {profile.contributionKinds
          .map((contributionKind) => COFOUNDER_CONTRIBUTION_LABELS[contributionKind])
          .join(" · ")}
        {profile.sectors.length === 0 ? "" : ` · ${profile.sectors.join(", ")}`}
      </p>

      {profile.priorVentures.length === 0 ? (
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          {/* Said here so nobody treats it as a defect. It is the honest state for a first-timer. */}
          No prior ventures listed. That is not a reason on its own.
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {profile.priorVentures.map((venture) => (
            <li key={venture.id}>
              {venture.name} — {venture.roleLabel}, {venture.yearsActiveLabel}
              {venture.outcomeSummary === null ? "" : `. ${venture.outcomeSummary}`}
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 block text-xs text-muted-foreground">
        Reason — required to reject, and the owner reads it
        <textarea
          className={NOTE_FIELD_CLASS}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          disabled={moderateProfile.isPending}
          onClick={() =>
            moderateProfile.mutate({ profileId: profile.id, input: { decision: "publish" } })
          }
        >
          Publish
        </button>
        <button
          type="button"
          className={QUIET_BUTTON_CLASS}
          disabled={note.trim().length === 0 || moderateProfile.isPending}
          onClick={() =>
            moderateProfile.mutate({
              profileId: profile.id,
              input: { decision: "reject", note: note.trim() },
            })
          }
        >
          Send back as a draft
        </button>
      </div>

      {moderateProfile.data !== undefined && !moderateProfile.data.success && (
        <p className="mt-1 text-xs leading-4 text-destructive">
          {moderateProfile.data.error.message}
        </p>
      )}
    </article>
  );
}
