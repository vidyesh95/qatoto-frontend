// Fixtures for the moderator's view of `/admin/case-studies`.
//
// NOTHING HERE IS REAL: there is no case-study table, no queue, and no writer waiting on any of these.
// They exist so the review page can be built and walked against something that looks like use.
//
// ⚠️ ONE SUBMISSION PER CARD STATE THE RENDERER MUST HANDLE, AND THAT IS THE WHOLE SELECTION RULE:
// 1. first-hand and full: two companies, ONE OF THEM WITHHELD FROM READERS, capital raised, three
//    figures of three kinds, and no sources (allowed first-hand);
// 2. from public sources: two sources, rupee figures, two related lessons that exist, and tags;
// 3. first-hand and minimal: no companies, pitfalls, figures, sources, outcome or timeline;
// 4. THE ALREADY-DECIDED ROW, listed in `MOCK_ALREADY_DECIDED_CASE_STUDY_SUBMISSION_IDS`, so the 409
//    branch renders. It is fourth so it lands on page two and "Load more" is exercised too.
//
// ⚠️ EVERY PERSON AND COMPANY IS INVENTED AND MUST STAY INVENTED, and every source is on
// `example.com`, for the reason `blueprints-mocks.ts` gives for the published case studies. The
// withheld name is invented as well: it is shown here only because this page is moderator-only.
//
// IMPORT SITES NEVER SEE THIS FILE. Everything goes through
// `@/lib/blueprints/case-study-moderation.api`, which parses each row first.

import type { CaseStudyReviewItem } from "@/lib/blueprints/case-study-moderation.schemas";

/** The queue, oldest first, which is the order a moderator works it. */
export const MOCK_CASE_STUDY_REVIEW_QUEUE: CaseStudyReviewItem[] = [
  {
    submissionId: "case-study-review-001",
    submittedAt: "2026-09-02T08:20:00.000Z",
    author: { displayName: "Ingrid Solberg", handle: "ingrid-tooling" },
    authorRelationship: "first_hand",
    acceptedStatementIds: ["was_part_of_it", "figures_from_records"],
    title: "Quote the bridge tool as its own line, not a discount on steel.",
    oneLineAction:
      "Ask the mould shop to price the aluminium tool separately before you compare quotes.",
    discipline: "tooling",
    sector: "Industrial components",
    outcomeSummary: "Cut the steel tool for four variants instead of nine",
    summary:
      "A fixture maker compared two quotes that looked identical and were not: one hid the bridge tool inside a discount on steel. Pricing it separately changed which shop won and how many variants went into steel.",
    problem:
      "Two mould shops quoted within 3% of each other, but one had folded the aluminium bridge tool into a discount on the steel tool, so the cheaper quote was only cheaper if every variant went to steel.",
    context:
      "A five-person team making mounting fixtures for solar installers, with nine variants and one production run budgeted for the year.",
    actionSteps: [
      "Asked both shops to quote the bridge tool, the steel tool and trimming as three separate lines.",
      "Ran 800 parts off the bridge tool across all nine variants.",
      "Took the parts to three installers and cut the steel tool for the four they used.",
    ],
    pitfalls: [
      "The discount made the combined quote look cheaper while locking in all nine variants.",
      "Nobody asked who paid for trimming flash, and it came to a week of labour.",
    ],
    evidenceCompanies: [
      {
        name: "Halden Toolroom",
        isNameWithheld: true,
        locationLabel: "Western Norway",
        yearLabel: "2025",
      },
      {
        name: "Brattli Fixtures",
        isNameWithheld: false,
        locationLabel: "Bergen",
        yearLabel: "2025",
      },
    ],
    timelineLabel: "5 months, two tools",
    capitalRaised: { amountInCents: 3_100_000, currency: "USD" },
    outcomeMetrics: [
      { label: "Variants tooled in steel", value: { kind: "count", amount: 4 } },
      {
        label: "Bridge tool, quoted separately",
        value: { kind: "money", amountInCents: 1_450_000, currency: "USD" },
      },
      { label: "Steel tooling cost avoided", value: { kind: "percentage", basisPoints: 3850 } },
    ],
    sources: [],
    relatedLessonSlugs: [],
    tags: ["tooling", "injection-molding"],
  },
  {
    submissionId: "case-study-review-002",
    submittedAt: "2026-09-04T11:05:00.000Z",
    author: { displayName: "Kavya Raman", handle: "kavya-supply" },
    authorRelationship: "public_sources",
    acceptedStatementIds: ["figures_in_linked_sources", "says_only_what_sources_say"],
    title: "Price the freight before you price the carton.",
    oneLineAction: "Get a landed-cost quote for your heaviest item before you commit to packaging.",
    discipline: "supply_chain",
    sector: "Consumer hardware",
    outcomeSummary: "Switched to flat-pack cartons after the first container",
    summary:
      "A cookware brand designed a premium gift box, then found that freight on the box cost more than the pan inside it. The founder's newsletter lays out the numbers before and after the switch.",
    problem:
      "The packaging was approved on unit cost alone, and the landed cost only became visible when the first container was invoiced.",
    context:
      "A small kitchenware brand selling cast-iron pans online, shipping by sea from one factory to two warehouses.",
    actionSteps: [
      "Requested landed-cost quotes for the three heaviest items in both carton designs.",
      "Moved the gift box to an optional sleeve and shipped pans in flat-pack cartons.",
    ],
    pitfalls: ["Approving packaging on unit cost without asking what it weighed in a container."],
    evidenceCompanies: [
      {
        name: "Tamarind Kitchenware",
        isNameWithheld: false,
        locationLabel: "Coimbatore",
        yearLabel: "2024",
      },
    ],
    timelineLabel: "9 months, two containers",
    capitalRaised: null,
    outcomeMetrics: [
      {
        label: "Landed cost per pan, gift box",
        value: { kind: "money", amountInCents: 42_500, currency: "INR" },
      },
      {
        label: "Landed cost per pan, flat-pack",
        value: { kind: "money", amountInCents: 31_900, currency: "INR" },
      },
    ],
    sources: [
      {
        label: "Why we dropped the gift box",
        publisherLabel: "Tamarind Kitchenware founder newsletter",
        url: "https://example.com/qatoto/tamarind-gift-box",
      },
      {
        label: "Container invoices, first and second shipment",
        publisherLabel: "Tamarind Kitchenware founder newsletter",
        url: "https://example.com/qatoto/tamarind-container-invoices",
      },
    ],
    relatedLessonSlugs: ["qualify-the-second-supplier-early", "order-long-lead-parts-early"],
    tags: ["packaging", "freight", "unit-economics"],
  },
  {
    submissionId: "case-study-review-003",
    submittedAt: "2026-09-06T15:40:00.000Z",
    author: { displayName: "Tunde Adeyemi", handle: "tunde-builds" },
    authorRelationship: "first_hand",
    acceptedStatementIds: ["was_part_of_it", "figures_from_records"],
    title: "Write the return policy before the first sale.",
    oneLineAction: "Decide who pays for a return before a customer asks.",
    discipline: "distribution",
    sector: "Home appliances",
    outcomeSummary: null,
    summary:
      "The first return arrived in week two, and the team spent three days arguing about who paid the courier instead of answering the customer.",
    problem:
      "Nothing said whether the brand, the retailer or the courier covered a return, so every return became a negotiation.",
    context: "A two-person team selling a countertop grain mill through one online retailer.",
    actionSteps: [
      "Wrote a one-page return policy that named who pays in each case.",
      "Sent it to the retailer and put it on every order confirmation.",
    ],
    pitfalls: [],
    evidenceCompanies: [],
    timelineLabel: null,
    capitalRaised: null,
    outcomeMetrics: [],
    sources: [],
    relatedLessonSlugs: [],
    tags: [],
  },
  {
    submissionId: "case-study-review-004",
    submittedAt: "2026-09-07T09:10:00.000Z",
    author: { displayName: "Mei Lin Ong", handle: "meilin-quality" },
    authorRelationship: "public_sources",
    acceptedStatementIds: ["figures_in_linked_sources", "says_only_what_sources_say"],
    title: "Inspect the tenth unit, not the first.",
    oneLineAction: "Pull inspection samples from the middle of a run, never the start.",
    discipline: "quality",
    sector: "Consumer electronics",
    outcomeSummary: "Caught a drifting solder profile before the second batch shipped",
    summary:
      "A speaker maker's first-article inspections all passed, because the first units off the line were the ones everybody watched being made.",
    problem:
      "Defects appeared only after the line warmed up, and every sample came from the start.",
    context: "A contract-manufactured portable speaker, 2,000 units a batch.",
    actionSteps: ["Moved inspection sampling to units ten, five hundred and fifteen hundred."],
    pitfalls: ["Treating a passed first-article inspection as a passed batch."],
    evidenceCompanies: [
      {
        name: "Larkspur Audio",
        isNameWithheld: false,
        locationLabel: "Penang",
        yearLabel: "2025",
      },
    ],
    timelineLabel: "Two batches",
    capitalRaised: null,
    outcomeMetrics: [{ label: "Units reworked", value: { kind: "count", amount: 140 } }],
    sources: [
      {
        label: "What our first-article inspection missed",
        publisherLabel: "Larkspur Audio engineering blog",
        url: "https://example.com/qatoto/larkspur-inspection",
      },
    ],
    relatedLessonSlugs: ["read-the-returns-first"],
    tags: ["quality", "inspection"],
  },
];

/**
 * Submissions another moderator has "already decided", so deciding them answers 409.
 *
 * ⚠️ THE ONE REAL RULE THE MOCK ENFORCES, for the launch mock's reason: without it the card's 409
 * branch, and its "Refresh the queue" control, could never render.
 */
export const MOCK_ALREADY_DECIDED_CASE_STUDY_SUBMISSION_IDS: ReadonlySet<string> = new Set([
  "case-study-review-004",
]);
