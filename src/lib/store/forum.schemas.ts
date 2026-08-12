// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the business forum: the two public reads under `/store/forum/threads`, and
// the twelve writes under `/community/*`. `STORE_BACKEND_STRUCTURE.md` §6.7 and §17.
//
// THE BACKEND SHIPPED THIS (Phase 18, migrations `0102`–`0103`) AND IT SHIPPED MORE THAN THIS FILE
// ASKED FOR. The original contract had exactly one write, thread creation, while
// `ForumThreadDetail` already rendered replies, `helpfulCount` and an `acceptedReplyId` — §17.3
// calls that "a wall of unanswerable questions" and the phase built the reply, accept-answer and
// helpful writes alongside the create rather than after it. `forum.api.ts` is still mock-backed,
// so fixtures are parsed through these schemas exactly as a real payload would be.
//
// THE WRITE PATH MOVED FROM `/commerce` TO `/community`. Community is a sibling bounded context
// (§1.1): no organization is required to post, nothing is priced, nothing is ordered. The public
// READS stay under `/store` because that is the prefix a signed-out visitor browses — a mount
// point, not a context claim. Do not read `GET /store/forum/threads` as evidence that a thread is
// a commerce object, and never join one to a commerce row to imply a fact about a party.
//
// THE ONE DECISION IN THIS FILE THAT SOMEBODY WILL LATER TRY TO UNDO, so it is written down here
// rather than left in a component:
//
//   A NEW THREAD COMES BACK `pending_review`, NOT `open`.
//
// A10 in the backend doc closed public comments on listings, and the reasoning was not about
// listings — it was that a comment would be "the only public text surface with no purchase proof and
// no standing requirement behind it". Q&A, reviews and inquiries all require standing; a free-floating
// text box does not. A standalone forum is a different surface from a listing comment, but it inherits
// exactly that problem: it is public text, written by anyone, attached to a commerce platform's
// domain.
//
// Moderation is the answer that lets the forum exist without reopening A10. It is the same shape R&D
// already runs for papers (`paper-moderation-queue.tsx`) and the same shape a service offering takes
// (`draft` → `pending_review` → an admin decides). So the composer says "queued for review" and means
// it. DO NOT "fix" this into an immediate publish because a forum usually publishes immediately —
// this one has a documented reason not to.
//
// AND A REJECTED THREAD STAYS `pending_review`, carrying its reason. That is not a missing
// terminal state — it is what keeps the thread out of every public read while leaving it readable
// by its author on `/community/forum/threads/mine`. The moderation queue's predicate is therefore
// "pending_review AND not yet moderated" rather than state alone, or every rejection would return
// to the queue forever (§6.7).

import { z } from "zod";

import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------

/**
 * Where a thread lives.
 *
 * SIX BOARDS, MATCHING THE WORK RATHER THAN THE ORG CHART. Each one maps to a thing a business
 * actually gets stuck on and to a surface Qatoto already has — sourcing to the catalogue, logistics
 * and customs to `/store/providers`, compliance to factory certifications, payments to quotes and
 * orders. A "General" board is deliberately absent: it is where every thread ends up when nobody can
 * decide, and a board nobody can characterise is a board nobody subscribes to.
 */
export const FORUM_BOARDS = [
  "sourcing",
  "logistics_and_customs",
  "compliance_and_certification",
  "payments_and_trade_finance",
  "manufacturing",
  "selling_on_qatoto",
] as const;

export type ForumBoard = (typeof FORUM_BOARDS)[number];

/**
 * A thread's lifecycle.
 *
 * `pending_review` NEVER REACHES A PUBLIC READ — the list and detail endpoints filter it out, the
 * same way the provider directory never returns a `draft` offering. It is in the tuple because the
 * CREATE response returns it, and the composer has to render it.
 *
 * `answered` means an accepted reply exists. It is derived from `acceptedReplyId` on the backend and
 * is carried separately so a list row does not have to fetch replies to know.
 */
export const FORUM_THREAD_STATES = ["pending_review", "open", "answered", "locked"] as const;

export type ForumThreadState = (typeof FORUM_THREAD_STATES)[number];

/**
 * Whether a reply is still showing.
 *
 * TWO VALUES AND NO `deleted`. A moderator hides a reply; nobody erases one. The distinction
 * matters because a thread whose middle silently disappears reads as though the answer above it
 * was never challenged.
 */
export const FORUM_REPLY_VISIBILITY_STATES = ["visible", "hidden"] as const;

export type ForumReplyVisibilityState = (typeof FORUM_REPLY_VISIBILITY_STATES)[number];

/**
 * What a community report is about.
 *
 * A SEPARATE QUEUE FROM COMMERCE'S (§17.4). `commerce_content_report` is worked by a moderator
 * looking at counterfeit listings; this one is worked by somebody reading off-topic threads. They
 * are gated by different capabilities and merging them creates the coupling capabilities exist to
 * prevent, which is the same call Phase 10 already made.
 */
export const COMMUNITY_REPORT_TARGET_KINDS = ["forum_thread", "forum_reply"] as const;

export type CommunityReportTargetKind = (typeof COMMUNITY_REPORT_TARGET_KINDS)[number];

/** Why somebody reported it. Free text rides alongside in `note`. */
export const COMMUNITY_REPORT_REASONS = [
  "spam",
  "off_topic",
  "abusive",
  "misleading",
  "personal_information",
  "other",
] as const;

export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number];

export const COMMUNITY_REPORT_STATES = ["open", "dismissed", "actioned"] as const;

export type CommunityReportState = (typeof COMMUNITY_REPORT_STATES)[number];

// --- Thread list ------------------------------------------------------------

/**
 * One row in `/store/forum`.
 *
 * `authorOrganizationName` IS NULLABLE AND THAT IS A REAL DISTINCTION, not a missing join. Somebody
 * posting as an individual has no organization behind them, and a reader weighing an answer about
 * customs clearance wants to know whether it came from a broker or from a stranger. Rendering a
 * placeholder org would erase exactly the signal the field exists to carry.
 */
export const ForumThreadCardSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    board: z.enum(FORUM_BOARDS),
    title: z.string(),
    /** First lines of the body, server-truncated. Never the whole post. */
    excerpt: z.string(),
    authorDisplayName: z.string(),
    authorOrganizationName: z.string().nullable(),
    state: z.enum(FORUM_THREAD_STATES),
    replyCount: z.number().int(),
    /**
     * The id of the reply the author marked as the answer, or `null`.
     *
     * `null` IS NOT "unanswered" in the sense of "nobody helped" — plenty of useful threads never get
     * an accepted answer. It means only that nobody pressed the button.
     */
    acceptedReplyId: z.string().nullable(),
    lastActivityAt: IsoDateTimeSchema,
  })
  .strip();

export const ForumThreadListPageSchema = cursorPageOf(ForumThreadCardSchema);

// --- Thread detail ----------------------------------------------------------

export const ForumReplySchema = z
  .object({
    id: z.string(),
    authorDisplayName: z.string(),
    authorOrganizationName: z.string().nullable(),
    body: z.string(),
    createdAt: IsoDateTimeSchema,
    /**
     * How many readers found this useful.
     *
     * A COUNT, NOT A SCORE. There is no downvote on the wire and there must not be one in the UI: a
     * negative signal on a commerce platform where the author is a named organization is a
     * reputational act, and this surface has no appeal process to put behind it.
     */
    helpfulCount: z.number().int(),
    // NO `visibilityState`, AND THAT IS THE BACKEND'S DECISION RATHER THAN AN OMISSION HERE.
    // This schema used to require one so the thread could render a "removed by a moderator"
    // tombstone in place. The read filters `state = 'visible'` and its own comment says why —
    // "a hidden reply leaves the public read entirely; it is not shown as a tombstone" — so the
    // field would have been the constant `"visible"` on every row that ever arrived, which is
    // exactly the fabricated-signal shape A13 exists to refuse.
    /**
     * This reader's own vote, or `null` when there is no reader to have one.
     *
     * `null` IS NOT `false` AND MUST NEVER BE DEFAULTED TO IT. `null` means nobody is signed in,
     * so the control renders as a prompt to sign in; `false` means a signed-in reader has not
     * endorsed this, so the control renders as an empty toggle they can press. The A11/A24 rule,
     * and the same shape `commerce_product_answer_vote` already projects.
     */
    viewer: z
      .object({
        // `hasVotedHelpful` IS THE WIRE'S SPELLING. This said `hasMarkedHelpful`, which nothing
        // ever sent — one spelling per concept, and the backend owns which one.
        hasVotedHelpful: z.boolean(),
      })
      .strip()
      .nullable(),
  })
  .strip();

/**
 * `GET /store/forum/threads/:threadSlug`.
 *
 * The replies arrive as their own cursor page rather than a bare array, because a long thread is
 * paged and `CursorPageControl` needs the same `{ nextCursor, hasMore }` footer every other store
 * list carries.
 */
export const ForumThreadDetailSchema = z
  .object({
    thread: ForumThreadCardSchema,
    /** The whole opening post, unlike the card's `excerpt`. */
    body: z.string(),
    createdAt: IsoDateTimeSchema,
    replies: cursorPageOf(ForumReplySchema),
    /**
     * This reader's standing on this thread, or `null` when there is no reader.
     *
     * ONE FIELD THIS FRONTEND NEEDS AND §17 DOES NOT LIST — the same kind of finding Appendix A
     * exists to record, written here rather than discovered on wiring day.
     *
     * `isThreadAuthor` decides whether the accept-answer control renders at all. Only the author
     * may accept, the backend enforces it, and without the flag the page has two bad options:
     * show the control to everybody and let most people press a button that 403s, or hide it from
     * everybody and make the feature unreachable. Neither is acceptable, and neither is guessing
     * from a display name.
     *
     * It is REQUIRED and nullable rather than optional, deliberately. If the backend does not yet
     * send it the parse fails loudly and the page renders its error branch, which is the honest
     * outcome — an `.optional()` here would silently disable accept-answer for the one person
     * entitled to use it, and nobody would notice for weeks.
     */
    viewer: z
      .object({
        isThreadAuthor: z.boolean(),
      })
      .strip()
      .nullable(),
  })
  .strip();

// --- Filter input -----------------------------------------------------------

/** camelCase keys, snake_case values — see the wire-casing rule in CLAUDE.md. */
export interface ListForumThreadsFilter {
  readonly board?: string;
  readonly threadState?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

// --- Write body: POST /community/forum/threads ------------------------------

/**
 * A new thread.
 *
 * THREE FIELDS AND ALL THREE ARE REQUIRED. There is nothing optional to omit here, which is why this
 * composer has no `toOptional*` conversions: a thread with no body is not a thread, and a board is
 * how anyone finds it.
 *
 * Requires an `Idempotency-Key`. A retry without one posts the question twice, and a moderator then
 * has to reject one by hand.
 */
export interface CreateForumThreadInput {
  readonly board: ForumBoard;
  readonly title: string;
  readonly body: string;
}

/**
 * What `POST /community/forum/threads` answers with: `201` and the raw row.
 *
 * `state` COMES BACK `pending_review`. See the file header for why that is the design and not a
 * placeholder. The success screen must not say "posted", "live" or "published".
 */
// IT ANSWERS THE CARD, not a raw row. `createForumThread` returns `ForumThreadCardProjection`,
// which carries `lastActivityAt` and NO `createdAt` — so the `createdAt` this schema used to
// require was never on the wire and the create would have failed its parse on the first live post.
export const CreatedForumThreadSchema = ForumThreadCardSchema;

// --- Replies, answers and endorsements --------------------------------------
//
// `POST /community/forum/threads/:threadId/replies`,
// `POST|DELETE /community/forum/threads/:threadId/accepted-reply`,
// `PUT|DELETE /community/forum/replies/:replyId/helpful` (§6.7).

/**
 * A reply.
 *
 * REQUIRES A THREAD IN `open` OR `answered`. A `locked` thread refuses with a tagged error rather
 * than a silent no-op, so the composer must render the refusal rather than clearing the box and
 * pretending. Accepting an answer on a locked thread IS allowed — locking stops new text, not
 * bookkeeping.
 *
 * Requires an `Idempotency-Key`. A retry without one posts the same answer twice.
 */
export interface CreateForumReplyInput {
  readonly body: string;
}

// NO `threadId` ON THE WIRE. The route is already thread-scoped — the id is in the path the caller
// just posted to — so the reply projection does not repeat it, and requiring it here failed the
// parse. The caller knows the thread it wrote to.
export const CreatedForumReplySchema = ForumReplySchema;

/**
 * `POST …/accepted-reply` — the thread author marks the answer. `DELETE` unmarks it.
 *
 * ONLY THE THREAD AUTHOR MAY DO THIS, and the thread's `answered` state is derived from
 * `acceptedReplyId` server-side. Nothing here lets a reader vote an answer into place.
 */
export interface AcceptForumReplyInput {
  readonly replyId: string;
}

/**
 * What the accept/unaccept pair answers with — the thread's two derived fields, read back.
 *
 * The same object answers `DELETE`, with `acceptedReplyId` back to `null` and `state` back to
 * `open`. `null` STILL DOES NOT MEAN "nobody helped" — it means nobody pressed the button.
 */
// THE WHOLE CARD COMES BACK, keyed `id` and not `threadId`. Both halves of the pair answer with
// `ForumThreadCardProjection`, which already carries `acceptedReplyId` and the derived `state` —
// the two fields this schema was built to read — plus `replyCount` and `lastActivityAt`.
export const ForumThreadAnswerStateSchema = ForumThreadCardSchema;

/**
 * What `PUT|DELETE …/helpful` answers with.
 *
 * NO `Idempotency-Key` ON EITHER (A24). They are idempotent by verb: setting a boolean twice is
 * setting it once, so a key would be ceremony that implies the write is riskier than it is.
 *
 * There is no `DELETE`-shaped downvote hiding here. `hasMarkedHelpful: false` is the absence of an
 * endorsement, not the presence of a negative one.
 */
export const ForumReplyHelpfulStateSchema = z
  .object({
    replyId: z.string(),
    /**
     * FLAT, NOT NESTED UNDER `viewer`.
     *
     * The read's per-reply `viewer` object is nullable because an anonymous reader has no vote to
     * report. This is the answer to a WRITE, which only a signed-in caller can make, so there is no
     * null case and no object to wrap it in — the caller is by construction the viewer.
     */
    isHelpful: z.boolean(),
    helpfulCount: z.number().int(),
  })
  .strip();

// --- The author's own threads -----------------------------------------------
//
// `GET /community/forum/threads/mine` (§17.3).
//
// NOT OPTIONAL, AND THIS IS THE SUBSECTION THAT SAYS WHY. `pending_review` appears in no public
// read by design, so without `/mine` the create response is the last thing an author ever sees of
// their own thread — including a rejection, which stays `pending_review` and carries its reason.

export const OwnForumThreadSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    board: z.enum(FORUM_BOARDS),
    title: z.string(),
    excerpt: z.string(),
    state: z.enum(FORUM_THREAD_STATES),
    replyCount: z.number().int(),
    acceptedReplyId: z.string().nullable(),
    /**
     * When a moderator last decided on this thread, or `null` while it is still queued.
     *
     * `state === "pending_review"` WITH A NON-NULL `moderatedAt` IS A REJECTION, and it is the only
     * way to tell one from a thread still waiting its turn. The pair is what the backend's own
     * queue predicate reads, so the UI reads it the same way rather than inventing a `rejected`
     * state the wire does not carry.
     */
    moderatedAt: IsoDateTimeSchema.nullable(),
    /**
     * The moderator's reason. Required on a rejection, so non-null whenever one happened.
     *
     * `decisionReason` IS THE WIRE'S SPELLING — this said `moderationNote`, which nothing sends.
     * The column, the projection and the moderation body all say `decisionReason`; one spelling per
     * concept, and the backend owns which one.
     */
    decisionReason: z.string().nullable(),
    lastActivityAt: IsoDateTimeSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strip();

export const OwnForumThreadListPageSchema = cursorPageOf(OwnForumThreadSchema);

// --- Reporting --------------------------------------------------------------
//
// `POST /community/reports`, and the staff queue behind it (§17.4).

/**
 * Report a thread or a reply.
 *
 * `note` IS REQUIRED ON `other` AND OPTIONAL OTHERWISE. A reason code with no reason attached is
 * unworkable for the moderator who has to act on it, and requiring prose for the five named codes
 * would collect restatements of the code.
 */
export interface CreateCommunityReportInput {
  readonly targetKind: CommunityReportTargetKind;
  readonly targetId: string;
  readonly reason: CommunityReportReason;
  /**
   * `detailText` IS THE WIRE'S SPELLING. This was `note`, which the `.strict()` body refuses —
   * one 422 for the unrecognized key, and the prose lost with it.
   */
  readonly detailText?: string;
}

// IT ANSWERS `{ reportId }` AND NOTHING ELSE.
//
// This required `id`, `state` and `createdAt`; the service returns a single id, so all three were
// absent and the report write would have failed its parse. That is the right shape for the route —
// a reporter is told their claim was filed, and the queue it lands in is a moderator's read, not
// theirs. Do not restore `state` here: it would invite copy that tells a reporter their report is
// "open", which is a promise about somebody else's workload.
export const CreatedCommunityReportSchema = z.object({ reportId: z.string() }).strip();

// --- Moderation, gated by `moderate_content` --------------------------------
//
// `GET /community/admin/forum/threads`, `POST …/threads/:threadId/moderate`,
// `POST …/replies/:replyId/moderate`, `GET /community/admin/content-reports`,
// `POST …/content-reports/:reportId/decisions` (§6.7).
//
// The gate is checked IN-SERVICE rather than by middleware, so a refusal is a tagged result the
// UI can render rather than an opaque 403 — the same call Phase 16 made for `moderate_commerce`.

export const AdminForumThreadSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    board: z.enum(FORUM_BOARDS),
    title: z.string(),
    body: z.string(),
    state: z.enum(FORUM_THREAD_STATES),
    authorDisplayName: z.string(),
    /** Null is a real distinction: an individual poster, not a missing join. */
    authorOrganizationName: z.string().nullable(),
    replyCount: z.number().int(),
    // NO `openReportCount`. Nothing sends one, and a count join for a field whose own comment said
    // "zero is common and is not a verdict" is a query per row for a number nobody acts on. The
    // report queue is its own surface with its own capability.
    createdAt: IsoDateTimeSchema,
    excerpt: z.string(),
    acceptedReplyId: z.string().nullable(),
    lastActivityAt: IsoDateTimeSchema,
  })
  .strip();

export const AdminForumThreadQueuePageSchema = cursorPageOf(AdminForumThreadSchema);

// A MODERATION DECISION ANSWERS ONE ROW, NOT THE QUEUE.
//
// `moderateForumThread` returns the thread it just acted on; `moderateForumReply` returns
// `{ replyId, state }`. Both used to be parsed as a whole queue page, so every decision failed its
// parse — and a moderator pressing publish saw an error on a write that had already succeeded.
//
// Re-reading the queue after a decision is the caller's job, and `useMutation`'s `onSuccess` is
// where that belongs.

/** The queue read's filter. `state` is the only key, and it is optional. */
export interface ListAdminForumThreadsFilter {
  readonly state?: ForumThreadState;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `POST /community/admin/forum/threads/:threadId/moderate`.
 *
 * A DISCRIMINATED UNION, MIRRORING THE DECISION RATHER THAN FLATTENING IT — the same shape the
 * category verdict takes. `reasonNote` is REQUIRED ON EVERY ARM — including `publish` — and it is
 * spelled `reasonNote`, not `note`. Both facts were wrong here and each was its own 422 against the
 * `.strict()` body.
 *
 * Requiring it on an approval is stricter than the DB CHECK, deliberately: the queue's own decision
 * log is what a second moderator reads before reversing a colleague, and "approved" with no note
 * tells them nothing. The old shape said a rejection the
 * author cannot read the reason for is one they will simply repost.
 *
 * `publish` MOVES A THREAD TO `open`, NOT TO `answered`. `reject` LEAVES IT `pending_review` and
 * stamps the note — see the file header.
 */
export type ModerateForumThreadInput =
  | { readonly decision: "publish"; readonly reasonNote: string }
  | { readonly decision: "reject"; readonly reasonNote: string }
  | { readonly decision: "lock"; readonly reasonNote: string }
  | { readonly decision: "unlock"; readonly reasonNote: string };

/**
 * `POST /community/admin/forum/replies/:replyId/moderate`.
 *
 * `hidden` AND `restored`, NOT `delete`. The reply keeps its place in the thread either way.
 */
export type ModerateForumReplyInput =
  | { readonly decision: "hidden"; readonly reasonNote: string }
  | { readonly decision: "restored"; readonly reasonNote: string };

/**
 * A report as the queue shows it.
 *
 * FIVE FIELDS WERE REMOVED BECAUSE NOTHING SENDS THEM. `CommunityContentReportProjection` is
 * `{ id, targetKind, targetId, reason, detailText, status, createdAt, resolvedAt }` — so
 * `threadSlug`, `threadTitle` and `reporterDisplayName` were never on the wire, and `note` and
 * `state` were the wrong spellings of `detailText` and `status`.
 *
 * WHAT THAT COSTS, STATED RATHER THAN HIDDEN: the queue can name WHAT was reported and why, and it
 * cannot link to the thread or name the reporter. `targetId` plus `targetKind` is enough to fetch
 * the target, which is the moderator's next click either way. Naming the reporter is a separate
 * decision with its own risk — a moderator who can see who reported whom is a moderator who can be
 * lobbied — and it should be made deliberately rather than by adding a field to a schema.
 */
export const CommunityContentReportSchema = z
  .object({
    id: z.string(),
    targetKind: z.enum(COMMUNITY_REPORT_TARGET_KINDS),
    targetId: z.string(),
    reason: z.enum(COMMUNITY_REPORT_REASONS),
    detailText: z.string().nullable(),
    status: z.enum(COMMUNITY_REPORT_STATES),
    createdAt: IsoDateTimeSchema,
    resolvedAt: IsoDateTimeSchema.nullable(),
  })
  .strip();

export const CommunityContentReportQueuePageSchema = cursorPageOf(CommunityContentReportSchema);

/** What moderating a REPLY answers with: the id and its new visibility, not the thread. */
export const ModerateForumReplyResultSchema = z
  .object({
    replyId: z.string(),
    state: z.enum(FORUM_REPLY_VISIBILITY_STATES),
  })
  .strip();

/** What dismissing a report answers with: the id it acted on, and nothing else. */
export const DismissedCommunityReportSchema = z.object({ reportId: z.string() }).strip();

export interface ListCommunityContentReportsFilter {
  /** `status` IS THE WIRE'S SPELLING — `state` was a 422 that killed the whole read. */
  readonly status?: CommunityReportState;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `POST /community/admin/content-reports/:reportId/decisions` — dismiss a report.
 *
 * DISMISSAL IS THE ONLY DECISION THIS ROUTE MAKES. Acting on the content is a separate moderate
 * call against the thread or the reply, deliberately: a report is a claim about content, and
 * closing the claim is not the same act as removing the text. Two routes keep the audit trail
 * saying which one happened.
 */
export interface DismissCommunityContentReportInput {
  readonly note: string;
}

// --- Inferred types ---------------------------------------------------------

export type ForumThreadCard = z.infer<typeof ForumThreadCardSchema>;
export type ForumThreadListPage = z.infer<typeof ForumThreadListPageSchema>;
export type ForumReply = z.infer<typeof ForumReplySchema>;
export type ForumThreadDetail = z.infer<typeof ForumThreadDetailSchema>;
export type CreatedForumThread = z.infer<typeof CreatedForumThreadSchema>;
export type CreatedForumReply = z.infer<typeof CreatedForumReplySchema>;
export type ForumThreadAnswerState = z.infer<typeof ForumThreadAnswerStateSchema>;
export type ForumReplyHelpfulState = z.infer<typeof ForumReplyHelpfulStateSchema>;
export type OwnForumThread = z.infer<typeof OwnForumThreadSchema>;
export type OwnForumThreadListPage = z.infer<typeof OwnForumThreadListPageSchema>;
export type CreatedCommunityReport = z.infer<typeof CreatedCommunityReportSchema>;
export type AdminForumThread = z.infer<typeof AdminForumThreadSchema>;
export type AdminForumThreadQueuePage = z.infer<typeof AdminForumThreadQueuePageSchema>;
export type CommunityContentReport = z.infer<typeof CommunityContentReportSchema>;
export type CommunityContentReportQueuePage = z.infer<typeof CommunityContentReportQueuePageSchema>;

// --- Display maps -----------------------------------------------------------

export const FORUM_BOARD_LABELS: Record<ForumBoard, string> = {
  sourcing: "Sourcing",
  logistics_and_customs: "Logistics & customs",
  compliance_and_certification: "Compliance & certification",
  payments_and_trade_finance: "Payments & trade finance",
  manufacturing: "Manufacturing",
  selling_on_qatoto: "Selling on Qatoto",
};

/** One line per board, for the filter row's own explanation on the index page. */
export const FORUM_BOARD_DESCRIPTIONS: Record<ForumBoard, string> = {
  sourcing: "Finding suppliers, comparing quotes, sample rounds.",
  logistics_and_customs: "Freight, incoterms, clearance, duties and paperwork.",
  compliance_and_certification: "Standards, audits, testing, labelling and market access.",
  payments_and_trade_finance: "Terms, letters of credit, escrow alternatives, currency.",
  manufacturing: "Tooling, capacity, quality control, defect rates.",
  selling_on_qatoto: "Listings, storefronts, RFQ responses, order handling.",
};

export const FORUM_THREAD_STATE_LABELS: Record<ForumThreadState, string> = {
  // Never returned by a public read; present so the map is total and a switch cannot fall through.
  pending_review: "Waiting for review",
  open: "Open",
  answered: "Answered",
  locked: "Locked",
};

export const FORUM_REPLY_VISIBILITY_LABELS: Record<ForumReplyVisibilityState, string> = {
  visible: "Visible",
  hidden: "Hidden by a moderator",
};

export const COMMUNITY_REPORT_TARGET_LABELS: Record<CommunityReportTargetKind, string> = {
  forum_thread: "Thread",
  forum_reply: "Reply",
};

export const COMMUNITY_REPORT_REASON_LABELS: Record<CommunityReportReason, string> = {
  spam: "Spam or advertising",
  off_topic: "Off topic for this board",
  abusive: "Abusive or harassing",
  misleading: "Misleading or false",
  personal_information: "Publishes someone's personal information",
  other: "Something else",
};

export const COMMUNITY_REPORT_STATE_LABELS: Record<CommunityReportState, string> = {
  open: "Open",
  dismissed: "Dismissed",
  actioned: "Actioned",
};

/**
 * How a thread on `/mine` reads to the person who wrote it.
 *
 * A REJECTION IS NOT A STATE ON THE WIRE — it is `pending_review` with a `moderatedAt`. This
 * helper is the one place that pairing is turned into words, so no component reimplements it and
 * gets it backwards.
 */
export function describeOwnForumThreadState(thread: OwnForumThread): string {
  if (thread.state !== "pending_review") {
    return FORUM_THREAD_STATE_LABELS[thread.state];
  }
  return thread.moderatedAt === null ? "Waiting for review" : "Not published";
}

export type ModerateForumReplyResult = z.infer<typeof ModerateForumReplyResultSchema>;

export type DismissedCommunityReport = z.infer<typeof DismissedCommunityReportSchema>;
