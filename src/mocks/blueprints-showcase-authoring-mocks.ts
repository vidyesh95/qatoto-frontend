// Fixtures for the maker's own view of `/studio/launches`.
//
// NOTHING HERE IS REAL, in the sense `blueprints-authoring-mocks.ts` states: there is no showcase
// table, no posting endpoint, and no moderator who has looked at any of these. They exist so the
// management page can be built against something that looks like use.
//
// ⚠️ ONE ROW PER STATE A LAUNCH CAN ACTUALLY REACH, AND THAT IS THE WHOLE SELECTION RULE: `draft`,
// `pending_review`, `published`, `rejected`, `flagged`. Every one is a separate renderer branch, and a
// state with no row is a branch nobody has seen.
// - `quarantined` HAS NO ROW. A quarantine withholds a teardown's FILES; a launch publishes none, so
//   there is nothing for the state to withhold on this arm.
// - `removed` HAS NO ROW, for the teardown fixtures' reason: a removed launch is gone, and a row for it
//   would be the one thing this list must never show.
// - THE EMPTY LIST, which every real first-time maker sees, cannot have a row. It is the one branch of
//   the studio page that ships unexercised, recorded in `todo.md`.
//
// IMPORT SITES NEVER SEE THIS FILE. Everything goes through `@/lib/blueprints/showcase-authoring.api`,
// which parses each row through `ShowcaseSubmissionSchema` first.

import type { ShowcaseSubmission } from "@/lib/blueprints/showcase-authoring.schemas";

/**
 * The signed-in maker's launches, newest first.
 *
 * ⚠️ THE PUBLISHED AND FLAGGED ROWS NAME REAL FIXTURE LAUNCHES, title and slug, so "View the page"
 * opens the launch the row describes rather than a 404 or a different build. The other three are
 * invented builds that were never published, and they must stay invented.
 *
 * ⚠️ NOTE WHAT THE REJECTION SAYS. It names a fixable gap in the evidence, not a verdict about the
 * maker: a rejection somebody cannot act on produces the same post again, and a second rejection.
 */
export const MOCK_MY_SHOWCASE_SUBMISSIONS: ShowcaseSubmission[] = [
  {
    submissionId: "launch-005",
    title: "Bench-top incubator for a rural clinic lab",
    tagline: "Holds 37 °C within 0.3 degrees on a 12 V supply",
    headingImageUrl: "/dummy/thumbnail_image02.avif",
    moderationState: "draft",
    submittedAt: "2026-09-10T15:20:00.000Z",
    publicSlug: null,
    moderatorNote: null,
  },
  {
    submissionId: "launch-004",
    title: "Cold-chain crates for a dairy co-operative",
    tagline: "Six crates, two weeks, milk still under 6 °C at market",
    headingImageUrl: "/dummy/placeholder-freezers.avif",
    moderationState: "pending_review",
    submittedAt: "2026-09-09T09:40:00.000Z",
    publicSlug: null,
    moderatorNote: null,
  },
  {
    submissionId: "launch-003",
    title: "Forty moisture meters, one harvest season",
    tagline: "Within 0.4% of the lab, in a shed, on a phone charger",
    headingImageUrl: "/dummy/thumbnail_image10.avif",
    moderationState: "published",
    submittedAt: "2026-08-22T13:40:00.000Z",
    publicSlug: "grain-moisture-meter-field-units",
    moderatorNote: null,
  },
  {
    submissionId: "launch-002",
    title: "Solar egg incubator, second revision",
    tagline: "Hatch rate up from 61% to 84% across three batches",
    headingImageUrl: "/dummy/thumbnail_image07.avif",
    moderationState: "rejected",
    submittedAt: "2026-08-11T10:05:00.000Z",
    publicSlug: null,
    moderatorNote:
      "The hatch-rate figures are clear, but the launch doesn't say how many eggs each batch held, so a reader can't tell what 84% means. Add the batch sizes and post it again.",
  },
  {
    submissionId: "launch-001",
    title: "Retrofitting eleven dairy chillers instead of replacing them",
    tagline: "23% less energy per litre, without buying a single new chiller",
    headingImageUrl: "/dummy/placeholder-compressors.avif",
    moderationState: "flagged",
    submittedAt: "2026-07-30T08:15:00.000Z",
    publicSlug: "dairy-chiller-retrofit-pilot",
    moderatorNote:
      "Somebody has reported that a photo in this launch belongs to another company. Nothing has been ruled on, and the launch is still public while we look.",
  },
];
