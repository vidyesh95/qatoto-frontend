// TRANSPORT: server-fetch — the two reads are public and awaited by server components. The write is
// session-scoped and called from a `"use client"` composer.
//
// MOCK-BACKED: every call resolves a fixture. No cofounder endpoint exists — A25 lists
// `find-cofounder` as "not commerce and has no backend anywhere". To wire one, swap `resolveMockRead`
// for `getJson` (or the write for `sendJson`) and drop the fixture argument for `options`.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CofounderDirectoryPageSchema,
  CofounderProfileDetailSchema,
  CreatedCofounderProfileSchema,
  type CofounderDirectoryPage,
  type CofounderProfileDetail,
  type CreateCofounderProfileInput,
  type CreatedCofounderProfile,
  type ListCofounderProfilesFilter,
} from "@/lib/store/cofounders.schemas";
import { resolveMockDetail, resolveMockRead } from "@/lib/store/mock-transport";
import {
  MOCK_COFOUNDER_DETAILS_BY_SLUG,
  MOCK_COFOUNDER_DIRECTORY_PAGE,
  MOCK_CREATED_COFOUNDER_PROFILE,
} from "@/mocks/store/cofounders-mocks";

/**
 * The cofounder directory — `GET /store/cofounder-profiles`.
 *
 * ONLY `published` PROFILES REACH THIS READ. A draft or a withdrawn one is invisible, which is the
 * whole reason `COFOUNDER_PROFILE_STATES` is not a filter here — offering `?state=draft` would be
 * offering to browse other people's unpublished writing.
 *
 * THERE IS NO SORT PARAMETER, deliberately. A ranked list of people reads as a recommendation, and
 * this platform is not a broker (rule 2 in the schema header). Order is the backend's, and it must
 * not be presented as merit.
 */
export function listCofounderProfiles(
  filter: ListCofounderProfilesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<CofounderDirectoryPage>> {
  const path = `/store/cofounder-profiles${buildQueryString({ ...filter })}`;
  return resolveMockRead(
    path,
    CofounderDirectoryPageSchema,
    options,
    MOCK_COFOUNDER_DIRECTORY_PAGE,
  );
  // return getJson(path, CofounderDirectoryPageSchema, options);
}

/** One profile — `GET /store/cofounder-profiles/:profileSlug`. A missing slug is a 404. */
export function getCofounderProfile(
  profileSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<CofounderProfileDetail>> {
  const path = `/store/cofounder-profiles/${profileSlug}`;
  return resolveMockDetail(
    path,
    CofounderProfileDetailSchema,
    options,
    MOCK_COFOUNDER_DETAILS_BY_SLUG,
    profileSlug,
  );
  // return getJson(path, CofounderProfileDetailSchema, options);
}

// --- Writes ------------------------------------------------------------------

/**
 * `POST /commerce/cofounder-profiles` — creates YOUR OWN profile, as a DRAFT.
 *
 * IT DOES NOT PUBLISH AND IT MAKES NOBODY DISCOVERABLE. The row comes back `state: "draft"`, visible
 * to its author alone; publishing is a separate act behind review. So the success screen may not say
 * "live", "listed" or "people can now find you".
 *
 * THE VIEWER DESCRIBES THEMSELVES, never a third party — there is no route by which one person lists
 * another, and there must not be. See the schema header.
 *
 * Requires an `Idempotency-Key`. A retry without one is a second profile of the same person.
 */
export function createCofounderProfile(
  input: CreateCofounderProfileInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedCofounderProfile>> {
  const path = "/commerce/cofounder-profiles";
  void input;
  // A FIXED row rather than an echo of the input — an echoed slug could name a profile that does not
  // resolve, and "view your profile" would 404 on the first click.
  return resolveMockRead(
    path,
    CreatedCofounderProfileSchema,
    options,
    MOCK_CREATED_COFOUNDER_PROFILE,
  );
  // return sendJson(path, "POST", input, CreatedCofounderProfileSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while every call is mock-backed.
void getJson;
void sendJson;
