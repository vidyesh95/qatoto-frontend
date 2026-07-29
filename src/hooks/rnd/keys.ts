"use client";

// TRANSPORT: client-query — the React Query key factory for the whole R&D domain.
//
// ONE FILE, so invalidation cannot drift. The failure mode this prevents is specific: a
// mutation invalidates `["rnd", "claims", slug]` while the query registered
// `["rnd-claims", slug]`, nothing refetches, and the UI keeps showing the pre-mutation
// number — which on this surface means showing a member an equity split that no longer
// exists. Mirrors `productKeys` in `src/hooks/products.ts`, the repo's precedent.
//
// Every key starts with the literal `"rnd"` so `invalidateQueries({ queryKey: rndKeys.all })`
// clears the domain and nothing else.

/** Filters that change a list's identity and therefore its cache entry. */
export interface ClaimListFilter {
  readonly status?: string | undefined;
  readonly memberUserId?: string | undefined;
  readonly page?: number | undefined;
}

export const rndKeys = {
  all: ["rnd"] as const,

  // --- Projects, team, roles -------------------------------------------------
  project: (projectSlug: string) => ["rnd", "project", projectSlug] as const,
  projectRoles: (projectSlug: string) => ["rnd", "project", projectSlug, "roles"] as const,
  projectTeam: (projectSlug: string) => ["rnd", "project", projectSlug, "team"] as const,
  myApplications: (status: string | undefined) => ["rnd", "applications", "mine", status] as const,
  myInvites: (status: string | undefined) => ["rnd", "invites", "mine", status] as const,

  // --- Proof of Effort -------------------------------------------------------
  proofOfEffort: (projectSlug: string) => ["rnd", "poe", projectSlug] as const,
  equity: (projectSlug: string) => ["rnd", "poe", projectSlug, "equity"] as const,
  equitySnapshots: (projectSlug: string) => ["rnd", "poe", projectSlug, "snapshots"] as const,
  sliceLedger: (projectSlug: string, page: number) =>
    ["rnd", "poe", projectSlug, "ledger", page] as const,
  claims: (projectSlug: string, filter: ClaimListFilter) =>
    ["rnd", "poe", projectSlug, "claims", filter.status, filter.memberUserId, filter.page] as const,
  claim: (projectSlug: string, claimId: string) =>
    ["rnd", "poe", projectSlug, "claim", claimId] as const,
  memberRate: (projectSlug: string, memberUserId: string) =>
    ["rnd", "poe", projectSlug, "rate", memberUserId] as const,
  receipts: (projectSlug: string) => ["rnd", "poe", projectSlug, "receipts"] as const,
  allocationProposals: (projectSlug: string, status: string | undefined) =>
    ["rnd", "poe", projectSlug, "proposals", status] as const,
  disputes: (projectSlug: string, status: string | undefined) =>
    ["rnd", "poe", projectSlug, "disputes", status] as const,
  dispute: (projectSlug: string, disputeId: string) =>
    ["rnd", "poe", projectSlug, "dispute", disputeId] as const,
  integrations: (projectSlug: string) => ["rnd", "poe", projectSlug, "integrations"] as const,
  optimizationSuggestions: (projectSlug: string) =>
    ["rnd", "poe", projectSlug, "optimization"] as const,
  auditTrail: (projectSlug: string, fromSequence: number | undefined) =>
    ["rnd", "poe", projectSlug, "audit", fromSequence] as const,
  pieBake: (projectSlug: string) => ["rnd", "poe", projectSlug, "pie-bake"] as const,

  // --- Compensation ----------------------------------------------------------
  compensationAgreements: (projectSlug: string, memberId: string | undefined) =>
    ["rnd", "compensation", projectSlug, "agreements", memberId] as const,
  compensationPeriods: (projectSlug: string, status: string | undefined, page: number) =>
    ["rnd", "compensation", projectSlug, "periods", status, page] as const,
  compensationPeriod: (projectSlug: string, periodId: string) =>
    ["rnd", "compensation", projectSlug, "period", periodId] as const,
  projectCompensation: (projectSlug: string) =>
    ["rnd", "compensation", projectSlug, "summary"] as const,

  // --- Funding ---------------------------------------------------------------
  fundingRounds: (projectSlug: string) => ["rnd", "funding", projectSlug, "rounds"] as const,
  fundingRound: (roundId: string) => ["rnd", "funding", "round", roundId] as const,
  pledgeOptions: (roundId: string) => ["rnd", "funding", "round", roundId, "options"] as const,
  myPledges: () => ["rnd", "funding", "pledges", "mine"] as const,
  milestones: (projectSlug: string) => ["rnd", "funding", projectSlug, "milestones"] as const,

  // --- Workshop --------------------------------------------------------------
  workshop: (projectSlug: string) => ["rnd", "workshop", projectSlug] as const,
  workshopChat: (projectSlug: string) => ["rnd", "workshop", projectSlug, "chat"] as const,
  projectDailyLogs: (projectSlug: string) =>
    ["rnd", "workshop", projectSlug, "daily-logs"] as const,

  // --- Discovery -------------------------------------------------------------
  myTalentProfile: () => ["rnd", "talent", "me"] as const,
  talentProfile: (handleOrUserId: string) => ["rnd", "talent", handleOrUserId] as const,
} as const;
