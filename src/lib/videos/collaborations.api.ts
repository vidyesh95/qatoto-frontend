// TRANSPORT: client-query — collaborator credits, both directions.

import { z } from "zod";

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  CollaborationInviteSchema,
  VideoCollaboratorSchema,
  type CollaborationInvite,
  type RespondToCollaborationInput,
  type VideoCollaborator,
} from "@/lib/videos/collaborations.schemas";

/** The answer echoed back. Narrow on purpose — the caller already knows which way it went. */
const RespondedSchema = z.object({ status: z.string() }).strip();

/**
 * `GET /users/me/collaborations` — invitations addressed to ME.
 *
 * Matched server-side on the caller's own EMAIL, not their user id: `video_collaborator.user_id` is
 * null until an invite is answered, so an id match would return nothing to exactly the people who
 * still have something to do.
 */
export function listMyCollaborations(
  options?: RequestOptions,
): Promise<ActionResponse<CollaborationInvite[]>> {
  return getJson("/users/me/collaborations", CollaborationInviteSchema.array(), options);
}

/** `GET /users/me/collaborators` — everyone I have invited, across every video I own. */
export function listMyCollaborators(
  options?: RequestOptions,
): Promise<ActionResponse<VideoCollaborator[]>> {
  return getJson("/users/me/collaborators", VideoCollaboratorSchema.array(), options);
}

/**
 * `POST /videos/:videoId/collaborators/respond` — accept or decline an invite addressed to you.
 *
 * ⚠️ THE CALLER IS NOT THE VIDEO'S OWNER. Their claim is on the invited address, and the backend
 * matches `(videoId, invitedEmail = your email)` — that predicate is the authorization. Answering
 * an invite you were never sent is an ordinary `404`, identical to a video that does not exist, so
 * the route cannot be used to find out who is invited to what.
 *
 * NO IDEMPOTENCY KEY: the write is a `set status` on one row, so a replay lands on the same value.
 */
export function respondToCollaboration(
  videoId: string,
  input: RespondToCollaborationInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ status: string }>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/collaborators/respond`,
    "POST",
    input,
    RespondedSchema,
    options,
  );
}
