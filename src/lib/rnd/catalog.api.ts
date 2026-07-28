// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. Both routes are root-mounted and viewer-aware
// (`attachOptionalUser`), so a server component forwards the session cookie through
// `@/lib/server-http`.

import {
  buildQueryString,
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  OpenRoleSchema,
  ResearchCategorySchema,
  type ListOpenRolesFilter,
  type OpenRole,
  type ResearchCategory,
} from "@/lib/rnd/catalog.schemas";
import { PaginationMetaSchema } from "@/lib/rnd/shared.schemas";

/**
 * Every open role across every project — the landing rail, `/talent`'s companion rail
 * and `/team-building`'s full grid.
 *
 * Each row carries its project's slug, name, stage and cover, so a role card needs no
 * second request. That widened projection is what makes a role-first page possible at
 * all: the old mock derivation flatMapped roles out of the project array and could not
 * exist without every project in memory.
 */
export function listOpenRoles(
  filter: ListOpenRolesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: OpenRole[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/open-roles${buildQueryString({ ...filter })}`,
    OpenRoleSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * The category vocabulary behind every category chip.
 *
 * UNPAGINATED — a facet list is not a feed, so this returns a bare array with no
 * `pagination` sibling. Pass `status: "approved"` for a public picker: a user-minted
 * category lands `pending` and must not be offered as a filter before a moderator
 * decides on it.
 */
export function listResearchCategories(
  filter: { readonly status?: "pending" | "approved" | "rejected" | "merged" } = {},
  options?: RequestOptions,
): Promise<ActionResponse<ResearchCategory[]>> {
  return getJson(
    `/research-categories${buildQueryString({ ...filter })}`,
    ResearchCategorySchema.array(),
    options,
  );
}
