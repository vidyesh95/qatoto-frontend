import { z } from "zod";
import {
  CompensationKindSchema,
  DiscoveryCategoryRefSchema,
  DiscoveryRegionRefSchema,
  RoleCommitmentSchema,
  TrendDirectionSchema,
} from "@/lib/rnd/shared.schemas";

// `GET /discovery/*` — problem clusters (Civic Pulse), market insights, demand
// signals, regions, skills and the talent directory.
//
// Shapes mirror the backend service views: `problem-clusters.service.ts`,
// `discovery-catalog.service.ts`, `talent-profiles.service.ts`.

// --- Problem clusters --------------------------------------------------------

export const PROBLEM_CLUSTER_STATUSES = ["active", "merged", "hidden"] as const;

/**
 * One clustered problem. A CLUSTER, not a submission — `distinctReporterCount` is a
 * COUNT(DISTINCT reporter) over identified submissions, so 342 means 342 people. The
 * gap between it and `submissionCount` is the sybil signal, which is why the two are
 * separate fields and neither is called "reportCount".
 *
 * There is NO `mapPosition`. That was a CSS offset into one specific SVG at one
 * aspect ratio; the wire carries integer microdegrees and each client projects them
 * (see `projectMicrodegreesToMapPercent` in the problem-map canvas).
 */
export const ProblemClusterSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    category: DiscoveryCategoryRefSchema,
    // LEFT JOIN — a cluster has no region until one is resolved.
    region: DiscoveryRegionRefSchema.nullable(),
    countryCode: z.string().nullable(),
    locationLabel: z.string().nullable(),
    // Degrees × 1e6, quantized for publication.
    centroidLatitudeMicrodegrees: z.number(),
    centroidLongitudeMicrodegrees: z.number(),
    distinctReporterCount: z.number(),
    submissionCount: z.number(),
    // 0..100, and NULL until the first scoring run. Never render this as 0 — that
    // publishes "no opportunity here" as a finding about the place when the only
    // finding is that no job has run.
    opportunityScorePoints: z.number().nullable(),
    scoreComputedAt: z.string().nullable(),
    firstReportedAt: z.string(),
    lastReportedAt: z.string(),
    status: z.enum(PROBLEM_CLUSTER_STATUSES),
    mergedIntoClusterId: z.string().nullable(),
  })
  .strip();
export type ProblemCluster = z.infer<typeof ProblemClusterSchema>;

export const PROBLEM_CLUSTER_SORTS = ["opportunity", "recent", "reporters"] as const;
export type ProblemClusterSort = (typeof PROBLEM_CLUSTER_SORTS)[number];

// --- Market insights ---------------------------------------------------------

export const MARKET_INSIGHT_STAT_KINDS = [
  "percent_change",
  "percent_level",
  "absolute_count",
  "multiplier",
] as const;
export const MarketInsightStatKindSchema = z.enum(MARKET_INSIGHT_STAT_KINDS);
export type MarketInsightStatKind = z.infer<typeof MarketInsightStatKindSchema>;

export const MARKET_INSIGHT_STAT_UNIT_KEYS = [
  "percent",
  "multiple",
  "people",
  "households",
  "tonnes",
  "litres",
  "hectares",
  // Dollars, not cents — deliberate, see the backend's statValueMilli note.
  "usd_dollars",
  "count",
] as const;
export const MarketInsightStatUnitKeySchema = z.enum(MARKET_INSIGHT_STAT_UNIT_KEYS);
export type MarketInsightStatUnitKey = z.infer<typeof MarketInsightStatUnitKeySchema>;

/**
 * One knowledge-hub statistic. `statValue: "+34%"` decomposed into three fields:
 * a KIND (what sort of magnitude), a VALUE in milli-units, and a UNIT.
 *
 * Milli-units — `"+34%"` is `34000`, `"250K tonnes"` is `250_000_000` — so a client
 * can render one decimal place without the server having decided how many to show.
 * Only `percent_change` may be negative.
 */
export const MarketInsightSchema = z
  .object({
    id: z.string(),
    headline: z.string(),
    summary: z.string().nullable(),
    statKind: MarketInsightStatKindSchema,
    statValueMilli: z.number(),
    statUnitKey: MarketInsightStatUnitKeySchema,
    trendDirection: TrendDirectionSchema,
    category: DiscoveryCategoryRefSchema,
    region: DiscoveryRegionRefSchema,
    // `sourceNote` split into an attribution, a citation and a date.
    sourceName: z.string(),
    sourceUrl: z.string().nullable(),
    sourcePublishedDate: z.string(),
    publishedAt: z.string(),
  })
  .strip();
export type MarketInsight = z.infer<typeof MarketInsightSchema>;

// --- Demand signals ----------------------------------------------------------

/**
 * One row of the demand leaderboard. `asOf` ships on every row because these are
 * snapshot numbers from a nightly job — a leaderboard implying live figures lies.
 */
export const DemandSignalSchema = z
  .object({
    rank: z.number(),
    category: DiscoveryCategoryRefSchema,
    region: DiscoveryRegionRefSchema,
    // 0..100.
    demandScorePoints: z.number(),
    previousDemandScorePoints: z.number().nullable(),
    trendDirection: TrendDirectionSchema,
    clusterCount: z.number(),
    distinctReporterCount: z.number(),
    relatedProjectCount: z.number(),
    openRoleCount: z.number(),
    /**
     * The store's evidence for this cell (§22): units sold and visible reviews in the window,
     * on listings the cell's ventures actually shipped.
     *
     * NOT part of `demandScorePoints`. The rank is unchanged by these; they are shown so a
     * reader can weigh "somebody actually paid" alongside "somebody reported a problem", and
     * the question of what they should be WORTH to the score is deliberately still open.
     *
     * A zero here is a real zero, not a null wearing a number: it means no completed order was
     * attributed to this cell in the window.
     */
    soldUnitCount: z.number(),
    productReviewCount: z.number(),
    asOf: z.string(),
  })
  .strip();
export type DemandSignal = z.infer<typeof DemandSignalSchema>;

// --- Regions and skills (facet vocabularies, neither paginated) --------------

export const DiscoveryRegionSchema = DiscoveryRegionRefSchema;
export type DiscoveryRegion = z.infer<typeof DiscoveryRegionSchema>;

/**
 * The canonical skill vocabulary. Chips filter by SLUG EQUALITY against this list,
 * which is what retires the old `skills.some((skill) => skill.includes(chipText))`
 * substring match — under which a "Water" chip matched "Water Polo".
 */
export const DiscoverySkillSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayLabel: z.string(),
    categoryId: z.string().nullable(),
  })
  .strip();
export type DiscoverySkill = z.infer<typeof DiscoverySkillSchema>;

// --- Talent ------------------------------------------------------------------

export const TALENT_AVAILABILITIES = ["open_to_work", "open_to_offers", "unavailable"] as const;
export const TalentAvailabilitySchema = z.enum(TALENT_AVAILABILITIES);
export type TalentAvailability = z.infer<typeof TalentAvailabilitySchema>;

/**
 * A skill on a profile. `isVerified` is JOB-WRITTEN ONLY — it means §9 recorded
 * verified effort on a project tagged with this skill. No request can set it, which
 * is the entire point of the badge.
 */
export const TalentSkillSchema = z
  .object({
    slug: z.string(),
    displayLabel: z.string(),
    isVerified: z.boolean(),
  })
  .strip();
export type TalentSkill = z.infer<typeof TalentSkillSchema>;

/**
 * What a person wants in return — a real discriminated union on `kind`, unlike the
 * open-role strand, so an equity ask carrying a salary range is unrepresentable.
 * Note `equity` carries NO currency: basis points are dimensionless.
 */
export const TalentCompensationAskSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("salary"),
      salaryMinInCentsPerMonth: z.number(),
      salaryMaxInCentsPerMonth: z.number().nullable(),
      currency: z.string(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("one_time"),
      oneTimeMinInCents: z.number(),
      oneTimeMaxInCents: z.number().nullable(),
      currency: z.string(),
    })
    .strip(),
  z
    .object({
      kind: z.literal("equity"),
      equityBasisPointsMin: z.number(),
      equityBasisPointsMax: z.number().nullable(),
    })
    .strip(),
]);
export type TalentCompensationAsk = z.infer<typeof TalentCompensationAskSchema>;

/**
 * One person in the directory. `GET /discovery/talent` is the only §6 read that
 * returns other people's personal data, so it is `requireAuth` — a signed-out
 * visitor gets 401 and the page must render its signed-out branch with an EMPTY
 * list, never a fabricated one.
 *
 * `verifiedEffortMinutes` and `projectsCompletedCount` are NULL until §9's jobs have
 * run. Null is not zero: zero asserts "this person has done nothing".
 */
export const TalentProfileSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    handle: z.string().nullable(),
    avatarImageUrl: z.string().nullable(),
    headlineRole: z.string(),
    bio: z.string().nullable(),
    availability: TalentAvailabilitySchema,
    commitment: RoleCommitmentSchema,
    locationLabel: z.string().nullable(),
    region: DiscoveryRegionRefSchema.nullable(),
    skills: TalentSkillSchema.array(),
    compensationAsks: TalentCompensationAskSchema.array(),
    verifiedEffortMinutes: z.number().nullable(),
    projectsCompletedCount: z.number().nullable(),
    projectionComputedAt: z.string().nullable(),
    profileUpdatedAt: z.string(),
  })
  .strip();
export type TalentProfile = z.infer<typeof TalentProfileSchema>;

/**
 * The caller's OWN profile — `GET`/`PUT /discovery/talent/me`.
 *
 * `completeness` IS A HINT FOR THE PUBLISH BUTTON, NEVER THE CHECK.
 * `publishTalentProfile` re-derives it server-side at request time (§0), so a client that
 * ignored `isPublishable` gets a refusal rather than a published profile. `missing` names
 * the fields, which is what lets the button say WHY it is disabled instead of just being
 * grey.
 */
export const TalentProfileMeSchema = TalentProfileSchema.extend({
  isPublished: z.boolean(),
  publishedAt: z.string().nullable(),
  completeness: z
    .object({
      isPublishable: z.boolean(),
      missing: z.string().array(),
    })
    .strip(),
}).strip();
export type TalentProfileMe = z.infer<typeof TalentProfileMeSchema>;

/**
 * What the caller SENDS on `PUT /discovery/talent/me`.
 *
 * A DIFFERENT SHAPE FROM WHAT COMES BACK, and the differences are all deliberate:
 * `skillSlugs` goes out (canonical slugs, validated as a subset server-side) while
 * `skills` comes back (with the job-written `isVerified` a request can never set), and
 * `regionId` goes out while a resolved `region` comes back.
 *
 * An UPSERT of the whole profile, never a patch: sending a partial would make "cleared
 * this field" and "did not touch this field" the same request.
 */
export interface TalentProfileInput {
  readonly headlineRole: string;
  readonly availability: TalentAvailability;
  readonly commitment?: z.infer<typeof RoleCommitmentSchema>;
  readonly locationLabel?: string | null;
  readonly regionId?: string | null;
  readonly bio?: string | null;
  /** Canonical `discovery_skill` slugs. An unknown one is a 422 naming the offenders. */
  readonly skillSlugs: readonly string[];
  readonly compensationAsks: readonly TalentCompensationAskInput[];
}

/**
 * The ask as SENT — no `currency`, because it is derived, and no nullable maxima, because
 * an absent maximum is an open-ended range rather than an explicit null.
 */
export type TalentCompensationAskInput =
  | {
      readonly kind: "salary";
      readonly salaryMinInCentsPerMonth: number;
      readonly salaryMaxInCentsPerMonth?: number;
    }
  | {
      readonly kind: "one_time";
      readonly oneTimeMinInCents: number;
      readonly oneTimeMaxInCents?: number;
    }
  | {
      readonly kind: "equity";
      readonly equityBasisPointsMin: number;
      readonly equityBasisPointsMax?: number;
    };

// --- Problem reports ----------------------------------------------------------

export const PROBLEM_SUBMISSION_STATUSES = [
  "queued",
  "clustered",
  "geocode_failed",
  "rejected",
  "failed",
] as const;
export const ProblemSubmissionStatusSchema = z.enum(PROBLEM_SUBMISSION_STATUSES);
export type ProblemSubmissionStatus = z.infer<typeof ProblemSubmissionStatusSchema>;

/**
 * The `202` receipt from `POST /discovery/problem-reports`.
 *
 * **`clusteringStatus` IS ALWAYS `queued` AND `clusterId` IS ALWAYS NULL HERE.** Geocoding
 * and clustering are jobs, so nothing about where this report lands exists yet. Any UI
 * that reads a cluster off this receipt is reading a field that is null by construction —
 * the client polls `GET /discovery/problem-reports/mine` instead.
 */
export const ProblemSubmissionReceiptSchema = z
  .object({
    submissionId: z.string(),
    clusteringStatus: ProblemSubmissionStatusSchema,
    clusterId: z.null(),
    submittedAt: z.string(),
  })
  .strip();
export type ProblemSubmissionReceipt = z.infer<typeof ProblemSubmissionReceiptSchema>;

/**
 * One of the caller's own submissions.
 *
 * `locationText` is WHAT THE REPORTER TYPED — their own words, never authoritative
 * geography. The coordinates beside it are server-geocoded and NULL until the job has run,
 * which is also when `clusterId` and `clusterTitle` stop being null.
 *
 * `geocodeFailureReason` is the honest ending: a report whose location could not be
 * resolved never reaches a cluster, and saying so beats leaving it `queued` forever.
 */
export const MyProblemReportSchema = z
  .object({
    submissionId: z.string(),
    title: z.string(),
    description: z.string(),
    category: DiscoveryCategoryRefSchema,
    locationText: z.string(),
    countryCode: z.string().nullable(),
    latitudeMicrodegrees: z.number().nullable(),
    longitudeMicrodegrees: z.number().nullable(),
    clusteringStatus: ProblemSubmissionStatusSchema,
    clusterId: z.string().nullable(),
    clusterTitle: z.string().nullable(),
    geocodeFailureReason: z.string().nullable(),
    submittedAt: z.string(),
  })
  .strip();
export type MyProblemReport = z.infer<typeof MyProblemReportSchema>;

export const TALENT_SORTS = ["recent", "effort"] as const;
export type TalentSort = (typeof TALENT_SORTS)[number];

// Re-exported so a consumer needing to read a strand's `kind` doesn't have to know
// which schema module declares the vocabulary.
export { CompensationKindSchema };
