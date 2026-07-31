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
  sendJson,
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

/**
 * Propose a new research category.
 *
 * IT ARRIVES `pending`, NOT `approved`. The public taxonomy is moderated, so a founder
 * who needs a category that does not exist proposes one and keeps going; a moderator
 * decides later whether it joins the vocabulary or is merged into an existing entry.
 * `pending` is USABLE — every writer of this table refuses only `rejected`.
 *
 * That is why the `/new` wizard sends a `categoryId` from this call rather than a free
 * string: `research_project.categoryId` is a foreign key, and there is no "other" bucket
 * for a name nobody has agreed to.
 *
 * THE REQUEST FIELD IS `label`; THE RESPONSE FIELD IS `displayLabel`. The alias is applied
 * at the backend's projection boundary and runs ONE WAY — `CreateCategorySchema` is
 * `.strict()` over `{ label }`, so sending `displayLabel` is a 422 naming both the missing
 * key and the unrecognized one. Do not "correct" this to match the response.
 *
 * NO `pinIconKey`. The backend omits it from the create schema on purpose — a minter must
 * not choose their own map iconography — so offering it here would only produce a 422.
 */
export function createResearchCategory(
  input: { readonly label: string },
  options?: RequestOptions,
): Promise<ActionResponse<ResearchCategory>> {
  return sendJson(
    "/research-categories",
    "POST",
    { label: input.label },
    ResearchCategorySchema,
    options,
  );
}
