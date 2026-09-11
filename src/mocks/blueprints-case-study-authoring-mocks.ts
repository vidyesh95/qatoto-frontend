// Fixtures for the writer's own view of `/studio/case-studies`.
//
// NOTHING HERE IS REAL: there is no case-study table, no endpoint to send one to, and no moderator
// who has looked at any of these.
//
// ⚠️ ONE ROW PER STATE A CASE STUDY CAN ACTUALLY REACH, AND THAT IS THE WHOLE SELECTION RULE: `draft`,
// `pending_review`, `published`, `rejected`, `flagged`. Every one is a separate renderer branch.
// - `quarantined` HAS NO ROW. A quarantine withholds a teardown's FILES, and a case study publishes
//   none, so the state has nothing to withhold on this arm.
// - `removed` HAS NO ROW: a removed case study is gone, and a row for it is the one thing this list
//   must never show.
// - THE EMPTY LIST cannot have a row. It is the one branch of the studio page that ships unexercised.
//
// ⚠️ NO ROW NAMES A COMPANY, and the notes describe the problem without one. The published and flagged
// rows point at fixture case studies whose companies are already invented; the other three are
// invented lessons that were never published, and they must stay invented.
//
// IMPORT SITES NEVER SEE THIS FILE. Everything goes through `@/lib/blueprints/case-study-authoring.api`,
// which parses each row through `CaseStudySubmissionSchema` first.

import type { CaseStudySubmission } from "@/lib/blueprints/case-study-authoring.schemas";

/**
 * The signed-in writer's case studies, newest first.
 *
 * ⚠️ THE PUBLISHED AND FLAGGED ROWS NAME REAL FIXTURE CASE STUDIES, title and slug, so "View the case
 * study" opens the record the row describes rather than a 404.
 *
 * ⚠️ NOTE WHAT THE REJECTION SAYS. It names a fixable gap, an unsourced figure on a case study written
 * from public sources, and the two ways to fix it. A rejection nobody can act on produces the same
 * case study again.
 */
export const MOCK_MY_CASE_STUDY_SUBMISSIONS: CaseStudySubmission[] = [
  {
    submissionId: "case-study-005",
    title: "Price the service contract before you price the machine.",
    oneLineAction: "Work out what a year of servicing costs before you quote a unit price.",
    discipline: "unit_economics",
    moderationState: "draft",
    submittedAt: "2026-09-10T16:05:00.000Z",
    publicSlug: null,
    moderatorNote: null,
  },
  {
    submissionId: "case-study-004",
    title: "Test the carton on your worst road, not your average one.",
    oneLineAction:
      "Ship ten units over the roughest route you sell into before you commit to a box.",
    discipline: "quality",
    moderationState: "pending_review",
    submittedAt: "2026-09-08T10:20:00.000Z",
    publicSlug: null,
    moderatorNote: null,
  },
  {
    submissionId: "case-study-003",
    title: "Find the step that stopped scaling before you cut the bill of materials.",
    oneLineAction: "Time each assembly step at two volumes before you requote a single component.",
    discipline: "unit_economics",
    moderationState: "published",
    submittedAt: "2026-09-01T09:30:00.000Z",
    publicSlug: "find-the-step-that-stopped-scaling",
    moderatorNote: null,
  },
  {
    submissionId: "case-study-002",
    title: "Keep a second freight forwarder quoting all year.",
    oneLineAction:
      "Get a live quote from a second forwarder every quarter, even when the first is fine.",
    discipline: "supply_chain",
    moderationState: "rejected",
    submittedAt: "2026-08-20T14:10:00.000Z",
    publicSlug: null,
    moderatorNote:
      "The lesson is clear, but the 30% saving has no source, and this case study says it was written from public sources. Link where that figure was published, or choose I worked on this if it came from your own records, and send it again.",
  },
  {
    submissionId: "case-study-001",
    title: "Read the returns before you read the reviews.",
    oneLineAction: "Open ten returned units before you commission any customer research.",
    discipline: "quality",
    moderationState: "flagged",
    submittedAt: "2026-08-04T08:45:00.000Z",
    publicSlug: "read-the-returns-first",
    moderatorNote:
      "A company named in this case study says one of its figures is wrong. Nothing has been decided, and the case study stays public while we look.",
  },
];
