// Mock Project Immortal program stats. Split out of project-immortal-mocks.ts
// only for file size — same convention: fixtures, no getters.

import type { ImmortalProgramStat } from "@/types/research-and-development";

export const MOCK_IMMORTAL_PROGRAM_STATS: ImmortalProgramStat[] = [
  { id: "stat-contributors", statValue: "2,847", statLabel: "Contributing netizens" },
  { id: "stat-papers", statValue: "312", statLabel: "Research papers" },
  { id: "stat-branches", statValue: "38", statLabel: "Research branches" },
  { id: "stat-compensation-pool", statValue: "$4.2M", statLabel: "Compensation pool escrowed" },
];
