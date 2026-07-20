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

export type TalentAvailability = "open-to-work" | "open-to-offers" | "unavailable";

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
