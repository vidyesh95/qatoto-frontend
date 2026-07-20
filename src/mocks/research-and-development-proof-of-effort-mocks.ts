import type { ProjectProofOfEffortLedger } from "@/types/research-and-development";
import { AGRICULTURAL_DRONE_KITS_LEDGER } from "@/mocks/research-and-development/proof-of-effort/agricultural-drone-kits";
import { E_WASTE_RECYCLING_LINE_LEDGER } from "@/mocks/research-and-development/proof-of-effort/e-waste-recycling-line";
import { MEDICAL_COLD_CHAIN_PACKAGING_LEDGER } from "@/mocks/research-and-development/proof-of-effort/medical-cold-chain-packaging";
import { MODULAR_WATER_PURIFICATION_LEDGER } from "@/mocks/research-and-development/proof-of-effort/modular-water-purification";
import { PREFAB_HOUSING_PANELS_LEDGER } from "@/mocks/research-and-development/proof-of-effort/prefab-housing-panels";
import { SOLAR_COLD_STORAGE_LEDGER } from "@/mocks/research-and-development/proof-of-effort/solar-cold-storage";

// Proof of Effort fixtures — one ledger per research project. Static mocks
// only (phase rule): the Slicing Pie math, verification pipeline, and dispute
// escrow are backend-owned later; the frontend only renders these strings.
// Every memberId / dailyLogId resolves against the matching project in
// research-and-development-mocks.ts.
//
// Math recipe (kept exact so every displayed figure divides cleanly):
// - 1% of equity = 2,000 slices, so every project's pool is 200,000 slices.
// - memberTotalSlices = equitySharePercent × 2,000 (reuses the Team tab's
//   equityShare verbatim).
// - time slices = effortHoursLogged × lockedFairMarketRate × 2 (reuses the
//   Team tab's hours verbatim).
// - cash contribution = (memberTotalSlices − timeSlices) / 4.
// - The equity the Team tab leaves unallocated is modelled as a team-agreed
//   reserve slice pool for open roles — a mild deviation from orthodox
//   Slicing Pie (where every slice belongs to a contributor), noted here so
//   the backend phase can revisit it.
// - Per-claim awards = claimedHours × that member's locked rate × 2; cash
//   dispute entries use × 4.
export const MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS: ProjectProofOfEffortLedger[] = [
  SOLAR_COLD_STORAGE_LEDGER,
  MODULAR_WATER_PURIFICATION_LEDGER,
  AGRICULTURAL_DRONE_KITS_LEDGER,
  PREFAB_HOUSING_PANELS_LEDGER,
  E_WASTE_RECYCLING_LINE_LEDGER,
  MEDICAL_COLD_CHAIN_PACKAGING_LEDGER,
];
