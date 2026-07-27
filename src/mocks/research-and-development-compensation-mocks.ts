import type { ProjectCompensationLedger } from "@/types/research-and-development";
import { AGRICULTURAL_DRONE_KITS_COMPENSATION } from "@/mocks/research-and-development/compensation/agricultural-drone-kits";
import { E_WASTE_RECYCLING_LINE_COMPENSATION } from "@/mocks/research-and-development/compensation/e-waste-recycling-line";
import { MEDICAL_COLD_CHAIN_PACKAGING_COMPENSATION } from "@/mocks/research-and-development/compensation/medical-cold-chain-packaging";
import { MODULAR_WATER_PURIFICATION_COMPENSATION } from "@/mocks/research-and-development/compensation/modular-water-purification";
import { PREFAB_HOUSING_PANELS_COMPENSATION } from "@/mocks/research-and-development/compensation/prefab-housing-panels";
import { SOLAR_COLD_STORAGE_COMPENSATION } from "@/mocks/research-and-development/compensation/solar-cold-storage";

// Cross-project governance rollup (§4c.3) — aggregates and an authored sample
// statement, never a real member's row. Re-exported here so the governance
// stage page imports one compensation-family composer.
export {
  MOCK_GOVERNANCE_SUMMARY,
  SAMPLE_STATEMENT_MEMBER_LABELS,
  SAMPLE_STATEMENT_WALKTHROUGH,
} from "@/mocks/research-and-development/governance-summary";

// Month-end compensation statements — one ledger per research project
// (R_AND_D_STRUCTURE.md §5.5). Static mocks only: the statement math, the
// finalize/countersign chain and the statement hash are backend-owned later.
// Every memberId resolves against the matching project in
// research-and-development-mocks.ts.
//
// Conventions every fixture here holds to:
// - Money is integer cents with an ISO 4217 `currency` beside it; equity is
//   integer basis points (10000 = 100%); effort is integer minutes. Nothing is
//   pre-formatted — the client composes every label.
// - Cash figures are GROSS. No tax, withholding or social contribution is
//   modelled, because Qatoto is not a payroll processor.
// - A `verificationNote` on a cash line is a footnote, never a deduction:
//   verification gates equity, never a wage.
// - Corrections supersede (see solar's May pair). Nothing is edited in place.
export const MOCK_PROJECT_COMPENSATION_LEDGERS: ProjectCompensationLedger[] = [
  SOLAR_COLD_STORAGE_COMPENSATION,
  MODULAR_WATER_PURIFICATION_COMPENSATION,
  AGRICULTURAL_DRONE_KITS_COMPENSATION,
  PREFAB_HOUSING_PANELS_COMPENSATION,
  E_WASTE_RECYCLING_LINE_COMPENSATION,
  MEDICAL_COLD_CHAIN_PACKAGING_COMPENSATION,
];
