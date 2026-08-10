// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `forum.api.ts` swaps `resolveMockRead` for `getJson`.
//
// EVERY FIXTURE IS EXPLICITLY ANNOTATED, never `satisfies` — annotation catches a missing REQUIRED
// field at compile time, and `resolveMockRead` then parses each one through the real schema at
// runtime, which catches the typo'd enum member types cannot see.
//
// WHAT THIS SET COVERS, chosen so the branches a happy-path fixture hides are all reachable:
//
//   · an ANSWERED thread with a real `acceptedReplyId`, and an open one where it is `null` — the
//     pair that proves "no accepted answer" does not render as "nobody helped";
//   · an author posting WITHOUT an organization (`authorOrganizationName: null`) beside authors who
//     have one, because that nullable is a genuine signal and not a missing join;
//   · a LOCKED thread, so the state that disables replying is seen rather than assumed;
//   · a thread with ZERO replies, which is the row a reply-count renderer gets wrong;
//   · a reply with `helpfulCount: 0`, which must render as a real zero rather than being hidden.
//
// NO `pending_review` THREAD IS IN ANY PUBLIC LIST FIXTURE, deliberately. Those reads filter that
// state out, so a fixture containing one would model a backend bug. It appears in exactly two
// places, both of which are the author's own view: `MOCK_CREATED_FORUM_THREAD`, which is what the
// composer receives, and `MOCK_OWN_FORUM_THREAD_PAGE`, which is `/mine`.
//
// `viewer` IS UNIFORM WITHIN ONE THREAD'S REPLIES, and that is not laziness. It is per-READER, not
// per-reply: one response is read by one person, so either they are signed in and every reply
// carries an object, or they are not and every reply carries `null`. HS-code and tooling model a
// signed-in reader; MOQ and letter-of-credit model an anonymous one. A fixture mixing the two
// inside one thread would describe a response the backend cannot produce.
//
// Timestamps are fixed strings. A computed "now" makes "how old is this thread" a question with a
// different answer every day.

import type {
  CreatedCommunityReport,
  CreatedForumReply,
  CreatedForumThread,
  ForumReply,
  ForumReplyHelpfulState,
  ForumThreadAnswerState,
  ForumThreadCard,
  ForumThreadDetail,
  ForumThreadListPage,
  OwnForumThreadListPage,
} from "@/lib/store/forum.schemas";

// --- Thread cards -----------------------------------------------------------

const THREAD_HS_CODE: ForumThreadCard = {
  id: "thr_hs_code_dispute",
  slug: "customs-reclassified-our-hs-code-mid-shipment",
  board: "logistics_and_customs",
  title: "Customs reclassified our HS code mid-shipment — who eats the duty difference?",
  excerpt:
    "Shipped under 8516.79 on the supplier's advice. Destination customs called it 8543.70 and the duty went from 2.7% to 3.7%. The PO says DAP.",
  authorDisplayName: "Marta Kowalski",
  authorOrganizationName: "Northwind Housewares",
  state: "answered",
  replyCount: 6,
  acceptedReplyId: "rep_hs_code_broker",
  lastActivityAt: "2026-07-29T14:22:00.000Z",
};

/**
 * The open thread with NO accepted answer.
 *
 * Four replies and `acceptedReplyId: null` — which means nobody pressed the button, not that nobody
 * helped. A renderer that prints "unanswered" for this row is telling readers to skip four useful
 * replies.
 */
const THREAD_MOQ_NEGOTIATION: ForumThreadCard = {
  id: "thr_moq_negotiation",
  slug: "getting-a-factory-below-its-stated-moq",
  board: "sourcing",
  title: "Has anyone actually got a factory below its stated MOQ?",
  excerpt:
    "Every quote comes back at exactly the listed minimum. Curious whether the number is real or an opening position, and what made the difference for you.",
  authorDisplayName: "Dev Raghunathan",
  authorOrganizationName: null,
  state: "open",
  replyCount: 4,
  acceptedReplyId: null,
  lastActivityAt: "2026-08-04T08:41:00.000Z",
};

/** Zero replies. The row a reply-count renderer pluralises wrong. */
const THREAD_GOTS_SCOPE: ForumThreadCard = {
  id: "thr_gots_scope",
  slug: "does-gots-cover-the-trims-or-only-the-fabric",
  board: "compliance_and_certification",
  title: "Does GOTS cover the trims or only the fabric?",
  excerpt:
    "Our mill is certified but the buttons and thread come from elsewhere. Trying to work out what we can honestly put on the label.",
  authorDisplayName: "Aoife Byrne",
  authorOrganizationName: "Slate & Fern",
  state: "open",
  replyCount: 0,
  acceptedReplyId: null,
  lastActivityAt: "2026-08-06T16:05:00.000Z",
};

/** The locked one. Replying is closed; reading is not. */
const THREAD_LC_VS_TT: ForumThreadCard = {
  id: "thr_lc_vs_tt",
  slug: "letter-of-credit-versus-30-70-tt-for-a-first-order",
  board: "payments_and_trade_finance",
  title: "Letter of credit versus 30/70 T/T for a first order",
  excerpt:
    "Supplier wants 30% up front and 70% against B/L copy. Our finance team wants an LC. Both sides think the other is being unreasonable.",
  authorDisplayName: "Tomás Herrera",
  authorOrganizationName: "Puerto Verde Trading",
  state: "locked",
  replyCount: 23,
  acceptedReplyId: "rep_lc_vs_tt_summary",
  lastActivityAt: "2026-06-12T11:30:00.000Z",
};

const THREAD_TOOLING_OWNERSHIP: ForumThreadCard = {
  id: "thr_tooling_ownership",
  slug: "who-owns-the-mould-when-you-paid-for-it",
  board: "manufacturing",
  title: "Who owns the mould when you paid for it?",
  excerpt:
    "Paid the full tooling cost. Factory says the mould stays on their floor and cannot be moved. Nothing in the contract says either way.",
  authorDisplayName: "Ingrid Sørensen",
  authorOrganizationName: "Fjord Kitchenware",
  state: "answered",
  replyCount: 11,
  acceptedReplyId: "rep_tooling_contract",
  lastActivityAt: "2026-07-15T09:12:00.000Z",
};

const THREAD_RFQ_RESPONSE_RATE: ForumThreadCard = {
  id: "thr_rfq_response_rate",
  slug: "what-makes-you-answer-an-rfq",
  board: "selling_on_qatoto",
  title: "Sellers — what makes you answer an RFQ and what makes you skip it?",
  excerpt:
    "Writing better requests. Would rather learn what gets ignored from the people doing the ignoring.",
  authorDisplayName: "Priya Menon",
  authorOrganizationName: "Kestrel Sourcing",
  state: "open",
  replyCount: 8,
  acceptedReplyId: null,
  lastActivityAt: "2026-08-01T13:58:00.000Z",
};

// --- List pages -------------------------------------------------------------

export const MOCK_FORUM_THREAD_LIST_PAGE: ForumThreadListPage = {
  items: [
    THREAD_GOTS_SCOPE,
    THREAD_MOQ_NEGOTIATION,
    THREAD_RFQ_RESPONSE_RATE,
    THREAD_HS_CODE,
    THREAD_TOOLING_OWNERSHIP,
    THREAD_LC_VS_TT,
  ],
  page: { nextCursor: null, hasMore: false },
};

/** Point `listForumThreads` at this to reach `StoreEmptyPanel`. */
export const MOCK_FORUM_THREAD_LIST_PAGE_EMPTY: ForumThreadListPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_FEATURED_FORUM_THREAD_SLUGS: readonly string[] =
  MOCK_FORUM_THREAD_LIST_PAGE.items.map((thread) => thread.slug);

// --- Replies ----------------------------------------------------------------

const HS_CODE_REPLIES: readonly ForumReply[] = [
  {
    id: "rep_hs_code_broker",
    authorDisplayName: "Elena Duarte",
    authorOrganizationName: "Meridian Customs Brokerage",
    body: "Under DAP the seller carries the risk to the named place but duty is normally the buyer's — check whether your PO says DAP or DDP, because people write DAP and mean DDP constantly. On the reclassification itself: the binding ruling is the destination authority's, not your supplier's opinion. If you disagree, you file a protest within the window, which is usually 30 to 90 days and starts from the entry date rather than from when you noticed.",
    createdAt: "2026-07-28T10:04:00.000Z",
    helpfulCount: 31,
    visibilityState: "visible",
    viewer: { hasMarkedHelpful: true },
  },
  {
    id: "rep_hs_code_operator",
    authorDisplayName: "Sam Okafor",
    authorOrganizationName: null,
    body: "Had the same jump on a heater element. What settled it for us was asking the supplier for the ruling reference they were relying on. They did not have one — it was just what they had always shipped under.",
    createdAt: "2026-07-28T15:47:00.000Z",
    helpfulCount: 12,
    visibilityState: "visible",
    viewer: { hasMarkedHelpful: false },
  },
  {
    id: "rep_hs_code_followup",
    authorDisplayName: "Marta Kowalski",
    authorOrganizationName: "Northwind Housewares",
    body: "Filed the protest. Also asked for a binding ruling on the next SKU before it ships, which seems obvious in retrospect.",
    createdAt: "2026-07-29T14:22:00.000Z",
    // A GENUINE ZERO. It must render as 0, not disappear — an author's own follow-up rarely collects
    // votes, and hiding the count would make the field look absent rather than unremarkable.
    helpfulCount: 0,
    visibilityState: "visible",
    viewer: { hasMarkedHelpful: false },
  },
];

const MOQ_REPLIES: readonly ForumReply[] = [
  {
    id: "rep_moq_trial",
    authorDisplayName: "Chen Wei",
    authorOrganizationName: "Hangzhou Precision Moulds",
    body: "From the factory side: the MOQ is real for a new tool and soft for an existing one. If we already run the mould, a short run costs us a changeover and nothing else. Ask whether anything close to your part is already in production.",
    createdAt: "2026-08-02T02:15:00.000Z",
    helpfulCount: 44,
    visibilityState: "visible",
    viewer: null,
  },
  {
    id: "rep_moq_pay_setup",
    authorDisplayName: "Dev Raghunathan",
    authorOrganizationName: null,
    body: "That matches what I got yesterday — one factory offered half the MOQ if we paid the setup charge separately rather than amortised.",
    createdAt: "2026-08-04T08:41:00.000Z",
    helpfulCount: 7,
    visibilityState: "visible",
    viewer: null,
  },
];

const TOOLING_REPLIES: readonly ForumReply[] = [
  {
    id: "rep_tooling_contract",
    authorDisplayName: "Hannah Lieberman",
    authorOrganizationName: "Brightwater Legal",
    body: "Paying for a tool buys you the tool only if the agreement says so. Absent a clause, most jurisdictions treat the mould as the manufacturer's property and your payment as a contribution to setup. The clause you want names ownership, a right of removal on notice, and who pays for maintenance — the third one is what people forget, and a mould nobody maintains is worthless by the time you move it.",
    createdAt: "2026-07-14T17:30:00.000Z",
    helpfulCount: 58,
    visibilityState: "visible",
    viewer: { hasMarkedHelpful: true },
  },
  {
    id: "rep_tooling_practical",
    authorDisplayName: "Ingrid Sørensen",
    authorOrganizationName: "Fjord Kitchenware",
    body: "Adding the removal clause to the next contract. Also learned the mould has a shot count and ours is most of the way through it, which changes the argument entirely.",
    createdAt: "2026-07-15T09:12:00.000Z",
    helpfulCount: 9,
    visibilityState: "visible",
    viewer: { hasMarkedHelpful: false },
  },
];

const LC_REPLIES: readonly ForumReply[] = [
  {
    id: "rep_lc_vs_tt_summary",
    authorDisplayName: "Yusuf Demir",
    authorOrganizationName: "İzmir Food Packing",
    body: "An LC protects both sides and costs both sides. On a first order under about 50k the bank charges and the document discipline usually cost more than the risk they cover, which is why 30/70 against a B/L copy became the default — the copy is worthless without the original, so the supplier keeps control of the goods until you pay. Above that figure the maths flips.",
    createdAt: "2026-06-11T08:20:00.000Z",
    helpfulCount: 76,
    visibilityState: "visible",
    viewer: null,
  },
];

// --- Details ----------------------------------------------------------------

const HS_CODE_DETAIL: ForumThreadDetail = {
  thread: THREAD_HS_CODE,
  body: "Shipped under 8516.79 on the supplier's advice. Destination customs called it 8543.70 and the duty went from 2.7% to 3.7% — about 4,100 USD on this container.\n\nThe PO says DAP. Supplier says the classification was our responsibility because we approved the commercial invoice. We say they gave us the code.\n\nTwo questions. Is there a route to challenge the reclassification, and where does the duty difference actually sit under DAP?",
  createdAt: "2026-07-27T09:00:00.000Z",
  replies: {
    items: [...HS_CODE_REPLIES],
    page: { nextCursor: null, hasMore: false },
  },
  viewer: { isThreadAuthor: true },
};

const MOQ_DETAIL: ForumThreadDetail = {
  thread: THREAD_MOQ_NEGOTIATION,
  body: "Every quote comes back at exactly the listed minimum. Curious whether the number is real or an opening position, and what made the difference for you.\n\nWe are at about a third of the typical MOQ and would rather pay a premium per unit than sit on stock for two years.",
  createdAt: "2026-08-01T19:30:00.000Z",
  replies: {
    items: [...MOQ_REPLIES],
    page: { nextCursor: null, hasMore: false },
  },
  viewer: null,
};

/** Zero replies. The empty reply list is a real state and renders as one. */
const GOTS_DETAIL: ForumThreadDetail = {
  thread: THREAD_GOTS_SCOPE,
  body: "Our mill is certified but the buttons and thread come from elsewhere. Trying to work out what we can honestly put on the label without overclaiming.",
  createdAt: "2026-08-06T16:05:00.000Z",
  replies: {
    items: [],
    page: { nextCursor: null, hasMore: false },
  },
  viewer: null,
};

const TOOLING_DETAIL: ForumThreadDetail = {
  thread: THREAD_TOOLING_OWNERSHIP,
  body: "Paid the full tooling cost — 38,000 USD across two cavities. Factory says the mould stays on their floor and cannot be moved. Nothing in the contract says either way.\n\nIs this normal, and is there a form of words that would have prevented it?",
  createdAt: "2026-07-14T11:45:00.000Z",
  replies: {
    items: [...TOOLING_REPLIES],
    page: { nextCursor: null, hasMore: false },
  },
  viewer: { isThreadAuthor: false },
};

const LC_DETAIL: ForumThreadDetail = {
  thread: THREAD_LC_VS_TT,
  body: "Supplier wants 30% up front and 70% against B/L copy. Our finance team wants an LC. Both sides think the other is being unreasonable and I am in the middle of it.",
  createdAt: "2026-06-10T14:00:00.000Z",
  replies: {
    items: [...LC_REPLIES],
    page: { nextCursor: null, hasMore: false },
  },
  viewer: null,
};

const RFQ_RESPONSE_DETAIL: ForumThreadDetail = {
  thread: THREAD_RFQ_RESPONSE_RATE,
  body: "Writing better requests. Would rather learn what gets ignored from the people doing the ignoring.\n\nSpecifically: does a wide quantity range put you off, and does naming a target price help or hurt?",
  createdAt: "2026-07-30T07:10:00.000Z",
  replies: {
    items: [
      {
        id: "rep_rfq_range",
        authorDisplayName: "Lucia Ferrari",
        authorOrganizationName: "Coimbatore Textile Studio",
        body: "A range is fine. A range spanning an order of magnitude is not — 500 to 50,000 means you have not decided, and quoting it costs us the same effort as a real request. Naming a target price helps every time: it tells us in one line whether to bother.",
        createdAt: "2026-08-01T13:58:00.000Z",
        helpfulCount: 22,
        visibilityState: "visible",
        viewer: { hasMarkedHelpful: false },
      },
      {
        // THE HIDDEN REPLY. It keeps its place in the thread rather than vanishing, because a
        // conversation with a silent hole in it reads as though the answer above was never
        // challenged. `body` still arrives — the renderer is what withholds it, and a reviewer
        // who cannot see the text cannot check that the renderer does.
        id: "rep_rfq_removed",
        authorDisplayName: "Removed by a moderator",
        authorOrganizationName: null,
        body: "Cheap sourcing agent, WhatsApp me, we do all categories, best price guaranteed.",
        createdAt: "2026-08-01T19:02:00.000Z",
        helpfulCount: 0,
        visibilityState: "hidden",
        viewer: { hasMarkedHelpful: false },
      },
    ],
    page: { nextCursor: null, hasMore: false },
  },
  viewer: { isThreadAuthor: false },
};

export const MOCK_FORUM_THREAD_DETAILS_BY_SLUG: Readonly<Record<string, ForumThreadDetail>> = {
  "customs-reclassified-our-hs-code-mid-shipment": HS_CODE_DETAIL,
  "getting-a-factory-below-its-stated-moq": MOQ_DETAIL,
  "does-gots-cover-the-trims-or-only-the-fabric": GOTS_DETAIL,
  "who-owns-the-mould-when-you-paid-for-it": TOOLING_DETAIL,
  "letter-of-credit-versus-30-70-tt-for-a-first-order": LC_DETAIL,
  "what-makes-you-answer-an-rfq": RFQ_RESPONSE_DETAIL,
};

// --- Write response ---------------------------------------------------------

/**
 * What the mocked `POST /community/forum/threads` answers with.
 *
 * `state: "pending_review"` IS THE ENTIRE POINT OF THIS FIXTURE. A thread does not publish on
 * submit — see the header of `forum.schemas.ts` for why moderation is the design rather than a
 * placeholder. A fixed row rather than an echo, so the success screen cannot link to a slug that
 * resolves to nothing.
 */
export const MOCK_CREATED_FORUM_THREAD: CreatedForumThread = {
  id: "thr_01JQZ5R2M8V4T1XC",
  slug: "pending-review-thread",
  board: "sourcing",
  title: "Your question",
  state: "pending_review",
  createdAt: "2026-08-08T09:20:00.000Z",
};

/** What the mocked `POST /community/forum/threads/:threadId/replies` answers with. */
export const MOCK_CREATED_FORUM_REPLY: CreatedForumReply = {
  id: "rep_01JQZ8W7K3B2N5DF",
  threadId: "thr_moq_negotiation",
  body: "Your reply",
  createdAt: "2026-08-09T11:05:00.000Z",
};

/**
 * What the accept/unaccept pair answers with.
 *
 * `state: "answered"` IS DERIVED FROM `acceptedReplyId`, never set independently. This fixture
 * carries both so a renderer that reads one and ignores the other is visibly wrong.
 */
export const MOCK_FORUM_THREAD_ANSWER_STATE: ForumThreadAnswerState = {
  threadId: "thr_moq_negotiation",
  acceptedReplyId: "rep_moq_trial",
  state: "answered",
};

/**
 * What `PUT|DELETE …/helpful` answers with.
 *
 * `viewer` HERE IS NOT NULLABLE, unlike the one on a reply in a public read: only a signed-in
 * reader can reach this route at all, so there is no anonymous case to model. A count and one
 * boolean — no score, no downvote, nothing negative anywhere on the wire.
 */
export const MOCK_FORUM_REPLY_HELPFUL_STATE: ForumReplyHelpfulState = {
  replyId: "rep_moq_trial",
  helpfulCount: 45,
  viewer: { hasMarkedHelpful: true },
};

/** What the mocked `POST /community/reports` answers with. */
export const MOCK_CREATED_COMMUNITY_REPORT: CreatedCommunityReport = {
  id: "crep_01JQZA1C6P8H4RTV",
  state: "open",
  createdAt: "2026-08-09T11:41:00.000Z",
};

// --- The author's own threads -----------------------------------------------

/**
 * `GET /community/forum/threads/mine`.
 *
 * THE ONLY FIXTURE IN THIS FILE THAT CONTAINS `pending_review` ROWS, and it contains TWO of them
 * on purpose, because they are different situations that the wire tells apart only by a
 * timestamp:
 *
 *   · `moderatedAt: null` — still queued, nobody has looked;
 *   · `moderatedAt` set, with a note — REJECTED, and staying `pending_review` is what keeps it out
 *     of every public read while leaving it readable here.
 *
 * A UI that collapses those two into "waiting for review" tells somebody their thread is coming
 * when it never will. `describeOwnForumThreadState` in `forum.schemas.ts` is the one place that
 * pairing is turned into words.
 */
export const MOCK_OWN_FORUM_THREAD_PAGE: OwnForumThreadListPage = {
  items: [
    {
      id: "thr_moq_negotiation",
      slug: "getting-a-factory-below-its-stated-moq",
      board: "sourcing",
      title: "Getting a factory below its stated MOQ — what actually works?",
      excerpt:
        "Every quote comes back at 5,000 minimum and we need 1,200 for a first run. Willing to pay more per unit.",
      state: "open",
      replyCount: 4,
      acceptedReplyId: null,
      moderatedAt: "2026-08-01T09:00:00.000Z",
      moderationNote: null,
      lastActivityAt: "2026-08-04T08:41:00.000Z",
      createdAt: "2026-07-31T16:20:00.000Z",
    },
    {
      // STILL QUEUED. Nobody has looked at it yet.
      id: "thr_pending_incoterms",
      slug: "fca-versus-fob-for-a-first-container",
      board: "logistics_and_customs",
      title: "FCA or FOB for a first container out of Ningbo?",
      excerpt:
        "Forwarder says FCA, supplier quoted FOB and will not budge. Trying to understand what I actually lose by agreeing.",
      state: "pending_review",
      replyCount: 0,
      acceptedReplyId: null,
      moderatedAt: null,
      moderationNote: null,
      lastActivityAt: "2026-08-09T07:15:00.000Z",
      createdAt: "2026-08-09T07:15:00.000Z",
    },
    {
      // REJECTED, and still `pending_review`. The note is the only thing that says so.
      id: "thr_rejected_supplier_name",
      slug: "is-this-supplier-a-scam",
      board: "sourcing",
      title: "Is this supplier a scam? Naming them below",
      excerpt:
        "Paid a deposit six weeks ago and they have stopped answering. Company name and bank details in the post.",
      state: "pending_review",
      replyCount: 0,
      acceptedReplyId: null,
      moderatedAt: "2026-08-06T13:40:00.000Z",
      moderationNote:
        "We cannot carry an accusation against a named company with bank details attached — there is no process here for the other side to answer it. Repost describing what happened without identifying them, or open a dispute on the order if one exists.",
      lastActivityAt: "2026-08-05T20:02:00.000Z",
      createdAt: "2026-08-05T20:02:00.000Z",
    },
  ],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_OWN_FORUM_THREAD_PAGE_EMPTY: OwnForumThreadListPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};
