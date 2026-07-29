import { z } from "zod";
import {
  ProjectStageSchema,
  ResearchProjectStatusSchema,
  RoleCommitmentSchema,
} from "@/lib/rnd/shared.schemas";

// `GET /research-projects`, `/research-projects/slugs` and
// `GET /research-projects/:projectSlug`.
// Mirrors `research-projects.service.ts`'s `ResearchProjectListRow` and
// `ResearchProjectDetailView`, plus `project-membership.service.ts`'s
// `ProjectTeamMemberView` and `ProjectStatsView`.

/**
 * The compact row feeds and rails render. It is DELIBERATELY NOT the detail shape:
 * `GET /research-projects/:slug` returns a much wider projection with team, stats and
 * viewer-scoped fields. Keeping them as two types is what lets the list surfaces wire
 * up while the detail route is still on mocks.
 *
 * `slug` is the public identity and the `generateStaticParams` value. There is no
 * separate opaque id on this row on purpose — the slug IS the URL identity across all
 * three clients.
 */
export const ResearchProjectListRowSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    tagline: z.string(),
    categorySlug: z.string(),
    categoryLabel: z.string(),
    stage: ProjectStageSchema,
    status: ResearchProjectStatusSchema,
    coverImageUrl: z.string().nullable(),
    watchersCount: z.number(),
    teamMemberCount: z.number(),
    openRoleCount: z.number(),
    publishedAt: z.string().nullable(),
    updatedAt: z.string(),
  })
  .strip();
export type ResearchProjectListRow = z.infer<typeof ResearchProjectListRowSchema>;

/**
 * `GET /research-projects/slugs` — the slug list for `generateStaticParams`.
 *
 * The one R&D read with NO auth middleware at all, because it exists for build-time
 * prerendering rather than for a visitor.
 */
export const ResearchProjectSlugsSchema = z.string().array();

/**
 * Filters `GET /research-projects` actually accepts.
 *
 * THERE IS NO `sort`. `docs/R_AND_D_BACKEND_STRUCTURE.md` §11a lists one, but
 * `ListProjectsQuerySchema` is `.strict()` over exactly these four keys — sending
 * `?sort=` is a 422, not an ignored param.
 */
export interface ListResearchProjectsFilter {
  readonly category?: string;
  readonly stage?: z.infer<typeof ProjectStageSchema>;
  readonly page?: number;
  readonly limit?: number;
}

// --- The detail projection ----------------------------------------------------

export const PROJECT_MEMBER_ROLES = ["founder", "admin", "maintainer", "contributor"] as const;
export const ProjectMemberRoleSchema = z.enum(PROJECT_MEMBER_ROLES);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;

/**
 * One roster entry.
 *
 * `name` and `avatarImageUrl` are JOINED from `user`, never copied onto the membership
 * row — a copy drifts the moment someone changes their photo. `isFounder` is COMPUTED
 * from `projectRole`, so the contradictory `isFounder: true` +
 * `projectRole: "contributor"` state is unrepresentable.
 *
 * THERE IS NO `equityBasisPoints` AND NO `verifiedEffortMinutes` HERE, deliberately.
 * Both are derived by the §9 slice ledger, and returning `0` for them would render a
 * fabricated number as fact on a Slicing Pie surface. The real cap table is the
 * Proof-of-Effort equity snapshot; do not reconstruct an equity split from this row.
 */
export const ProjectTeamMemberSchema = z
  .object({
    memberId: z.string(),
    userId: z.string(),
    name: z.string(),
    avatarImageUrl: z.string().nullable(),
    handle: z.string().nullable(),
    projectRole: ProjectMemberRoleSchema,
    roleTitle: z.string().nullable(),
    skills: z.string().array(),
    isFounder: z.boolean(),
    joinedAt: z.string(),
  })
  .strip();
export type ProjectTeamMember = z.infer<typeof ProjectTeamMemberSchema>;

/**
 * The counter sidecar, with its freshness bound.
 *
 * The four nullable fields are null until the jobs that own them have run, and they are
 * NOT defaulted to `0`: `allocatedEquityBasisPoints: 0` contradicts the invariant that
 * it equals 10000 on a non-degenerate project. Render null as an absence.
 *
 * `statsComputedAt` exists so a client renders "as of" — these numbers are stored, not
 * live, and a streak decays at midnight in `projectTimeZone` with no write happening.
 */
export const ProjectStatsSchema = z
  .object({
    watchersCount: z.number(),
    teamMemberCount: z.number(),
    openRoleCount: z.number(),
    projectTimeZone: z.string(),
    dailyLogStreakDays: z.number().nullable(),
    lastDailyLogDate: z.string().nullable(),
    verifiedEffortMinutesTotal: z.number().nullable(),
    allocatedEquityBasisPoints: z.number().nullable(),
    statsComputedAt: z.string().nullable(),
  })
  .strip();
export type ProjectStats = z.infer<typeof ProjectStatsSchema>;

/**
 * `GET /research-projects/:projectSlug` — `attachOptionalUser`, so it renders signed
 * out. A draft is visible to its founder alone; everyone else gets a `404`, which is
 * also the answer for a slug that does not exist. Treat that 404 as `notFound()` and
 * never as a permission hint.
 *
 * DELIBERATELY WIDER THAN `ResearchProjectListRowSchema`, and the two stay separate:
 * the backend's list projection is genuinely narrower, so collapsing them would force
 * every rail to over-fetch a team roster it does not render.
 *
 * BOTH OVERVIEW LINKS ARE NOW READ HERE. `ResearchProjectDetailView` gained
 * `originCluster: { clusterId, title } | null` and `relatedInsights: { insightId,
 * headline }[]` with backend §11k, and the Overview tab renders both. `originCluster` is
 * NULLABLE — a project need not have been born from a cluster, and a merge downgrades the
 * link away — and `relatedInsights` is an ordered array that is legitimately empty. An
 * empty array is "this project cites no published insight", not a failed read.
 *
 * `coverImageUrl` is NULLABLE; the mock field it replaces (`coverImageSrc`) was not, so
 * every render site needs a fallback.
 */
export const ResearchProjectDetailSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    tagline: z.string(),
    description: z.string().nullable(),
    problemStatement: z.string().nullable(),
    solutionSummary: z.string().nullable(),
    targetRegion: z.string().nullable(),
    /**
     * The FOUNDER'S OWN assertion of demand. Must render visually distinct from
     * platform-computed market insights — an assertion is not verified evidence.
     */
    demandEvidenceNotes: z.string().nullable(),
    category: z.object({ slug: z.string(), label: z.string() }).strip(),
    stage: ProjectStageSchema,
    status: ResearchProjectStatusSchema,
    currency: z.string(),
    coverImageUrl: z.string().nullable(),
    seedRolesNeeded: z.string().array(),
    offeredEquityBasisPointsMin: z.number().nullable(),
    offeredEquityBasisPointsMax: z.number().nullable(),
    /**
     * NULLABLE. `research_project.expected_commitment` carries no `.notNull()`
     * (backend `schema.ts:895`) and a project created without one returns null — which
     * is what a founder who has not decided yet looks like, not a default of
     * `part_time`. Render the absence.
     */
    expectedCommitment: RoleCommitmentSchema.nullable(),
    founderUserId: z.string(),
    publishedAt: z.string().nullable(),
    archivedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    stats: ProjectStatsSchema.nullable(),
    team: ProjectTeamMemberSchema.array(),
    /**
     * The Civic Pulse cluster this project was born from (§11k.1) — the
     * `problem_cluster_project_link` row whose `source` is `origin`.
     *
     * ADDRESSED BY ID, NOT SLUG: clusters have no slug anywhere in the backend, so the
     * chip links to `/problem-map` by `clusterId` exactly as the map itself does. It is
     * NOT `originProblemReportId` — there is no such column, and this is a cluster
     * rather than one person's report.
     */
    originCluster: z.object({ clusterId: z.string(), title: z.string() }).strip().nullable(),
    /**
     * Moderated market insights this project cites (§11k.2), PUBLISHED ONES ONLY and
     * server-ordered.
     *
     * Distinct from `demandEvidenceNotes` above, and they must render differently: that
     * is the founder's own assertion citing nothing a reader can open, these are
     * platform-moderated evidence a reader can follow to `/knowledge-hub`.
     */
    relatedInsights: z.object({ insightId: z.string(), headline: z.string() }).strip().array(),
    /** Computed per request from the viewer's session, never a column. */
    isWatchedByViewer: z.boolean(),
    viewerProjectRole: z.string().nullable(),
  })
  .strip();
export type ResearchProjectDetail = z.infer<typeof ResearchProjectDetailSchema>;

// --- Applications and invites (§11j.2) ----------------------------------------

export const PROJECT_APPLICATION_KINDS = ["role_application", "open_application"] as const;
export const ProjectApplicationKindSchema = z.enum(PROJECT_APPLICATION_KINDS);
export type ProjectApplicationKind = z.infer<typeof ProjectApplicationKindSchema>;

export const PROJECT_APPLICATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const;
export const ProjectApplicationStatusSchema = z.enum(PROJECT_APPLICATION_STATUSES);
export type ProjectApplicationStatus = z.infer<typeof ProjectApplicationStatusSchema>;

export const PROJECT_INVITE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const;
export const ProjectInviteStatusSchema = z.enum(PROJECT_INVITE_STATUSES);
export type ProjectInviteStatus = z.infer<typeof ProjectInviteStatusSchema>;

/**
 * One row of the FOUNDER'S inbox — `GET …/:projectSlug/applications`, maintainer-gated.
 *
 * `expectedCompensationNote` is the applicant's OWN stated ask. It is never read by the
 * ledger and is never an input to any grant; it is a sentence a person wrote, and any UI
 * that totals or compares these has invented a salary band nobody agreed to.
 */
export const ProjectApplicationSchema = z
  .object({
    id: z.string(),
    kind: ProjectApplicationKindSchema,
    status: ProjectApplicationStatusSchema,
    applicantUserId: z.string(),
    applicantName: z.string(),
    applicantAvatarImageUrl: z.string().nullable(),
    openRoleId: z.string().nullable(),
    roleTitleSnapshot: z.string().nullable(),
    shortPitch: z.string(),
    selectedSkills: z.string().array(),
    statedCommitment: RoleCommitmentSchema,
    expectedCompensationNote: z.string().nullable(),
    reviewNote: z.string().nullable(),
    decidedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type ProjectApplication = z.infer<typeof ProjectApplicationSchema>;

/**
 * One row of the APPLICANT'S OWN list — `GET /applications/mine`.
 *
 * Carries the project it was sent to, because an applicant arrives holding no slug. That
 * is the whole reason this endpoint exists: the project-scoped list is the founder's
 * inbox and can never answer "what did I apply to".
 *
 * NO PROJECT-STATUS FILTER, deliberately: a draft project's application stays visible to
 * the person who sent it. They already know the project exists — they applied to it.
 */
export const MyApplicationSchema = z
  .object({
    id: z.string(),
    kind: ProjectApplicationKindSchema,
    status: ProjectApplicationStatusSchema,
    projectSlug: z.string(),
    projectName: z.string(),
    projectStage: ProjectStageSchema,
    projectCoverImageUrl: z.string().nullable(),
    openRoleId: z.string().nullable(),
    roleTitleSnapshot: z.string().nullable(),
    shortPitch: z.string(),
    selectedSkills: z.string().array(),
    statedCommitment: RoleCommitmentSchema,
    expectedCompensationNote: z.string().nullable(),
    /** The founder's note back — the whole reason an applicant opens this screen. */
    reviewNote: z.string().nullable(),
    decidedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type MyApplication = z.infer<typeof MyApplicationSchema>;

/**
 * One invite addressed to the caller — `GET /invites/mine`.
 *
 * WITHOUT THIS READ THE INVITE FLOW TERMINATES NOWHERE: `/accept` and `/decline` both
 * need an `inviteId`, and an invitee holds no project slug to go looking for one.
 *
 * `invitedByName` is the INVITER. On this screen the caller is the invitee, so naming
 * them back to themselves would be the one useless field on the row.
 */
export const MyInviteSchema = z
  .object({
    id: z.string(),
    status: ProjectInviteStatusSchema,
    projectSlug: z.string(),
    projectName: z.string(),
    projectStage: ProjectStageSchema,
    projectCoverImageUrl: z.string().nullable(),
    invitedByUserId: z.string(),
    invitedByName: z.string(),
    invitedByAvatarImageUrl: z.string().nullable(),
    openRoleId: z.string().nullable(),
    roleTitle: z.string().nullable(),
    message: z.string().nullable(),
    respondedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type MyInvite = z.infer<typeof MyInviteSchema>;

/** One invite as the SENDER sees it — `GET …/:projectSlug/invites`. */
export const ProjectInviteSchema = z
  .object({
    id: z.string(),
    status: ProjectInviteStatusSchema,
    inviteeUserId: z.string(),
    inviteeName: z.string(),
    inviteeAvatarImageUrl: z.string().nullable(),
    invitedByUserId: z.string(),
    openRoleId: z.string().nullable(),
    roleTitle: z.string().nullable(),
    message: z.string().nullable(),
    respondedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type ProjectInvite = z.infer<typeof ProjectInviteSchema>;
