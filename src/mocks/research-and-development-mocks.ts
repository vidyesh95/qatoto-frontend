// Mock fixtures for the R&D surfaces that are NOT wired yet.
//
// This tree shrinks one phase at a time: when a route starts reading the Express backend,
// its mock leaf is deleted rather than kept as a fallback, so what is left on disk is
// exactly what is still unwired (docs/R_AND_D_STRUCTURE.md §18).
//
// GONE IN PHASE 1, with the routes that read them: market insights, problem reports,
// trending signals, talent profiles, suppliers + launch readiness, and investor
// confidence. Those surfaces now read `@/lib/rnd/*.api` and take their types from the
// response schemas. `project-stage-labels` moved to `@/lib/rnd/labels` — it is a display
// map, not data, so it survives every phase.
//
// STILL HERE: the six research projects, which back the detail / workshop /
// proof-of-effort routes and their `generateStaticParams` until phase 2 wires
// `GET /research-projects/:slug` and `GET /research-projects/slugs`.

import type { OpenRole, ResearchProject } from "@/types/research-and-development";
import { AGRICULTURAL_DRONE_KITS_PROJECT } from "@/mocks/research-and-development/projects/agricultural-drone-kits";
import { E_WASTE_RECYCLING_LINE_PROJECT } from "@/mocks/research-and-development/projects/e-waste-recycling-line";
import { MEDICAL_COLD_CHAIN_PACKAGING_PROJECT } from "@/mocks/research-and-development/projects/medical-cold-chain-packaging";
import { MODULAR_WATER_PURIFICATION_PROJECT } from "@/mocks/research-and-development/projects/modular-water-purification";
import { PREFAB_HOUSING_PANELS_PROJECT } from "@/mocks/research-and-development/projects/prefab-housing-panels";
import { SOLAR_COLD_STORAGE_PROJECT } from "@/mocks/research-and-development/projects/solar-cold-storage";

export const MOCK_RESEARCH_PROJECTS: ResearchProject[] = [
  SOLAR_COLD_STORAGE_PROJECT,
  MODULAR_WATER_PURIFICATION_PROJECT,
  AGRICULTURAL_DRONE_KITS_PROJECT,
  PREFAB_HOUSING_PANELS_PROJECT,
  E_WASTE_RECYCLING_LINE_PROJECT,
  MEDICAL_COLD_CHAIN_PACKAGING_PROJECT,
];

/**
 * Flattened from the projects so role cards and project pages never drift apart.
 *
 * NOTHING RENDERS THIS ANY MORE — every open-role surface reads `GET /open-roles`, whose
 * rows carry their project's slug, name, stage, cover and resolved currency. It stays
 * only because `ResearchProject.openRoles` still exists on the phase-2 detail shape; the
 * export goes when that does.
 */
export const MOCK_OPEN_ROLES: OpenRole[] = MOCK_RESEARCH_PROJECTS.flatMap(
  (project) => project.openRoles,
);
