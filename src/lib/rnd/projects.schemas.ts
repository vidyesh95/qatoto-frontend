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
 * There is no `relatedInsightIds` and no `originProblemReportId` on this view. The
 * Overview tab's demand-evidence chips and Civic Pulse origin link need a server-side
 * link that does not exist yet — see docs/R_AND_D_STRUCTURE.md §18. `coverImageUrl` is
 * NULLABLE; the mock field it replaces (`coverImageSrc`) was not, so every render site
 * needs a fallback.
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
    /** Computed per request from the viewer's session, never a column. */
    isWatchedByViewer: z.boolean(),
    viewerProjectRole: z.string().nullable(),
  })
  .strip();
export type ResearchProjectDetail = z.infer<typeof ResearchProjectDetailSchema>;
