// Mock data for the R&D surface during the UI-building phase. When the backend
// phase starts, a getter layer replaces the import sites — these mocks stay as
// fixtures. Every cross-referenced id (insights, problem reports, milestones,
// team members) resolves within this file.
//
// This file is a thin composer over `src/mocks/research-and-development/` —
// each research project and each other fixture array lives in its own file
// there. Everything exported here re-exports (or derives from) those files so
// consumer imports of `@/mocks/research-and-development-mocks` never change.

import type { OpenRole, ResearchProject } from "@/types/research-and-development";
import { AGRICULTURAL_DRONE_KITS_PROJECT } from "@/mocks/research-and-development/projects/agricultural-drone-kits";
import { E_WASTE_RECYCLING_LINE_PROJECT } from "@/mocks/research-and-development/projects/e-waste-recycling-line";
import { MEDICAL_COLD_CHAIN_PACKAGING_PROJECT } from "@/mocks/research-and-development/projects/medical-cold-chain-packaging";
import { MODULAR_WATER_PURIFICATION_PROJECT } from "@/mocks/research-and-development/projects/modular-water-purification";
import { PREFAB_HOUSING_PANELS_PROJECT } from "@/mocks/research-and-development/projects/prefab-housing-panels";
import { SOLAR_COLD_STORAGE_PROJECT } from "@/mocks/research-and-development/projects/solar-cold-storage";

export { MOCK_INVESTOR_CONFIDENCE_BY_PROJECT_ID } from "@/mocks/research-and-development/investor-confidence";
export { MOCK_MARKET_INSIGHTS } from "@/mocks/research-and-development/market-insights";
export { PROJECT_STAGE_LABELS } from "@/mocks/research-and-development/project-stage-labels";
export { MOCK_PROBLEM_REPORTS } from "@/mocks/research-and-development/problem-reports";
export { MOCK_TALENT_PROFILES } from "@/mocks/research-and-development/talent-profiles";
export { MOCK_TRENDING_SIGNALS } from "@/mocks/research-and-development/trending-signals";

export const MOCK_RESEARCH_PROJECTS: ResearchProject[] = [
  SOLAR_COLD_STORAGE_PROJECT,
  MODULAR_WATER_PURIFICATION_PROJECT,
  AGRICULTURAL_DRONE_KITS_PROJECT,
  PREFAB_HOUSING_PANELS_PROJECT,
  E_WASTE_RECYCLING_LINE_PROJECT,
  MEDICAL_COLD_CHAIN_PACKAGING_PROJECT,
];

// Flattened from the projects so role cards and project pages never drift apart.
export const MOCK_OPEN_ROLES: OpenRole[] = MOCK_RESEARCH_PROJECTS.flatMap(
  (project) => project.openRoles,
);
