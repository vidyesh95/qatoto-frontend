// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the business forum: `GET /store/forum/threads`,
// `GET /store/forum/threads/:threadSlug` and `POST /commerce/forum/threads`.
//
// NO BACKEND EXISTS. `STORE_BACKEND_STRUCTURE.md` A25 is explicit that `business-forum` is "not
// commerce and has no backend anywhere". This is a proposed contract, and the fixtures behind it are
// parsed through it exactly as a real payload would be.
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

// --- Write body: POST /commerce/forum/threads -------------------------------

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
 * What `POST /commerce/forum/threads` answers with: `201` and the raw row.
 *
 * `state` COMES BACK `pending_review`. See the file header for why that is the design and not a
 * placeholder. The success screen must not say "posted", "live" or "published".
 */
export const CreatedForumThreadSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    board: z.enum(FORUM_BOARDS),
    title: z.string(),
    state: z.enum(FORUM_THREAD_STATES),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

// --- Inferred types ---------------------------------------------------------

export type ForumThreadCard = z.infer<typeof ForumThreadCardSchema>;
export type ForumThreadListPage = z.infer<typeof ForumThreadListPageSchema>;
export type ForumReply = z.infer<typeof ForumReplySchema>;
export type ForumThreadDetail = z.infer<typeof ForumThreadDetailSchema>;
export type CreatedForumThread = z.infer<typeof CreatedForumThreadSchema>;

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
