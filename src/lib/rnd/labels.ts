// TRANSPORT: props-only — display maps, no network.
//
// Human labels for the wire enums. These live in src/lib rather than src/mocks because
// they are NOT data: they survive every phase, whereas a mock leaf is deleted the
// moment its route is wired.
//
// English strings here are a WEB-CLIENT concern. The wire carries the enum value and
// each of the three clients maps it to its own localized copy — which is the whole
// reason the backend never sends prose (backend §4d).

import type {
  ResearchContributionKind,
  ResearchBranchStatus,
  ResearchModerationActionKind,
  ResearchPaperModerationStatus,
  ResearchParticipantRole,
  ResearchPostTrack,
} from "@/lib/rnd/research-programs.schemas";
import type {
  DailyLogAnalysisStatus,
  EffortVerificationStatus,
} from "@/lib/rnd/daily-logs.schemas";
import type {
  CompensationEarnedAsPolicy,
  ProjectStage,
  RoleCommitment,
} from "@/lib/rnd/shared.schemas";
import type { ResearchCategory } from "@/lib/rnd/catalog.schemas";
import type { SupplierContactPolicy, SupplierVerificationState } from "@/lib/rnd/suppliers.schemas";
import type { VerificationStepKind } from "@/lib/rnd/proof-of-effort.schemas";
import type { TalentAvailability } from "@/lib/rnd/discovery.schemas";

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  market_research: "Market Research",
  problem_validation: "Problem Validation",
  team_building: "Team Building",
  building_mvp: "Building MVP",
  raising_funding: "Raising Funding",
  go_to_market: "Go-to-Market",
};

export const ROLE_COMMITMENT_LABELS: Record<RoleCommitment, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  hobby: "Hobby",
};

/**
 * How a strand is earned. Replaces the free-prose `earnedAsLabel` a founder used to
 * write, which let them advertise a payout mechanism the platform will not execute.
 *
 * NO LABEL HERE MAY IMPLY A PAYMENT RAIL, A HOLD, A CHARGE OR A FEE. Qatoto holds no
 * funds and charges nobody in this domain (backend §7A.6) — cash is paid by the company
 * and merely REPORTED here. The first two values are retired: readable on historical
 * rows, never writable, and never offered in a picker.
 */
export const COMPENSATION_EARNED_AS_POLICY_LABELS: Record<CompensationEarnedAsPolicy, string> = {
  milestone_escrow_release: "Retired policy (historical)",
  on_completion_escrow_release: "Retired policy (historical)",
  slicing_pie_vesting: "Vests as verified effort earns slices",
  off_platform_payroll: "Paid by the company, reported here",
  direct_transfer: "Paid directly, reported here",
};

/**
 * The six verification states, which replace a boolean that could only say yes or no.
 *
 * Each label states what the PIPELINE has done, never a judgement about the member.
 * `not_run` and `unverified` must read differently — one means nothing was ever asked,
 * the other means it was asked and the answer was no — and the two in-flight states
 * must not read as a refusal.
 */
export const EFFORT_VERIFICATION_STATUS_LABELS: Record<EffortVerificationStatus, string> = {
  not_run: "Not checked yet",
  queued: "Queued for checking",
  running: "Checking now",
  verified: "Verified",
  flagged_for_review: "Flagged for review",
  unverified: "Could not verify",
};

/**
 * The four pipeline steps, phrased as the QUESTION each one answers rather than as its
 * internal name — a reviewer deciding whether to override needs to know what was asked,
 * and "artifact_grounding" does not say.
 *
 * TYPED OVER THE ENUM, so a fifth step kind is a compile error here rather than a raw
 * `snake_case` token rendered to a reviewer. It moved out of `claim-detail-disclosure.tsx`
 * when the override queue gained a second reader: two maps for one enum drift, and the
 * queue and the detail must name the same step identically or a reviewer answering from
 * the queue cannot tell it is the row they just read.
 */
export const VERIFICATION_STEP_KIND_LABELS: Record<VerificationStepKind, string> = {
  claim_extraction: "What was claimed",
  artifact_grounding: "Do the artifacts back it",
  substance_analysis: "Is the work substantive",
  temporal_analysis: "Do the timestamps line up",
};

/**
 * The analysis job's lifecycle. `skipped_unconfigured` is deliberately not phrased as a
 * failure — it is an operator fact about this environment, and calling it a failure
 * sends a member chasing a problem with their log that does not exist.
 */
export const DAILY_LOG_ANALYSIS_STATUS_LABELS: Record<DailyLogAnalysisStatus, string> = {
  not_requested: "Not requested",
  queued: "Queued",
  running: "Analyzing",
  succeeded: "Analyzed",
  failed: "Analysis failed",
  skipped_unconfigured: "Analysis unavailable here",
};

export const TALENT_AVAILABILITY_LABELS: Record<TalentAvailability, string> = {
  open_to_work: "Open to work",
  open_to_offers: "Open to offers",
  unavailable: "Unavailable",
};

/**
 * `documents_pending` reads as in-progress rather than as a verdict — a moderator has
 * asked for paperwork, which is not a finding about the supplier.
 */
export const SUPPLIER_VERIFICATION_STATE_LABELS: Record<SupplierVerificationState, string> = {
  unverified: "Unverified",
  documents_pending: "Documents pending",
  verified: "Verified",
  suspended: "Suspended",
};

/**
 * `no_contact` exists because a curated directory lists entities that never asked to be
 * listed, so the label says "reference only" rather than implying a closed inbox.
 */
export const SUPPLIER_CONTACT_POLICY_LABELS: Record<SupplierContactPolicy, string> = {
  via_platform: "Contact via Qatoto",
  direct_email: "Direct email",
  no_contact: "Reference only",
};

// --- §10 research programs ---------------------------------------------------
//
// These replace four kebab-case label maps that lived in `src/mocks/` — the roles and the paper
// categories among them. The roles are now `snake_case` pgEnum labels, and the CATEGORIES are
// gone from here entirely: they are a table, so a paper carries a `categoryId` and the label
// arrives joined on the wire. There is nothing left to hardcode.

/**
 * The branch map's four states, in reader-facing words.
 *
 * `missing` and `contested` are the two the surface exists for, and the labels say what they
 * MEAN rather than naming the enum: "Missing research" is a gap nobody is working on, and
 * "Overlapping work" is several groups asking one question. Both are derived nightly — never
 * present them as something the branch's author chose.
 */
export const RESEARCH_BRANCH_STATUS_LABELS: Record<ResearchBranchStatus, string> = {
  active: "Active",
  emerging: "Emerging",
  contested: "Overlapping work",
  missing: "Missing research",
};

export const RESEARCH_PARTICIPANT_ROLE_LABELS: Record<ResearchParticipantRole, string> = {
  researcher: "Researcher",
  founder_director: "Founder & Director",
  venture_capitalist: "Venture Capitalist",
  supplier: "Supplier",
  supporter: "Supporter",
};

export const RESEARCH_PAPER_MODERATION_STATUS_LABELS: Record<
  ResearchPaperModerationStatus,
  string
> = {
  queued: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  // A request, not a refusal — and the label has to say so, because the author's next step is
  // to re-submit rather than to give up.
  needs_changes: "Changes requested",
};

/**
 * How settled a taxonomy row is — these render as the tag on a combobox row, beside a name
 * the user can still pick. NOT a refusal: every writer of `research_category` accepts
 * anything but `rejected`, so these qualify an option rather than disqualifying it.
 * `approved` is deliberately empty — a settled category is just vocabulary and carries no tag.
 */
export const RESEARCH_CATEGORY_STATUS_LABELS: Record<ResearchCategory["status"], string> = {
  pending: "Awaiting review",
  approved: "",
  rejected: "Not approved",
  // Folded into another category by a moderator. The name still resolves, so it is shown
  // rather than hidden — but choosing it would file against a row nobody maintains.
  merged: "Merged into another",
};

export const RESEARCH_POST_TRACK_LABELS: Record<ResearchPostTrack, string> = {
  informal_paper: "Informal paper",
  idea: "Idea",
};

/**
 * What a contribution WAS, not what it settled.
 *
 * `cash_commitment` is deliberately "Cash committed" rather than "Cash paid" or "Escrowed" —
 * nothing on this surface moves money, and the mock this replaces said "$250K escrowed" about a
 * mechanism that no longer exists in the backend at all.
 */
export const RESEARCH_CONTRIBUTION_KIND_LABELS: Record<ResearchContributionKind, string> = {
  cash_commitment: "Cash committed",
  material: "Materials",
  data: "Data",
  equipment: "Equipment",
  expertise: "Expertise",
};

/** A moderator's decision, for the audit log. Past tense: these already happened. */
export const RESEARCH_MODERATION_ACTION_LABELS: Record<ResearchModerationActionKind, string> = {
  program_published: "Published this program",
  program_rejected: "Rejected this program",
  paper_approved: "Approved a paper",
  paper_rejected: "Rejected a paper",
  paper_needs_changes: "Requested changes to a paper",
  post_hidden: "Hid a post",
  post_restored: "Restored a post",
  report_dismissed: "Dismissed a report",
};
