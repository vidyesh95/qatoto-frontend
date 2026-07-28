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
import { OpenRoleSchema, type OpenRole } from "@/lib/rnd/catalog.schemas";
import {
  ResearchProjectDetailSchema,
  ResearchProjectListRowSchema,
  ResearchProjectSlugsSchema,
  type ListResearchProjectsFilter,
  type ResearchProjectDetail,
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

/**
 * One project's full detail — the header, the prose, the roster and the stats sidecar
 * in a single read. `attachOptionalUser`, so it renders signed out.
 *
 * A `404` means "no such project, or a draft you do not own", and the two are
 * indistinguishable on purpose so a stranger cannot probe which slugs exist. Call
 * `notFound()` on it; never render a permission hint.
 *
 * A successful read is what makes a "members only" message legitimate on this
 * project's CHILD routes — see `toMemberScopedListViewState`.
 */
export function getResearchProjectDetail(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProjectDetail>> {
  return getJson(`/research-projects/${projectSlug}`, ResearchProjectDetailSchema, options);
}

/**
 * One project's open roles, same row shape as the cross-project `GET /open-roles`.
 *
 * This endpoint exists because `/open-roles` CANNOT substitute: its query schema is
 * `.strict()` and has no `projectSlug` facet, so there is no way to narrow it to one
 * project. Public (`attachOptionalUser`), and a bare array — no pagination.
 */
export function listProjectOpenRoles(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<OpenRole[]>> {
  return getJson(`/research-projects/${projectSlug}/roles`, OpenRoleSchema.array(), options);
}
