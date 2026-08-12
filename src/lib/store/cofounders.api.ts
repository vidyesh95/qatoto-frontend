// TRANSPORT: server-fetch — the two public reads are awaited by server components. Everything
// below the `Writes` divider is NOT: it is session-scoped and called from `"use client"` islands.
//
// WIRED. `src/mocks/store/cofounders-mocks.ts` is deleted.
//

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
  CofounderProfileStateChangeSchema,
  CreatedCofounderProfileSchema,
  OwnCofounderProfileSchema,
  type CofounderDirectoryPage,
  type CofounderProfileDetail,
  type CofounderProfileStateChange,
  type CreateCofounderProfileInput,
  type CreatedCofounderProfile,
  type ListCofounderProfilesFilter,
  type OwnCofounderProfile,
  type UpdateCofounderEngagementStateInput,
  type UpdateCofounderProfileInput,
} from "@/lib/store/cofounders.schemas";

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
  return getJson(path, CofounderDirectoryPageSchema, options);
}

/** One profile — `GET /store/cofounder-profiles/:profileSlug`. A missing slug is a 404. */
export function getCofounderProfile(
  profileSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<CofounderProfileDetail>> {
  const path = `/store/cofounder-profiles/${profileSlug}`;
  return getJson(path, CofounderProfileDetailSchema, options);
}

// --- Writes ------------------------------------------------------------------

/**
 * `POST /community/cofounder-profiles` — creates YOUR OWN profile, as a DRAFT.
 *
 * IT DOES NOT PUBLISH AND IT MAKES NOBODY DISCOVERABLE. The row comes back `state: "draft"`, visible
 * to its author alone; publishing is a separate act behind review. So the success screen may not say
 * "live", "listed" or "people can now find you".
 *
 * THE VIEWER DESCRIBES THEMSELVES, never a third party — there is no route by which one person lists
 * another, and there must not be. See the schema header.
 *
 * `input` CARRIES NO CAPITAL OR EQUITY FIELD, and sending one is not a harmless extra: the
 * backend's create schema is `.strict()` and answers 422, which fails the whole write rather than
 * dropping the number (§14). If a composer starts sending `capitalRangeMinInCents` again, profile
 * creation stops working entirely.
 *
 * Requires an `Idempotency-Key`. A retry without one is a second profile of the same person — and
 * `userId` is unique server-side, so it fails rather than duplicating.
 */
export function createCofounderProfile(
  input: CreateCofounderProfileInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedCofounderProfile>> {
  const path = "/community/cofounder-profiles";
  // A FIXED row rather than an echo of the input — an echoed slug could name a profile that does not
  // resolve, and "view your profile" would 404 on the first click.
  return sendJson(path, "POST", input, CreatedCofounderProfileSchema, options);
}

/**
 * The viewer's own profile in any state — `GET /community/cofounder-profiles/mine`.
 *
 * THE READ WITHOUT WHICH THE CREATE IS POINTLESS (§18.3). Public reads return `published` only, so
 * before this route existed a user made a `draft` that nobody — including themselves — could ever
 * see again.
 *
 * A viewer with no profile gets a 404, and that is a normal state rather than an error: the page
 * renders the "create one" path from it. Do not turn it into a sign-in prompt.
 */
export function getOwnCofounderProfile(
  options?: RequestOptions,
): Promise<ActionResponse<OwnCofounderProfile>> {
  const path = "/community/cofounder-profiles/mine";
  return getJson(path, OwnCofounderProfileSchema, options);
}

/**
 * `PATCH /community/cofounder-profiles/mine` — edit while `draft` or `withdrawn`.
 *
 * REFUSED WHILE `published` OR `pending_review`, and that is the design. Everything here is
 * content a moderator approved, so changing it after approval goes back through `submit`. The one
 * exception has its own route below.
 *
 * Still no capital or equity field — see the create above.
 */
export function updateOwnCofounderProfile(
  input: UpdateCofounderProfileInput,
  options?: RequestOptions,
): Promise<ActionResponse<OwnCofounderProfile>> {
  const path = "/community/cofounder-profiles/mine";
  return sendJson(path, "PATCH", input, OwnCofounderProfileSchema, options);
}

/**
 * `POST /community/cofounder-profiles/mine/submit` — `draft` → `pending_review`.
 *
 * SUBMITTING IS NOT PUBLISHING. A moderator decides, and until they do the profile is in no public
 * read. No copy on this action may say "you are now listed".
 */
export function submitOwnCofounderProfile(
  options?: RequestOptions,
): Promise<ActionResponse<CofounderProfileStateChange>> {
  const path = "/community/cofounder-profiles/mine/submit";
  return sendJson(path, "POST", {}, CofounderProfileStateChangeSchema, options);
}

/**
 * `POST /community/cofounder-profiles/mine/withdraw` — out of the directory, REVERSIBLY.
 *
 * WITHDRAW IS NOT DELETE, and there is no delete. The profile returns to a state its owner can
 * edit and submit again. Copy must not offer this as "remove my profile permanently", because it
 * is not that and the row still exists.
 */
export function withdrawOwnCofounderProfile(
  options?: RequestOptions,
): Promise<ActionResponse<CofounderProfileStateChange>> {
  const path = "/community/cofounder-profiles/mine/withdraw";
  return sendJson(path, "POST", {}, CofounderProfileStateChangeSchema, options);
}

/**
 * `PATCH /community/cofounder-profiles/mine/engagement-state`.
 *
 * THE ONE EDIT A `published` PROFILE MAY MAKE without re-entering moderation: availability is a
 * fact about the person, not content somebody approved.
 *
 * MOVING TO `not_looking` DOES NOT HIDE THE PROFILE. It stays in the directory, saying so, with no
 * contact affordance — a profile is also a record, and removing it would make somebody who is
 * mid-conversation look as though they had left the platform.
 */
export function updateOwnCofounderEngagementState(
  input: UpdateCofounderEngagementStateInput,
  options?: RequestOptions,
): Promise<ActionResponse<CofounderProfileStateChange>> {
  const path = "/community/cofounder-profiles/mine/engagement-state";
  return sendJson(path, "PATCH", input, CofounderProfileStateChangeSchema, options);
}
