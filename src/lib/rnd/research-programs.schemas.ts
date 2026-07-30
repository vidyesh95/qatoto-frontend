import { z } from "zod";

import { CompensationKindSchema, PaginationMetaSchema } from "@/lib/rnd/shared.schemas";

// TRANSPORT: props-only — pure schemas. No fetching here; `research-programs.api.ts` owns that.
//
// The §10 research-program wire contract (backend §10, §11f).
//
// EVERY VALUE HERE WAS READ OFF THE BACKEND — `src/db/schema.ts`'s pgEnums and the service
// view interfaces beside them — not off the design doc, which drifts. When a value below
// looks wrong, re-read the pgEnum.
//
// Every object schema ends `.strip()` so a backend minor release that adds a field is a
// no-op here rather than a parse failure (CLAUDE.md Pattern 2).
//
// WHAT CHANGED FROM THE MOCK THIS REPLACES, because the differences are the point:
//
//   `canvasPosition: { leftPercent, topPercent }`  → GONE. Layout is the client's job now;
//       the wire carries `parentBranchId` + `siblingOrder` and `branch-tree-layout.ts` runs a
//       tidy layout from them. `pinnedLeftPermille` / `pinnedTopPermille` survive as a curator
//       override, in integer per-mille, normally null.
//
//   `reactionCountLabel: "418"` · `likeCountLabel: "482"`  → INTEGERS. The thousands separator
//       is a locale decision, made in `format.ts`.
//
//   `postedAtLabel: "4 hours ago"`  → an ISO-8601 instant, rendered with
//       `Intl.RelativeTimeFormat`.
//
//   `marketPotentialLabel: "$12B est. market"`  → `estimatedMarketSizeInCents`, an integer count
//       of cents. The COLUMN is a bigint because `1200000000000` is 560× the int4 ceiling, but it
//       arrives as a JSON number: 12 billion cents is far inside `Number.MAX_SAFE_INTEGER`, so
//       there is nothing to lose. It goes OUT as a decimal string on the write, which is the
//       convention every money body in this codebase follows.
//
//   `readinessLabel: "Monetizable in 2–4 yrs"`  → `readinessMinMonths` + `readinessMaxMonths`,
//       so the rail sorts.
//
//   `effortLabel`  → SPLIT. It held "312 hrs logged" on some rows and "Funding tranche 2 of 4"
//       on others — one field, two meanings. Now `totalEffortMinutes` and
//       `fundingTrancheIndex` / `fundingTrancheTotal`.
//
//   The four hero stats  → a snapshot with its own `asOf`, and NO money tile. The mock's
//       "$4.2M compensation pool escrowed" cannot be served: escrow left the backend and no
//       program-scoped money rail exists. The fourth tile is hours logged.
//
//   `ImmortalContributorRole` and `ImmortalPaperCategory` were kebab-case unions living only
//       in the frontend. Roles are now a `snake_case` pgEnum; categories are a TABLE, so a
//       paper carries a `categoryId` and the label arrives joined.

// --- Enum tuples (backend `src/db/schema.ts`) --------------------------------------------

export const RESEARCH_PROGRAM_STATUSES = ["pending", "published", "rejected", "archived"] as const;
export const ResearchProgramStatusSchema = z.enum(RESEARCH_PROGRAM_STATUSES);
export type ResearchProgramStatus = z.infer<typeof ResearchProgramStatusSchema>;

/**
 * DERIVED by the backend's nightly `recompute-branch-signals`, never submitted.
 *
 * `missing` = a research gap nobody is working on. `contested` = two or more branches asking a
 * near-identical question, i.e. duplicated effort. Those two claims are the whole editorial
 * point of the branch map, which is why no create or update schema in this file carries the
 * field — a contributor able to set it would make the map worthless.
 */
export const RESEARCH_BRANCH_STATUSES = ["active", "emerging", "contested", "missing"] as const;
export const ResearchBranchStatusSchema = z.enum(RESEARCH_BRANCH_STATUSES);
export type ResearchBranchStatus = z.infer<typeof ResearchBranchStatusSchema>;

/**
 * `snake_case`, because these are Postgres pgEnum labels sent verbatim in both directions.
 *
 * The mock had `"founder-director"` and `"venture-capitalist"`. Do NOT "correct" these back to
 * kebab-case: `z.enum([...]).safeParse("founder-director")` fails, and `?role=founder-director`
 * is a 422 from the backend's `.strict()` query schema.
 */
export const RESEARCH_PARTICIPANT_ROLES = [
  "researcher",
  "founder_director",
  "venture_capitalist",
  "supplier",
  "supporter",
] as const;
export const ResearchParticipantRoleSchema = z.enum(RESEARCH_PARTICIPANT_ROLES);
export type ResearchParticipantRole = z.infer<typeof ResearchParticipantRoleSchema>;

export const RESEARCH_PAPER_MODERATION_STATUSES = [
  "queued",
  "approved",
  "rejected",
  "needs_changes",
] as const;
export const ResearchPaperModerationStatusSchema = z.enum(RESEARCH_PAPER_MODERATION_STATUSES);
export type ResearchPaperModerationStatus = z.infer<typeof ResearchPaperModerationStatusSchema>;

/** The two discussion tracks. A reply inherits its parent's, so a thread cannot span both. */
export const RESEARCH_POST_TRACKS = ["informal_paper", "idea"] as const;
export const ResearchPostTrackSchema = z.enum(RESEARCH_POST_TRACKS);
export type ResearchPostTrack = z.infer<typeof ResearchPostTrackSchema>;

export const CONTENT_REPORT_REASONS = [
  "spam",
  "plagiarism",
  "misinformation",
  "harassment",
  "off_topic",
  "other",
] as const;
export const ContentReportReasonSchema = z.enum(CONTENT_REPORT_REASONS);
export type ContentReportReason = z.infer<typeof ContentReportReasonSchema>;

export const CONTENT_REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;
export const ContentReportStatusSchema = z.enum(CONTENT_REPORT_STATUSES);

export const RESEARCH_CONTRIBUTION_KINDS = [
  "cash_commitment",
  "material",
  "data",
  "equipment",
  "expertise",
] as const;
export const ResearchContributionKindSchema = z.enum(RESEARCH_CONTRIBUTION_KINDS);
export type ResearchContributionKind = z.infer<typeof ResearchContributionKindSchema>;

export const RESEARCH_MODERATION_ACTION_KINDS = [
  "program_published",
  "program_rejected",
  "paper_approved",
  "paper_rejected",
  "paper_needs_changes",
  "post_hidden",
  "post_restored",
  "report_dismissed",
] as const;
export const ResearchModerationActionKindSchema = z.enum(RESEARCH_MODERATION_ACTION_KINDS);
export type ResearchModerationActionKind = z.infer<typeof ResearchModerationActionKindSchema>;

// --- Shared shapes -----------------------------------------------------------------------

/**
 * Who wrote a thing, as they are NOW — joined from `user`, never copied onto the content row.
 *
 * `name` is already `"Former contributor"` when the account is gone, because the FKs are
 * `set null` and a real row can genuinely have no author. `locationLabel` is a SELF-SET CLAIM
 * ("Pune, India"): render it as the author's own statement about themselves, and never branch
 * on it.
 */
export const ProgramAuthorSchema = z
  .object({
    userId: z.string().nullable(),
    name: z.string(),
    handle: z.string().nullable(),
    avatarImageUrl: z.string().nullable(),
    locationLabel: z.string().nullable(),
  })
  .strip();
export type ProgramAuthor = z.infer<typeof ProgramAuthorSchema>;

// --- Programs ----------------------------------------------------------------------------

export const ResearchProgramSummarySchema = z
  .object({
    programId: z.string(),
    slug: z.string(),
    title: z.string(),
    tagline: z.string(),
    status: ResearchProgramStatusSchema,
    branchCount: z.number(),
    participantCount: z.number(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type ResearchProgramSummary = z.infer<typeof ResearchProgramSummarySchema>;

export const ResearchProgramDetailSchema = ResearchProgramSummarySchema.extend({
  missionStatement: z.string(),
  createdByUserId: z.string().nullable(),
  /** Withheld from anyone who is not the creator or staff — a rejection reason is private. */
  reviewerNote: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  isViewerCreator: z.boolean(),
  isViewerParticipant: z.boolean(),
}).strip();
export type ResearchProgramDetail = z.infer<typeof ResearchProgramDetailSchema>;

/**
 * The four hero tiles.
 *
 * `GET …/stats` answers **404 when the nightly job has never run**, so the api wrapper's
 * failure branch is a real state to render ("not counted yet"), NOT an error. Four zeroes
 * would read as "this program has nobody and nothing", which is a different claim.
 *
 * There is no money field. See the header note.
 */
export const ResearchProgramStatsSchema = z
  .object({
    asOf: z.string(),
    participantCount: z.number(),
    paperCount: z.number(),
    branchCount: z.number(),
    postCount: z.number(),
    /** Branches at `status: "missing"` — the research gaps this surface exists to name. */
    openGapCount: z.number(),
    overlapFlagCount: z.number(),
    totalEffortMinutes: z.number(),
  })
  .strip();
export type ResearchProgramStats = z.infer<typeof ResearchProgramStatsSchema>;

// --- Branches ----------------------------------------------------------------------------

export const ResearchBranchSchema = z
  .object({
    branchId: z.string(),
    parentBranchId: z.string().nullable(),
    title: z.string(),
    summary: z.string(),
    /** Materialized `/`-joined ancestor ids. Depth-first order when sorted; do not parse it. */
    ancestorPath: z.string(),
    siblingOrder: z.number(),
    depth: z.number(),
    status: ResearchBranchStatusSchema,
    overlappingGroupCount: z.number(),
    contributorCount: z.number(),
    approvedPaperCount: z.number(),
    /**
     * THREADS filed against this branch, and the newest few titles.
     *
     * `depth = 0` on the backend, so this counts threads rather than posts — it has to agree with
     * the title list beside it. Deliberately a different definition from the program-level
     * `postCount` stat tile, which does count replies.
     *
     * An `idea` has no title, so a list entry may be a truncated body.
     */
    discussionCount: z.number(),
    recentThreadTitles: z.array(z.string()),
    /** Curator override, integer per-mille, normally null. Both or neither. */
    pinnedLeftPermille: z.number().nullable(),
    pinnedTopPermille: z.number().nullable(),
    isClaimedByViewer: z.boolean(),
    createdAt: z.string(),
  })
  .strip();
export type ResearchBranch = z.infer<typeof ResearchBranchSchema>;

// --- Paper categories --------------------------------------------------------------------

export const ResearchPaperCategorySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    /** `displayLabel`, not `label` — the backend applies the alias at its projection boundary. */
    displayLabel: z.string(),
    status: z.enum(["approved", "pending", "rejected"]),
  })
  .strip();
export type ResearchPaperCategory = z.infer<typeof ResearchPaperCategorySchema>;

// --- Papers ------------------------------------------------------------------------------

export const ResearchPaperSchema = z
  .object({
    paperId: z.string(),
    title: z.string(),
    categoryId: z.string(),
    categorySlug: z.string(),
    categoryDisplayLabel: z.string(),
    branchId: z.string().nullable(),
    doi: z.string().nullable(),
    /** The uploader's CLAIMED affiliation. Never verified — render as attribution. */
    authorAffiliation: z.string().nullable(),
    abstractText: z.string().nullable(),
    uploader: ProgramAuthorSchema,
    moderationStatus: ResearchPaperModerationStatusSchema,
    flagReasons: z.array(z.string()),
    reviewerNote: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    /** Bytes. "2.4 MB" is a locale decision — `formatByteSize` in `format.ts`. */
    fileByteSize: z.number().nullable(),
    hasFile: z.boolean(),
    isUploadedByViewer: z.boolean(),
    createdAt: z.string(),
  })
  .strip();
export type ResearchPaper = z.infer<typeof ResearchPaperSchema>;

/** What `GET …/papers/:paperId/download` returns. A short-lived presigned URL, not a redirect. */
export const PaperDownloadLinkSchema = z
  .object({ downloadUrl: z.string(), expiresInSeconds: z.number() })
  .strip();
export type PaperDownloadLink = z.infer<typeof PaperDownloadLinkSchema>;

// --- Posts -------------------------------------------------------------------------------

/**
 * One post, reply, or informal paper — the backend serves all three from one table.
 *
 * `replies` is present on top-level rows and carries up to three inline; the rest come from
 * `GET …/posts/:postId/replies`. A reply's own `replies` is always empty (depth is capped at 1).
 *
 * A HIDDEN post arrives with `isHidden: true`, a null title and placeholder body text — the
 * moderated words never travel, so there is nothing for a DevTools panel to reveal.
 *
 * `z.lazy` because the type is self-referential; the recursion is bounded by the depth cap.
 */
export interface ResearchPost {
  readonly postId: string;
  readonly parentPostId: string | null;
  readonly track: ResearchPostTrack;
  readonly depth: number;
  /** Which branch this thread is about, or null for a program-wide one. */
  readonly branchId: string | null;
  readonly title: string | null;
  readonly bodyText: string;
  readonly author: ProgramAuthor;
  readonly reactionCount: number;
  readonly replyCount: number;
  readonly isReactedByViewer: boolean;
  readonly isAuthoredByViewer: boolean;
  readonly isHidden: boolean;
  readonly createdAt: string;
  readonly replies: readonly ResearchPost[];
}

export const ResearchPostSchema: z.ZodType<ResearchPost> = z.lazy(() =>
  z
    .object({
      postId: z.string(),
      parentPostId: z.string().nullable(),
      track: ResearchPostTrackSchema,
      depth: z.number(),
      branchId: z.string().nullable(),
      title: z.string().nullable(),
      bodyText: z.string(),
      author: ProgramAuthorSchema,
      reactionCount: z.number(),
      replyCount: z.number(),
      isReactedByViewer: z.boolean(),
      isAuthoredByViewer: z.boolean(),
      isHidden: z.boolean(),
      createdAt: z.string(),
      replies: z.array(ResearchPostSchema),
    })
    .strip(),
);

/** What a reaction write returns: the server's count, so the client renders a given number. */
export const ReactionResultSchema = z.object({ reactionCount: z.number() }).strip();
export type ReactionResult = z.infer<typeof ReactionResultSchema>;

// --- Product opportunities ---------------------------------------------------------------

export const ResearchOpportunitySchema = z
  .object({
    opportunityId: z.string(),
    productName: z.string(),
    productDescription: z.string(),
    derivedFromBranchId: z.string(),
    /** Joined, so the rail can name the research without a second read. */
    derivedFromBranchTitle: z.string(),
    /**
     * A NUMBER on the wire despite being a bigint column, because the backend's view returns
     * it as one and the values in play (12 billion cents) are well inside `Number.MAX_SAFE_INTEGER`.
     * Formatted by `formatCompactMoney` — never rendered raw.
     */
    estimatedMarketSizeInCents: z.number(),
    readinessMinMonths: z.number(),
    readinessMaxMonths: z.number(),
    createdAt: z.string(),
  })
  .strip();
export type ResearchOpportunity = z.infer<typeof ResearchOpportunitySchema>;

// --- Participants ------------------------------------------------------------------------

export const ResearchParticipantSchema = z
  .object({
    participantId: z.string(),
    participant: ProgramAuthorSchema,
    role: ResearchParticipantRoleSchema,
    compensationPreference: CompensationKindSchema,
    contributionSummary: z.string().nullable(),
    /** A SUM over effort logs, never a stored column. Minutes; hours are a locale decision. */
    totalEffortMinutes: z.number(),
    fundingTrancheIndex: z.number().nullable(),
    fundingTrancheTotal: z.number().nullable(),
    isViewer: z.boolean(),
    joinedAt: z.string(),
  })
  .strip();
export type ResearchParticipant = z.infer<typeof ResearchParticipantSchema>;

// --- Moderation --------------------------------------------------------------------------

export const ContentReportSchema = z
  .object({
    reportId: z.string(),
    targetKind: z.enum(["paper", "post"]),
    paperId: z.string().nullable(),
    postId: z.string().nullable(),
    reason: ContentReportReasonSchema,
    detailText: z.string().nullable(),
    reporterName: z.string().nullable(),
    status: ContentReportStatusSchema,
    createdAt: z.string(),
  })
  .strip();
export type ContentReport = z.infer<typeof ContentReportSchema>;

/**
 * One recorded decision — this domain's queryable view of the platform audit chain.
 *
 * `auditEntryId` links to the tamper-evident row. `moderatorRoleSnapshot` is the role AT THE
 * TIME, because roles are revocable and a join would lie later.
 */
export const ModerationActionSchema = z
  .object({
    actionId: z.string(),
    actionKind: ResearchModerationActionKindSchema,
    paperId: z.string().nullable(),
    postId: z.string().nullable(),
    reportId: z.string().nullable(),
    moderatorName: z.string(),
    moderatorRoleSnapshot: z.string(),
    reasonNote: z.string(),
    auditEntryId: z.string(),
    createdAt: z.string(),
  })
  .strip();
export type ModerationAction = z.infer<typeof ModerationActionSchema>;

// --- Write results -----------------------------------------------------------------------
//
// Each write returns the id it created, and nothing else. Re-reading is the caller's job, so
// there is no chance of a stale composite drifting from what a subsequent GET would say.

export const ProgramIdResultSchema = z.object({ programId: z.string() }).strip();
export const BranchIdResultSchema = z.object({ branchId: z.string() }).strip();
export const PaperIdResultSchema = z.object({ paperId: z.string() }).strip();
export const PostIdResultSchema = z.object({ postId: z.string() }).strip();
export const ReportIdResultSchema = z.object({ reportId: z.string() }).strip();
export const ParticipantIdResultSchema = z.object({ participantId: z.string() }).strip();
export const OpportunityIdResultSchema = z.object({ opportunityId: z.string() }).strip();
export const BranchClaimResultSchema = z.object({ claimed: z.literal(true) }).strip();
export const BranchReleaseResultSchema = z.object({ released: z.literal(true) }).strip();
export const PaperFileResultSchema = z.object({ fileByteSize: z.number() }).strip();
export const DeletedResultSchema = z.object({ deleted: z.literal(true) }).strip();

/**
 * The two writes that carry a body-level idempotency key answer 200 on a REPLAY and 201 on a
 * genuine create, and say which through `wasReplay`. Surface it: "already recorded" and
 * "recorded" are different things to tell someone.
 */
export const EffortLogResultSchema = z
  .object({ effortLogId: z.string(), wasReplay: z.boolean() })
  .strip();
export type EffortLogResult = z.infer<typeof EffortLogResultSchema>;

export const ContributionResultSchema = z
  .object({ contributionId: z.string(), wasReplay: z.boolean() })
  .strip();
export type ContributionResult = z.infer<typeof ContributionResultSchema>;

// --- Paged envelopes ---------------------------------------------------------------------

/** Offset-paginated lists carry `pagination` as a SIBLING of `data`. */
export const ProgramPageSchema = z
  .object({
    rows: z.array(ResearchProgramSummarySchema),
    pagination: PaginationMetaSchema,
  })
  .strip();

export const ParticipantPageSchema = z
  .object({
    rows: z.array(ResearchParticipantSchema),
    pagination: PaginationMetaSchema,
  })
  .strip();
