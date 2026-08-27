// TRANSPORT: props-only — the contract for collaborator credits. No network.
//
// ⚠️ A COLLABORATOR CREDIT GRANTS NOTHING. It is a record that somebody worked on a video, confirmed
// by that person. It is NOT access to the video, the account or the Studio — nothing in the backend
// authorizes off `video_collaborator`, and `/studio/team`'s original roadmap line ("who else can act
// on this account") described ACCOUNT-LEVEL DELEGATION, which does not exist. Copy on this surface
// must not imply it does.

import { z } from "zod";

export const COLLABORATION_STATUSES = ["invited", "accepted", "declined"] as const;
export const CollaborationStatusSchema = z.enum(COLLABORATION_STATUSES);
export type CollaborationStatus = z.infer<typeof CollaborationStatusSchema>;

/** `GET /users/me/collaborations` — an invitation addressed to the caller. */
export const CollaborationInviteSchema = z
  .object({
    videoId: z.string(),
    videoTitle: z.string(),
    creatorName: z.string(),
    status: CollaborationStatusSchema,
    invitedAt: z.string(),
  })
  .strip();
export type CollaborationInvite = z.infer<typeof CollaborationInviteSchema>;

/** `GET /users/me/collaborators` — somebody the caller invited onto one of their own videos. */
export const VideoCollaboratorSchema = z
  .object({
    videoId: z.string(),
    videoTitle: z.string(),
    invitedEmail: z.string(),
    status: CollaborationStatusSchema,
    invitedAt: z.string(),
    /**
     * NULL until the invite is answered — an unanswered invite is an ADDRESS, not a person. Render
     * the absence rather than implying an account is behind it.
     */
    userId: z.string().nullable(),
  })
  .strip();
export type VideoCollaborator = z.infer<typeof VideoCollaboratorSchema>;

/**
 * Body for `POST /videos/:videoId/collaborators/respond`.
 *
 * A TS type, not a Zod schema — the body is `.strict()` server-side, so the compiler is the guard
 * and a runtime re-parse of an object we just built would only re-check itself.
 */
export interface RespondToCollaborationInput {
  readonly response: "accepted" | "declined";
}

export const COLLABORATION_STATUS_LABELS: Record<CollaborationStatus, string> = {
  invited: "Waiting for them",
  accepted: "Confirmed",
  declined: "Declined",
};
