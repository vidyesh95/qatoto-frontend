// Mock Project Immortal data (research branches, papers, informal posts,
// discussion, product opportunities, contributors) for the UI-building phase.
// Kept out of research-and-development-mocks.ts only for file size — same
// convention: fixtures, no getters.
//
// Split further into src/mocks/research-and-development/immortal/ by feature
// section; this file just composes and re-exports so every consumer can keep
// importing from "@/mocks/project-immortal-mocks" unchanged.

export {
  IMMORTAL_COMPENSATION_PREFERENCE_LABELS,
  IMMORTAL_CONTRIBUTOR_ROLE_LABELS,
  IMMORTAL_PAPER_CATEGORY_LABELS,
  PROJECT_IMMORTAL_ROOT_BRANCH_ID,
} from "./research-and-development/immortal/labels";
export { MOCK_IMMORTAL_PROGRAM_STATS } from "./research-and-development/immortal/program-stats";
export { MOCK_IMMORTAL_RESEARCH_BRANCHES } from "./research-and-development/immortal/branches";
export { MOCK_IMMORTAL_PRODUCT_OPPORTUNITIES } from "./research-and-development/immortal/product-opportunities";
export { MOCK_IMMORTAL_RESEARCH_PAPERS } from "./research-and-development/immortal/papers";
export { MOCK_IMMORTAL_INFORMAL_POSTS } from "./research-and-development/immortal/informal-posts";
export { MOCK_IMMORTAL_IDEAS } from "./research-and-development/immortal/ideas";
export { MOCK_IMMORTAL_CONTRIBUTORS } from "./research-and-development/immortal/contributors";
