// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. `GET /research-projects` is viewer-aware (`attachOptionalUser`),
// so a server component should forward the session cookie through
// `@/lib/server-http` rather than calling these directly.

import {
  buildQueryString,
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  ResearchProjectListRowSchema,
  ResearchProjectSlugsSchema,
  type ListResearchProjectsFilter,
  type ResearchProjectListRow,
} from "@/lib/rnd/projects.schemas";
import { PaginationMetaSchema } from "@/lib/rnd/shared.schemas";

/**
 * The public feed of `active` projects — the landing rail, and the stage-filtered
 * rails on `/team-building` and `/go-to-market`.
 *
 * Drafts never appear here; they are visible to their founder through
 * `GET /research-projects/mine`. Do not pass `sort` — the query schema is `.strict()`
 * and has no such key (see `ListResearchProjectsFilter`).
 */
export function listResearchProjects(
  filter: ListResearchProjectsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchProjectListRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/research-projects${buildQueryString({ ...filter })}`,
    ResearchProjectListRowSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * Every project slug, for `generateStaticParams`.
 *
 * The one R&D read with no auth middleware at all, because it serves build-time
 * prerendering rather than a visitor. Call it from `generateStaticParams` only — a
 * request-time caller wants `listResearchProjects`.
 */
export function listResearchProjectSlugs(
  options?: RequestOptions,
): Promise<ActionResponse<string[]>> {
  return getJson("/research-projects/slugs", ResearchProjectSlugsSchema, options);
}
