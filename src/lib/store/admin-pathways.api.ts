// TRANSPORT: client-query — the STAFF half of pathway curation: the queue and the decision.
//
// Separate file from `pathway-authoring.api.ts` for the reason the store domain splits every
// staff/author pair: the author half mounts in the studio, and a moderation route autocompleted
// into an author surface is how a `moderate_commerce` call ends up in a seller's bundle.
//
// ⚠️ **NEITHER ROUTE CARRIES CAPABILITY MIDDLEWARE, AND THAT IS THE POSTURE RATHER THAN A HOLE.**
// `moderate_commerce` is demanded inside the service, before any id is read, "so staff capability
// is not probeable from the route table".

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  PathwayAuthoringSchema,
  PathwayModerationPageSchema,
  type ModeratePathwayInput,
  type PathwayAuthoring,
  type PathwayModerationPage,
} from "@/lib/store/pathway-authoring.schemas";

/**
 * `GET /commerce/admin/pathways` — everything waiting, oldest submission first.
 *
 * ⚠️ **`ownCandidateShare` IS ONLY HERE.** `moderatePathway` answers a plain authoring projection
 * with no share, so a console that re-read the row after deciding would lose the number. It is a
 * queue-listing field by construction.
 */
export function listPathwayModerationQueue(
  filter: { readonly cursor?: string },
  options?: RequestOptions,
): Promise<ActionResponse<PathwayModerationPage>> {
  const path = `/commerce/admin/pathways${buildQueryString({ ...filter })}`;
  return getJson(path, PathwayModerationPageSchema, options);
}

/**
 * `POST /commerce/admin/pathways/:pathwayId/moderate`. **Requires an `Idempotency-Key`.**
 *
 * ⚠️ **PUBLISHING IS IRREVERSIBLE AND THE CONSOLE MUST SAY SO BEFORE THE PRESS.** `publish` writes
 * `active`, and from there every edit route answers `INVALID_STATE` forever — there is no delete,
 * no withdraw and no unpublish anywhere in the module. `reject` is the recoverable one: it returns
 * the set to `rejected`, which is editable, so the author can fix and resubmit.
 *
 * A rejection MUST carry `reviewNote` — the schema refines on it, so an empty rejection is a 422
 * rather than a silent publish of nothing.
 *
 * `SELF_MODERATION_FORBIDDEN` (403) is a per-row refusal: a moderator who belongs to the owning
 * organization cannot decide its set. The client cannot know their memberships, so the control
 * stays visible and the refusal is surfaced where it happened.
 */
export function moderatePathway(
  pathwayId: string,
  input: ModeratePathwayInput,
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoring>> {
  const path = `/commerce/admin/pathways/${encodeURIComponent(pathwayId)}/moderate`;
  return sendJson(path, "POST", input, PathwayAuthoringSchema, options);
}
