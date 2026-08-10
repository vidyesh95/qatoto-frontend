// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `admin-community.api.ts` swaps `resolveMockRead` for `getJson`.
//
// EVERY FIXTURE IS EXPLICITLY ANNOTATED, never `satisfies`.
//
// THREE QUEUES, ONE CAPABILITY (`moderate_content`), and each one is built so the decision a
// moderator has to make is not obvious from the row alone. A queue fixture where every entry is
// plainly spam teaches nothing about the console: the useful rows are the ones where publishing
// and rejecting are both defensible.
//
// WHAT THIS SET COVERS:
//
//   · a thread queue entry with `openReportCount: 0` beside one with reports against it, because
//     zero is the common case and must not read as a verdict either way;
//   · an author posting WITHOUT an organization beside one who has it — the nullable that tells a
//     moderator whether an answer came from a broker or a stranger;
//   · both report target kinds, thread and reply, since a reply report carries its parent thread so
//     the queue can link somewhere;
//   · a cofounder profile queue entry with an EMPTY `priorVentures` list, which is the honest state
//     for a first-timer and not a reason to reject.

import type { AdminCofounderProfileQueuePage } from "@/lib/store/cofounders.schemas";
import type {
  AdminForumThreadQueuePage,
  CommunityContentReportQueuePage,
} from "@/lib/store/forum.schemas";

// --- Forum thread queue ------------------------------------------------------

/**
 * `GET /community/admin/forum/threads`.
 *
 * EVERY ROW HERE IS `pending_review` AND NONE HAS BEEN MODERATED, which is the backend's own queue
 * predicate rather than a filter chosen for this fixture. A rejected thread also stays
 * `pending_review` — it is the moderation timestamp that takes it out of the queue — so a console
 * filtering on state alone would show every rejection it had ever made, forever.
 */
export const MOCK_ADMIN_FORUM_THREAD_QUEUE_PAGE: AdminForumThreadQueuePage = {
  items: [
    {
      id: "thr_pending_incoterms",
      slug: "fca-versus-fob-for-a-first-container",
      board: "logistics_and_customs",
      title: "FCA or FOB for a first container out of Ningbo?",
      body: "Forwarder says FCA, supplier quoted FOB and will not budge. Trying to understand what I actually lose by agreeing to FOB when the goods are moving in a container rather than over a ship's rail.\n\nIs this one of those things where the incoterm is technically wrong and nobody cares, or does it actually bite?",
      state: "pending_review",
      authorDisplayName: "Ana Beltrán",
      authorOrganizationName: null,
      replyCount: 0,
      // ZERO IS THE COMMON CASE. Nobody has reported this; it is queued because everything is.
      openReportCount: 0,
      createdAt: "2026-08-09T07:15:00.000Z",
    },
    {
      // THE HARD ONE. Not spam, plausibly useful, and naming a company with no right of reply.
      id: "thr_pending_supplier_warning",
      slug: "warning-about-a-supplier-in-shenzhen",
      board: "sourcing",
      title: "Warning about a supplier in Shenzhen",
      body: "Six weeks, no goods, no refund, no answers. Posting the company name and the bank account so nobody else pays them.",
      state: "pending_review",
      authorDisplayName: "Karl Jensen",
      authorOrganizationName: "Nordic Home Supply",
      replyCount: 0,
      openReportCount: 2,
      createdAt: "2026-08-08T18:41:00.000Z",
    },
    {
      id: "thr_pending_gots_trims",
      slug: "does-gots-certification-cover-sewing-thread",
      board: "compliance_and_certification",
      title: "Does GOTS certification cover sewing thread, or only the fabric?",
      body: "Our mill is GOTS-certified and the finished garment is not. Trying to work out where the line is drawn and whether the trims break it.",
      state: "pending_review",
      authorDisplayName: "Lucia Ferrari",
      authorOrganizationName: "Coimbatore Textile Studio",
      replyCount: 0,
      openReportCount: 0,
      createdAt: "2026-08-09T11:58:00.000Z",
    },
  ],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_ADMIN_FORUM_THREAD_QUEUE_PAGE_EMPTY: AdminForumThreadQueuePage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

// --- Content reports ---------------------------------------------------------

/**
 * `GET /community/admin/content-reports`.
 *
 * ITS OWN QUEUE, NOT COMMERCE'S. A moderator working counterfeit listings and one working
 * off-topic threads are not the same shift (§17.4).
 *
 * A REPORT IS A CLAIM, NOT A VERDICT. Dismissing one is a different act from hiding the content it
 * points at, which is why the console needs two calls and this queue only ever dismisses.
 */
export const MOCK_COMMUNITY_CONTENT_REPORT_QUEUE_PAGE: CommunityContentReportQueuePage = {
  items: [
    {
      id: "crep_supplier_warning_1",
      targetKind: "forum_thread",
      targetId: "thr_pending_supplier_warning",
      threadSlug: "warning-about-a-supplier-in-shenzhen",
      threadTitle: "Warning about a supplier in Shenzhen",
      reason: "personal_information",
      note: "Posts a bank account number belonging to a named company.",
      state: "open",
      reporterDisplayName: "Elena Duarte",
      createdAt: "2026-08-09T06:20:00.000Z",
    },
    {
      // A REPLY REPORT, carrying its parent thread so the queue has somewhere to link.
      id: "crep_rfq_spam",
      targetKind: "forum_reply",
      targetId: "rep_rfq_removed",
      threadSlug: "what-makes-you-answer-an-rfq",
      threadTitle: "What makes you answer an RFQ?",
      reason: "spam",
      note: null,
      state: "open",
      reporterDisplayName: "Sam Okafor",
      createdAt: "2026-08-01T19:40:00.000Z",
    },
    {
      // A REPORT THAT SHOULD PROBABLY BE DISMISSED — disagreement, not a violation. The queue
      // needs one of these or the console gets built as an approve-everything button.
      id: "crep_lc_disagreement",
      targetKind: "forum_reply",
      targetId: "rep_lc_vs_tt_summary",
      threadSlug: "letter-of-credit-versus-30-70-tt-for-a-first-order",
      threadTitle: "Letter of credit versus 30/70 TT for a first order",
      reason: "misleading",
      note: "The 50k figure is made up and people will act on it.",
      state: "open",
      reporterDisplayName: "Anonymous reader",
      createdAt: "2026-06-12T09:05:00.000Z",
    },
  ],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_COMMUNITY_CONTENT_REPORT_QUEUE_PAGE_EMPTY: CommunityContentReportQueuePage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

// --- Cofounder profile queue -------------------------------------------------

/**
 * `GET /community/admin/cofounder-profiles`.
 *
 * NOTHING HERE CARRIES A CAPITAL OR EQUITY FIGURE, because no column exists to hold one (§14). A
 * moderator on this queue is reading prose about a person, and that is the whole of the decision.
 */
export const MOCK_ADMIN_COFOUNDER_QUEUE_PAGE: AdminCofounderProfileQueuePage = {
  items: [
    {
      id: "cfp_queue_priya",
      slug: "priya-raman",
      displayName: "Priya Raman",
      headline: "Operator who has run a factory floor, looking for the person with the product",
      bio: "Eleven years in production management, the last four running a 200-person plant making small appliances.",
      lookingFor:
        "Somebody with a product and demand who does not want to learn manufacturing the expensive way.",
      countryCode: "IN",
      state: "pending_review",
      identityState: "identity_verified",
      contributionKinds: ["operations", "expertise"],
      commitmentLevel: "full_time",
      sectors: ["Consumer hardware", "Contract manufacturing"],
      priorVentures: [
        {
          id: "ven_queue_plantworks",
          name: "Plantworks Appliances",
          roleLabel: "Head of production",
          yearsActiveLabel: "2022–present",
          outcomeSummary: null,
        },
      ],
      submittedAt: "2026-08-06T09:12:00.000Z",
    },
    {
      // FIRST-TIMER. An empty venture list is the honest state, not a reason to reject — and a
      // console that sorted or flagged on venture count would be ranking people, which §18.1
      // rule 2 forbids on the public side for reasons that do not stop at the queue.
      id: "cfp_queue_daniel",
      slug: "daniel-osei",
      displayName: "Daniel Osei",
      headline: "Software engineer, ten years, want to build something physical for once",
      bio: "Backend infrastructure at two payment companies. I can build the systems side of a hardware business and I have never run one.",
      lookingFor: "A domain expert who has the product and needs the technology built properly.",
      countryCode: "GH",
      state: "pending_review",
      identityState: "unverified",
      contributionKinds: ["expertise"],
      commitmentLevel: "part_time",
      sectors: ["Fintech", "Logistics"],
      priorVentures: [],
      submittedAt: "2026-08-08T20:03:00.000Z",
    },
  ],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_ADMIN_COFOUNDER_QUEUE_PAGE_EMPTY: AdminCofounderProfileQueuePage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};
