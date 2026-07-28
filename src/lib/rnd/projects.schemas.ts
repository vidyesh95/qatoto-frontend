import { z } from "zod";
import { ProjectStageSchema, ResearchProjectStatusSchema } from "@/lib/rnd/shared.schemas";

// `GET /research-projects` and `/research-projects/slugs`.
// Mirrors `research-projects.service.ts`'s `ResearchProjectListRow`.

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
