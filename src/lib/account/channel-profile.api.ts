// TRANSPORT: client-query — the caller's own channel profile, read and written from the browser.

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  ChannelProfileDraftSchema,
  type ChannelProfileDraft,
  type UpdateChannelProfileInput,
} from "@/lib/account/channel-profile.schemas";

/**
 * The caller's own description and links — `GET /users/me/channel-profile`.
 *
 * SELF-SCOPED: the user id comes from the session cookie, never from a path. There is no by-id
 * variant of this route and editing somebody else's public description is a moderation action, not
 * a profile edit.
 */
export function getMyChannelProfile(
  options?: RequestOptions,
): Promise<ActionResponse<ChannelProfileDraft>> {
  return getJson("/users/me/channel-profile", ChannelProfileDraftSchema, options);
}

/**
 * Replaces both — `PATCH /users/me/channel-profile`.
 *
 * **A REPLACE-THE-SET WRITE.** `links` is the complete list in the order it should appear, not a
 * delta, and the server assigns each row's position from the array index. That is why the route
 * takes no idempotency key: sending the same body twice produces the same rows.
 *
 * `https://` ONLY. The backend refuses anything else twice over — a Zod regex that produces a
 * readable message, and a database CHECK that is the actual control, since this URL becomes an
 * `href` on a public page.
 *
 * IT ANSWERS THE SAVED STATE, re-read rather than echoed, so the caller renders what is stored
 * rather than what it hoped to store.
 */
export function updateMyChannelProfile(
  input: UpdateChannelProfileInput,
  options?: RequestOptions,
): Promise<ActionResponse<ChannelProfileDraft>> {
  return sendJson("/users/me/channel-profile", "PATCH", input, ChannelProfileDraftSchema, options);
}
