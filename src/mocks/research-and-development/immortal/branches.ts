// Mock Project Immortal research branches (the flowchart nodes). Split out of
// project-immortal-mocks.ts only for file size — same convention: fixtures,
// no getters.

import type { ImmortalResearchBranch } from "@/types/research-and-development";
import { PROJECT_IMMORTAL_ROOT_BRANCH_ID } from "./labels";

// Flowchart nodes. leftPercent is authored by depth (root ~12, depth-1 ~36,
// depth-2 ~68) so the tree reads left to right; topPercent spaces siblings.
// Nodes are center-anchored and up to 144px wide (max-w-36) on a 720px-wide
// canvas, so keep leftPercent >= 10 and topPercent within 12–90, or the node
// clips against the edge of the scroll container.
export const MOCK_IMMORTAL_RESEARCH_BRANCHES: ImmortalResearchBranch[] = [
  {
    id: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    parentBranchId: null,
    title: "Hallmarks of Aging",
    summary:
      "The shared trunk of the program: the cellular and molecular processes that drive aging, and which of them are reversible.",
    status: "active",
    contributorCount: 412,
    discussionCount: 138,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 12, topPercent: 50 },
    recentThreadTitles: [
      "Which hallmark should Qatoto fund first?",
      "Are the twelve hallmarks still the right frame in 2026?",
    ],
  },
  {
    id: "branch-cellular-reprogramming",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "Cellular Reprogramming",
    summary:
      "Partial Yamanaka-factor reprogramming to reset epigenetic age without losing cell identity.",
    status: "active",
    contributorCount: 186,
    discussionCount: 74,
    overlappingGroupCount: 3,
    canvasPosition: { leftPercent: 36, topPercent: 16 },
    recentThreadTitles: [
      "OSK vs OSKM: what the mouse data actually shows",
      "Dosing windows that avoid teratoma risk",
      "Can we pool the three overlapping reprogramming teams?",
    ],
  },
  {
    id: "branch-senescent-cell-clearance",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "Senescent-Cell Clearance",
    summary:
      "Senolytics and senomorphics that clear or quiet the zombie cells driving chronic inflammation.",
    status: "active",
    contributorCount: 154,
    discussionCount: 61,
    overlappingGroupCount: 2,
    canvasPosition: { leftPercent: 36, topPercent: 38 },
    recentThreadTitles: [
      "Dasatinib + quercetin: replication status across labs",
      "Do we have a clean senescence biomarker yet?",
    ],
  },
  {
    id: "branch-organ-replacement",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "Organ Replacement",
    summary:
      "Growing, printing, and preserving replacement organs so failure of one system stops being fatal.",
    status: "emerging",
    contributorCount: 97,
    discussionCount: 42,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 36, topPercent: 62 },
    recentThreadTitles: [
      "Decellularized scaffolds vs full bioprinting",
      "Why cold-chain logistics is the real bottleneck",
    ],
  },
  {
    id: "branch-ai-drug-discovery",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "AI Drug Discovery",
    summary:
      "Models that screen geroprotective compounds and predict which combinations extend healthspan.",
    status: "active",
    contributorCount: 231,
    discussionCount: 89,
    overlappingGroupCount: 4,
    canvasPosition: { leftPercent: 36, topPercent: 84 },
    recentThreadTitles: [
      "Open-weights model for compound screening?",
      "Four groups are training on the same assay set — merge?",
    ],
  },
  {
    id: "branch-reprogramming-safety-gap",
    parentBranchId: "branch-cellular-reprogramming",
    title: "Long-term reprogramming safety data",
    summary:
      "Nobody has published multi-year safety follow-up on partial reprogramming in large mammals. Qatoto flagged this as a blocking gap.",
    status: "missing",
    contributorCount: 0,
    discussionCount: 18,
    overlappingGroupCount: 0,
    canvasPosition: { leftPercent: 68, topPercent: 12 },
    recentThreadTitles: [
      "Who has a primate colony willing to run a 5-year arm?",
      "What would a minimum viable safety protocol look like?",
    ],
  },
  {
    id: "branch-epigenetic-clocks",
    parentBranchId: "branch-cellular-reprogramming",
    title: "Epigenetic Clocks",
    summary:
      "Methylation clocks that measure biological age — the instrument every other branch needs to prove it works.",
    status: "contested",
    contributorCount: 143,
    discussionCount: 96,
    overlappingGroupCount: 2,
    canvasPosition: { leftPercent: 68, topPercent: 24 },
    recentThreadTitles: [
      "Clocks disagree by 8 years on the same sample",
      "Is second-generation clock validation circular?",
    ],
  },
  {
    id: "branch-senolytic-trials",
    parentBranchId: "branch-senescent-cell-clearance",
    title: "Human Senolytic Trials",
    summary: "Phase I/II human trials of intermittent senolytic dosing in age-related fibrosis.",
    status: "active",
    contributorCount: 68,
    discussionCount: 33,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 68, topPercent: 40 },
    recentThreadTitles: [
      "Recruiting a 200-person cohort through Qatoto",
      "Endpoint selection: function or biomarker?",
    ],
  },
  {
    id: "branch-south-asian-biomarkers-gap",
    parentBranchId: "branch-senescent-cell-clearance",
    title: "Aging biomarkers for South-Asian cohorts",
    summary:
      "Nearly all aging biomarker panels were trained on European cohorts. Qatoto highlighted the missing data — the results may not transfer.",
    status: "missing",
    contributorCount: 0,
    discussionCount: 27,
    overlappingGroupCount: 0,
    canvasPosition: { leftPercent: 68, topPercent: 56 },
    recentThreadTitles: [
      "Which Indian and Bangladeshi cohorts already exist?",
      "Funding a 5,000-sample methylation panel",
    ],
  },
  {
    id: "branch-organ-preservation",
    parentBranchId: "branch-organ-replacement",
    title: "Organ Preservation",
    summary:
      "Vitrification and machine perfusion that stretch the viable window from hours to days.",
    status: "emerging",
    contributorCount: 54,
    discussionCount: 21,
    overlappingGroupCount: 2,
    canvasPosition: { leftPercent: 68, topPercent: 72 },
    recentThreadTitles: [
      "Ice-blocker cocktails that survive rewarming",
      "Two teams built the same perfusion rig — share the BOM?",
    ],
  },
  {
    id: "branch-compound-screening",
    parentBranchId: "branch-ai-drug-discovery",
    title: "Geroprotector Screening",
    summary:
      "High-throughput in-silico screens ranking known compounds by predicted healthspan effect.",
    status: "active",
    contributorCount: 119,
    discussionCount: 45,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 68, topPercent: 90 },
    recentThreadTitles: [
      "Top 50 ranked compounds, open dataset",
      "Wet-lab partners wanted for hit validation",
    ],
  },
];
