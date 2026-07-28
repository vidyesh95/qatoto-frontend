// Knowledge Hub (Civic Pulse problem reports, market insights, trending
// signals) and the /talent equity-for-skills marketplace. Data truth lives in
// the Express backend; these shapes are the client-side contract only.
// UI-building phase: consumed from static mocks in
// `src/mocks/research-and-development-mocks.ts`, no fetch layer yet.

import type { CompensationComponent, MapPosition } from "./project";
import type { RoleCommitment, TrendDirection } from "./shared";

export type ProblemReport = {
  id: string;
  title: string;
  category: string;
  locationLabel: string;
  countryCode: string;
  mapPosition: MapPosition;
  reportCount: number;
  // 0–100, sizes/colors map pins.
  opportunityScore: number;
  description: string;
  reportedDate: string;
};

export type MarketInsight = {
  id: string;
  headline: string;
  statValue: string;
  trendDirection: TrendDirection;
  region: string;
  category: string;
  sourceNote: string;
};

// One row of the knowledge-hub demand leaderboard.
export type TrendingSignal = {
  id: string;
  rank: number;
  category: string;
  region: string;
  demandScore: number;
  trendDirection: TrendDirection;
  relatedProjectsCount: number;
};

export type TalentAvailability = "open_to_work" | "open_to_offers" | "unavailable";

// One person on the /talent equity-for-skills marketplace.
export type TalentProfile = {
  id: string;
  name: string;
  avatarImageSrc: string;
  headlineRole: string;
  skills: string[];
  // What the person wants in return: >= 1 strand, at most one per kind. No
  // earnedAsLabel — that mechanism belongs to the role offering the work.
  compensationAsk: CompensationComponent[];
  commitment: RoleCommitment;
  locationLabel: string;
  availability: TalentAvailability;
  projectsCompletedCount: number;
  effortHoursLogged: number;
};

// ---------------------------------------------------------------------------
// Go-to-market (R_AND_D_STRUCTURE.md §4c.4, backend §11i) — the supplier / ODM
// directory and the derived launch-readiness checklist.
//
// These shapes are authored in the §11 wire format from the start: integer
// units with the unit in the field name, snake_case enum values, and no
// pre-formatted display strings. They have no legacy importers, so the §12
// migration never has to touch them.
// ---------------------------------------------------------------------------

export type SupplierVerificationState = "unverified" | "verified" | "suspended";

// Whether the directory publishes a way to reach the supplier at all.
export type SupplierContactPolicy = "open" | "request_only" | "closed";

export type SupplierCapabilityKind = "manufacturing" | "odm" | "logistics" | "certification";

// One entry of the seeded capability vocabulary behind the filter chips. Slugs,
// never free text — the same reason talent skills become slugs (§12): a
// substring match over display labels makes "Water" match "Water Polo".
export type SupplierCapability = {
  slug: string;
  displayLabel: string;
  kind: SupplierCapabilityKind;
};

// A manufacturing / ODM partner in the public directory. Deliberately carries
// no money field: currency derives from the project and a supplier belongs to
// none, so a directory-level price would have to invent one. A quote belongs to
// an engagement, priced in that project's currency.
export type SupplierProfile = {
  // Public identity — unwritable once created, because clients link to it.
  slug: string;
  name: string;
  summary: string;
  regionSlug: string;
  regionDisplayLabel: string;
  verificationState: SupplierVerificationState;
  contactPolicy: SupplierContactPolicy;
  websiteUrl: string | null;
  // Integer days, never "12 days". Null when the supplier publishes none.
  leadTimeDays: number | null;
  minimumOrderQuantity: number | null;
  capabilities: SupplierCapability[];
};

// The six derived readiness items. Fixed keys, never server prose — three
// native clients localize their own copy from the key plus observedCount.
export type LaunchReadinessItemKey =
  | "stage_is_go_to_market"
  | "verified_effort_recorded"
  | "equity_allocated"
  | "cap_table_baked"
  | "supplier_engaged"
  | "store_listing_exists";

// Three states, not four. `waived` is a recorded decision by a named person —
// currently unreachable (no waiver is granted anywhere), and kept in the union
// so it can never be mistaken for a fourth flavour of `met`.
export type LaunchReadinessState = "met" | "not_met" | "waived";

export type LaunchReadinessItem = {
  key: LaunchReadinessItemKey;
  state: LaunchReadinessState;
  // Integer count behind the item, e.g. engaged suppliers. A missing signal is
  // `not_met` with a count of 0 — never `0` presented as a finding.
  observedCount: number;
};

// Computed on read from project stage, stats, the pie-bake event, engagements
// and whether a store listing exists. There is no readiness table and no body
// that sets a state.
export type ProjectLaunchReadiness = {
  // Matches ResearchProject.id.
  projectId: string;
  items: LaunchReadinessItem[];
  asOf: string;
};
