// Fixtures for the author's own view of `/studio/blueprints`.
//
// NOTHING HERE IS REAL, in exactly the sense `blueprints-mocks.ts` says at length: there is no
// `blueprint` table, no submission endpoint, and no moderator who has looked at any of these. They
// exist so the management surface can be built against something that looks like use.
//
// ⚠️ SIX ROWS, ONE PER STATE, AND THAT IS THE WHOLE SELECTION RULE. Not "a few examples" and not a
// realistic-looking spread — an enumerated state list, because every one of these is a separate
// renderer branch and a state with no row is a branch nobody has seen. `draft`, `pending_review`,
// `published`, `rejected`, `flagged`, `quarantined`. `removed` is deliberately absent: a removed
// submission is gone, and a row for it would be the one thing this list must never show.
//
// ⚠️ THE SEVENTH STATE THE PAGE MUST HANDLE HAS NO ROW HERE AND CANNOT HAVE ONE — the EMPTY list,
// which is what every real first-time author sees. It is the one branch of the studio page that
// ships unexercised, recorded in `todo.md` rather than faked behind a query param.
//
// IMPORT SITES NEVER SEE THIS FILE. Everything goes through `@/lib/blueprints/authoring.api`, which
// parses each row through `TeardownSubmissionSchema` first.

import type { TeardownSubmission } from "@/lib/blueprints/authoring.schemas";

/**
 * The signed-in publisher's submissions, newest first.
 *
 * ⚠️ THE SUBJECT PRODUCT NAMES ARE INVENTED AND MUST STAY INVENTED, for the reason the read
 * fixtures give: a fabricated teardown is covered by the surface's de-indexing, and a fabricated
 * rejection pinned to a real company's product is not covered by anything.
 *
 * ⚠️ NOTE WHAT THE REJECTION ACTUALLY SAYS. It names a fixable problem — a missing acquisition
 * record — rather than a verdict about the person. A rejection an author cannot act on produces a
 * resubmission of the same thing, and then a second rejection.
 */
export const MOCK_MY_TEARDOWN_SUBMISSIONS: TeardownSubmission[] = [
  {
    submissionId: "sub-006",
    title: "Bench centrifuge drive and speed control",
    subjectProductName: "6-place benchtop centrifuge (invented unit)",
    moderationState: "draft",
    submittedAt: "2026-09-09T16:40:00.000Z",
    publicSlug: null,
    moderatorNote: null,
  },
  {
    submissionId: "sub-005",
    title: "Pedal-powered water pump, drive train and seals",
    subjectProductName: "Treadle irrigation pump (invented unit)",
    moderationState: "pending_review",
    submittedAt: "2026-09-08T11:05:00.000Z",
    publicSlug: null,
    moderatorNote: null,
  },
  {
    submissionId: "sub-004",
    title: "Solar cold-storage controller, board and all",
    subjectProductName: "400 L off-grid chest freezer control board (invented unit)",
    moderationState: "published",
    submittedAt: "2026-08-14T09:12:00.000Z",
    // The one row with a public address, and it matches a real fixture teardown so the studio
    // list's "view it" link resolves rather than 404ing.
    publicSlug: "solar-cold-storage-controller-teardown",
    moderatorNote: null,
  },
  {
    submissionId: "sub-003",
    title: "Cordless drill gearbox and clutch",
    subjectProductName: "18 V cordless drill (invented unit)",
    moderationState: "rejected",
    submittedAt: "2026-08-02T14:20:00.000Z",
    publicSlug: null,
    moderatorNote:
      "The survey looks sound, but the acquisition line says the unit came from a workshop you contract to. We need it to be a unit you bought or were given outright. Say where it came from and resubmit.",
  },
  {
    submissionId: "sub-002",
    title: "Off-grid router power rail",
    subjectProductName: "Solar-powered outdoor router (invented unit)",
    moderationState: "flagged",
    submittedAt: "2026-01-09T08:30:00.000Z",
    publicSlug: "off-grid-router-power-rail-teardown",
    moderatorNote:
      "Somebody has reported an IP concern. Nothing has been ruled on and your teardown is still public while we look.",
  },
  {
    submissionId: "sub-001",
    title: "Grain moisture meter, sensing plate and front end",
    subjectProductName: "Capacitive grain moisture meter (invented unit)",
    moderationState: "quarantined",
    submittedAt: "2026-01-22T10:15:00.000Z",
    publicSlug: "grain-moisture-meter-teardown",
    moderatorNote:
      "A rights holder raised a claim and it was substantiated, so your files are withheld while it is reviewed. Your work has not been deleted and the page still explains why.",
  },
];
