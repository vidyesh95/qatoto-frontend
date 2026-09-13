// TRANSPORT: client-query — the viewer-side writes on `/blueprints`.
//
// ⚠️ THE TOGGLES ARE `PUT` AND `DELETE`, NOT `POST`. The METHOD is the verb's direction, and the
// server's composite primary key is the idempotence — so there is no body, no idempotency key, and
// a double-tap on a slow connection is a no-op rather than a second row.
//
// ⚠️ THE BEACON IS FIRE-AND-FORGET AND ANSWERS 202 WITH NO BODY. It deliberately does not echo the
// resulting count: a live readout of a counter is something an attacker can tune against. It is
// sent with `keepalive` so it survives the navigation that usually follows.

import {
  BLUEPRINT_ARM_SEGMENTS,
  BlueprintToggleResultSchema,
  BlueprintViewerStateSchema,
  type BlueprintArm,
  type BlueprintToggleResult,
  type BlueprintToggleVerb,
  type BlueprintViewerState,
} from "@/lib/blueprints/engagement.schemas";
import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";

function armPath(arm: BlueprintArm, slug: string): string {
  return `/blueprints/${BLUEPRINT_ARM_SEGMENTS[arm]}/${encodeURIComponent(slug)}`;
}

/**
 * `POST /blueprints/<arm>/:slug/view-beacon`.
 *
 * ⚠️ ONE PER PAGE OPEN, NOT A HEARTBEAT. A blueprint page has no duration and no position, so there
 * is nothing to report periodically — the server counts one row per viewer per UTC day and the
 * counter moves only when that row was actually inserted.
 *
 * Errors are swallowed on purpose. A reader whose view did not record has nothing to do about it,
 * and a toast saying so would be noise about a number they cannot see.
 */
export async function recordBlueprintView(
  arm: BlueprintArm,
  slug: string,
  options?: RequestOptions,
): Promise<void> {
  try {
    await sendJson(
      `${armPath(arm, slug)}/view-beacon`,
      "POST",
      undefined,
      // The route answers 202 with an empty body; nothing is parsed out of it.
      BlueprintToggleResultSchema.optional(),
      { ...options, keepalive: true },
    );
  } catch {
    // Deliberately silent — see the docblock.
  }
}

/** `PUT`/`DELETE /blueprints/<arm>/:slug/{like,upvote,save}`. */
export function setBlueprintToggle(
  input: {
    readonly arm: BlueprintArm;
    readonly verb: BlueprintToggleVerb;
    readonly slug: string;
    readonly isSet: boolean;
  },
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintToggleResult>> {
  return sendJson(
    `${armPath(input.arm, input.slug)}/${input.verb}`,
    input.isSet ? "PUT" : "DELETE",
    undefined,
    BlueprintToggleResultSchema,
    options,
  );
}

/**
 * `GET /blueprints/engagement/state` — what this viewer has already done, for a named set.
 *
 * Capped at 50 slugs per arm by the server. Comma-separated rather than repeated keys, so one URL
 * carries three arms with no array-parsing ambiguity.
 */
export function getBlueprintViewerState(
  input: {
    readonly showcases?: readonly string[];
    readonly teardowns?: readonly string[];
    readonly caseStudies?: readonly string[];
  },
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintViewerState>> {
  const queryString = buildQueryString({
    showcases: input.showcases?.join(","),
    teardowns: input.teardowns?.join(","),
    caseStudies: input.caseStudies?.join(","),
  });
  return getJson(`/blueprints/engagement/state${queryString}`, BlueprintViewerStateSchema, options);
}
