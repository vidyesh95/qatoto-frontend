import type { ProjectOversight } from "@/types/research-and-development";
import { AGRICULTURAL_DRONE_KITS_OVERSIGHT } from "@/mocks/research-and-development/oversight/agricultural-drone-kits";
import { E_WASTE_RECYCLING_LINE_OVERSIGHT } from "@/mocks/research-and-development/oversight/e-waste-recycling-line";
import { MEDICAL_COLD_CHAIN_PACKAGING_OVERSIGHT } from "@/mocks/research-and-development/oversight/medical-cold-chain-packaging";
import { MODULAR_WATER_PURIFICATION_OVERSIGHT } from "@/mocks/research-and-development/oversight/modular-water-purification";
import { PREFAB_HOUSING_PANELS_OVERSIGHT } from "@/mocks/research-and-development/oversight/prefab-housing-panels";
import { SOLAR_COLD_STORAGE_OVERSIGHT } from "@/mocks/research-and-development/oversight/solar-cold-storage";

export { INTEGRATION_PROVIDER_LABELS } from "@/mocks/research-and-development/oversight/integration-scopes";

// Human-oversight and consent fixtures — one per research project
// (R_AND_D_STRUCTURE.md §14.1, §14.2, §14.4, §14.6). Static mocks only: dispute
// resolution, override decisions, OAuth grants, rate locking, pie baking and
// hash-chain recomputation are all backend-owned later. Every memberId,
// disputeWindowEntryId, claimVerificationRunId and auditEntryId resolves against
// the matching project and Proof of Effort ledger.
//
// Conventions every fixture here holds to:
// - Rates are integer cents per hour with an ISO 4217 `currency`; equity is
//   basis points; slices are plain integers.
// - `escrowedSlices` means slices frozen outside the pool while a case runs. It
//   is a pool of slices, never money — Qatoto holds no funds in this domain.
// - Hashes are the full 64 hex chars. Render a short form; never key or compare
//   on one.
// - Override decisions go three ways on purpose: reversing a flag, upholding it,
//   and reversing it *against* the member. Human review is not a rubber stamp.
export const MOCK_PROJECT_OVERSIGHT: ProjectOversight[] = [
  SOLAR_COLD_STORAGE_OVERSIGHT,
  MODULAR_WATER_PURIFICATION_OVERSIGHT,
  AGRICULTURAL_DRONE_KITS_OVERSIGHT,
  PREFAB_HOUSING_PANELS_OVERSIGHT,
  E_WASTE_RECYCLING_LINE_OVERSIGHT,
  MEDICAL_COLD_CHAIN_PACKAGING_OVERSIGHT,
];
