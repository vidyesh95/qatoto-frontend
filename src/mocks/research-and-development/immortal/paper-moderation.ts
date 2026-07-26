import type { ImmortalPaperModerationEntry } from "@/types/research-and-development";

// The formal track's moderation queue (§14.6). The informal track has no queue
// by design — it claims nothing, so there is nothing to check. Papers here
// claim citations and proofs, and the program's name goes on them.
export const MOCK_IMMORTAL_PAPER_MODERATION_QUEUE: ImmortalPaperModerationEntry[] = [
  {
    id: "immortal-moderation-1",
    paperTitle: "Partial reprogramming without teratoma risk: a 90-day murine protocol",
    authorName: "Dr. Hana Okafor",
    authorAffiliation: "Independent",
    category: "cellular-reprogramming",
    submittedAt: "2026-07-24T09:15:00Z",
    status: "queued",
    flagReasons: ["No references section detected", "Figure 3 has no source"],
    reviewerName: null,
    reviewedAt: null,
    reviewerNote: null,
  },
  {
    id: "immortal-moderation-2",
    paperTitle: "Senolytic dosing windows inferred from 12 public cohort datasets",
    authorName: "Ravi Subramanian",
    authorAffiliation: "Chennai Institute of Ageing",
    category: "longevity-biology",
    submittedAt: "2026-07-22T14:40:00Z",
    status: "needs_changes",
    flagReasons: ["Two cited datasets are behind a licence the program cannot redistribute"],
    reviewerName: "Dr. Amara Nwosu",
    reviewedAt: "2026-07-23T08:20:00Z",
    reviewerNote:
      "Strong analysis. Replace the two licensed cohorts with the open UK Biobank subset and resubmit.",
  },
  {
    id: "immortal-moderation-3",
    paperTitle: "A protein-folding surrogate for screening geroprotective candidates",
    authorName: "Lin Wei",
    authorAffiliation: "Shenzhen Open Bio Lab",
    category: "ai-drug-discovery",
    submittedAt: "2026-07-19T06:00:00Z",
    status: "approved",
    flagReasons: [],
    reviewerName: "Dr. Amara Nwosu",
    reviewedAt: "2026-07-20T10:05:00Z",
    reviewerNote: "Methods reproduce on the shared notebook. Published to the formal library.",
  },
  {
    id: "immortal-moderation-4",
    paperTitle: "Immortality is inevitable by 2031",
    authorName: "Anonymous",
    authorAffiliation: "—",
    category: "ethics-and-society",
    submittedAt: "2026-07-18T21:30:00Z",
    status: "rejected",
    flagReasons: ["No citations", "No methodology", "Assertion presented as finding"],
    reviewerName: "Dr. Amara Nwosu",
    reviewedAt: "2026-07-19T07:45:00Z",
    reviewerNote:
      "Rejected from the formal track — nothing here is checkable. Posted to the informal track instead, where an idea is allowed to be just an idea.",
  },
];
