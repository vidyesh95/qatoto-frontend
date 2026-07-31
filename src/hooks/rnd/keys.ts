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
/**
 * NO PAGE OR CURSOR HERE. These lists are keyset and accumulate their pages under ONE key
 * through `useInfiniteQuery` — putting the page token in the key would give every page its
 * own cache entry and defeat the accumulation. Only the SERVER FILTERS belong in a key,
 * because changing one of those is a different list.
 */
export interface ClaimListFilter {
  readonly status?: string | undefined;
  readonly memberUserId?: string | undefined;
}

export const rndKeys = {
  all: ["rnd"] as const,

  // --- Projects, team, roles -------------------------------------------------
  project: (projectSlug: string) => ["rnd", "project", projectSlug] as const,
  projectRoles: (projectSlug: string) => ["rnd", "project", projectSlug, "roles"] as const,
  projectTeam: (projectSlug: string) => ["rnd", "project", projectSlug, "team"] as const,
  myApplications: (status: string | undefined) => ["rnd", "applications", "mine", status] as const,
  myInvites: (status: string | undefined) => ["rnd", "invites", "mine", status] as const,
  /** The FOUNDER's inbox, distinct from `myApplications` — different rows, different actor. */
  projectApplications: (projectSlug: string, status: string | undefined) =>
    ["rnd", "project", projectSlug, "applications", status] as const,
  projectInvites: (projectSlug: string) => ["rnd", "project", projectSlug, "invites"] as const,
  /** Keyed by status: the pickers read `approved`, the moderation queue reads `pending`. */
  researchCategoriesRoot: () => ["rnd", "research-categories"] as const,
  researchCategories: (status: string | undefined) =>
    ["rnd", "research-categories", status] as const,

  // --- Proof of Effort -------------------------------------------------------
  proofOfEffort: (projectSlug: string) => ["rnd", "poe", projectSlug] as const,
  equity: (projectSlug: string) => ["rnd", "poe", projectSlug, "equity"] as const,
  equitySnapshots: (projectSlug: string) => ["rnd", "poe", projectSlug, "snapshots"] as const,
  sliceLedger: (projectSlug: string) => ["rnd", "poe", projectSlug, "ledger"] as const,
  claims: (projectSlug: string, filter: ClaimListFilter) =>
    ["rnd", "poe", projectSlug, "claims", filter.status, filter.memberUserId] as const,
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
  auditTrail: (projectSlug: string) => ["rnd", "poe", projectSlug, "audit"] as const,
  pieBake: (projectSlug: string) => ["rnd", "poe", projectSlug, "pie-bake"] as const,

  // --- Compensation ----------------------------------------------------------
  compensationAgreements: (projectSlug: string, memberId: string | undefined) =>
    ["rnd", "compensation", projectSlug, "agreements", memberId] as const,
  compensationPeriods: (projectSlug: string, status: string | undefined) =>
    ["rnd", "compensation", projectSlug, "periods", status] as const,
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
  /**
   * The CROSS-PROJECT feed. No slug in the key, deliberately: the WHERE clause is
   * `projectId IN (caller's active memberships)`, so the read is scoped by the session
   * rather than by anything the key could name.
   */
  dailyLogFeed: () => ["rnd", "daily-log-feed"] as const,

  // --- Discovery -------------------------------------------------------------
  myTalentProfile: () => ["rnd", "talent", "me"] as const,
  talentProfile: (handleOrUserId: string) => ["rnd", "talent", handleOrUserId] as const,
  myProblemReports: (clusteringStatus: string | undefined) =>
    ["rnd", "problem-reports", "mine", clusteringStatus] as const,
  dailyLog: (projectSlug: string, logId: string) =>
    ["rnd", "workshop", projectSlug, "daily-log", logId] as const,

  // --- §10 research programs -------------------------------------------------
  //
  // Keyed on the SLUG, not the id: every route in the domain is addressed by slug, so a key
  // built from an id would need a lookup the page does not otherwise perform.
  //
  // No page or cursor appears in any key below — keyset pages accumulate under one key through
  // `useKeysetList`, which is what lets "load more" append rather than replace.
  researchPrograms: (searchText: string | undefined) =>
    ["rnd", "programs", "index", searchText] as const,
  ownResearchPrograms: () => ["rnd", "programs", "mine"] as const,
  programReviewQueue: () => ["rnd", "programs", "review-queue"] as const,
  researchProgram: (programSlug: string) => ["rnd", "programs", programSlug] as const,
  /**
   * The stat tiles. A separate key from the program itself because they are a SNAPSHOT with its
   * own `asOf` — invalidating the program detail after a write must not imply the nightly
   * counts moved.
   */
  programStats: (programSlug: string) => ["rnd", "programs", programSlug, "stats"] as const,
  programBranches: (programSlug: string) => ["rnd", "programs", programSlug, "branches"] as const,
  programPapers: (programSlug: string, filter: ProgramPaperFilter) =>
    [
      "rnd",
      "programs",
      programSlug,
      "papers",
      filter.categoryId,
      filter.branchId,
      filter.moderationStatus,
    ] as const,
  programPosts: (programSlug: string, track: string) =>
    ["rnd", "programs", programSlug, "posts", track] as const,
  programPostReplies: (programSlug: string, postId: string) =>
    ["rnd", "programs", programSlug, "posts", postId, "replies"] as const,
  programContributors: (programSlug: string, role: string | undefined) =>
    ["rnd", "programs", programSlug, "contributors", role] as const,
  programOpportunities: (programSlug: string) =>
    ["rnd", "programs", programSlug, "product-opportunities"] as const,
  programModerationQueue: (programSlug: string) =>
    ["rnd", "programs", programSlug, "moderation", "queue"] as const,
  programModerationActions: (programSlug: string) =>
    ["rnd", "programs", programSlug, "moderation", "actions"] as const,
  /**
   * Program-independent: one taxonomy the whole platform shares. Keyed BY STATUS, because
   * the picker reads `approved` and the moderation queue reads `pending` — one key for both
   * would make a verdict look like it had changed a list it did not.
   *
   * `paperCategoriesRoot` is the invalidation target that covers every status at once.
   */
  paperCategoriesRoot: () => ["rnd", "paper-categories"] as const,
  researchPaperCategories: (status: string | undefined) =>
    ["rnd", "paper-categories", status] as const,

  // --- Platform roles --------------------------------------------------------
  /** The caller's OWN standing. No parameter — it is never about another account. */
  ownStaffContext: () => ["rnd", "staff-context"] as const,
  platformRoleSubject: (email: string) => ["rnd", "platform-role-subject", email] as const,

  // --- Platform audit --------------------------------------------------------
  /** The staff decision log. Keyed by kind, since the page reads one slice of it. */
  platformAuditTrail: (eventKind: string | undefined) =>
    ["rnd", "platform-audit", eventKind] as const,
} as const;

/**
 * The paper-library filter, as it appears in a query key.
 *
 * Declared as an interface rather than inlined so the key factory and the island that builds the
 * filter cannot drift — the same reason `ClaimListFilter` exists above.
 */
export interface ProgramPaperFilter {
  readonly categoryId?: string | undefined;
  readonly branchId?: string | undefined;
  readonly moderationStatus?: string | undefined;
}
