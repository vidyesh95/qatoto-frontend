// Mock Virtual Workshop data (boards, files, chat) for the UI-building phase.
// Kept out of research-and-development-mocks.ts only for file size — same
// convention: fixtures, no getters. Every assignee/author/uploader id resolves
// to a teamMembers[].id on the matching project in that file.
//
// Each project's workshop lives in its own file under research-and-development/workshop/
// so this file stays a thin composer.

import type { ProjectWorkshop } from "@/types/research-and-development";
import { AGRICULTURAL_DRONE_KITS_WORKSHOP } from "@/mocks/research-and-development/workshop/agricultural-drone-kits";
import { E_WASTE_RECYCLING_LINE_WORKSHOP } from "@/mocks/research-and-development/workshop/e-waste-recycling-line";
import { MEDICAL_COLD_CHAIN_PACKAGING_WORKSHOP } from "@/mocks/research-and-development/workshop/medical-cold-chain-packaging";
import { MODULAR_WATER_PURIFICATION_WORKSHOP } from "@/mocks/research-and-development/workshop/modular-water-purification";
import { PREFAB_HOUSING_PANELS_WORKSHOP } from "@/mocks/research-and-development/workshop/prefab-housing-panels";
import { SOLAR_COLD_STORAGE_WORKSHOP } from "@/mocks/research-and-development/workshop/solar-cold-storage";

export const MOCK_PROJECT_WORKSHOPS: ProjectWorkshop[] = [
  SOLAR_COLD_STORAGE_WORKSHOP,
  MODULAR_WATER_PURIFICATION_WORKSHOP,
  AGRICULTURAL_DRONE_KITS_WORKSHOP,
  PREFAB_HOUSING_PANELS_WORKSHOP,
  E_WASTE_RECYCLING_LINE_WORKSHOP,
  MEDICAL_COLD_CHAIN_PACKAGING_WORKSHOP,
];
