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
  CompensationEarnedAsPolicy,
  ProjectStage,
  RoleCommitment,
} from "@/lib/rnd/shared.schemas";
import type { SupplierContactPolicy, SupplierVerificationState } from "@/lib/rnd/suppliers.schemas";
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
