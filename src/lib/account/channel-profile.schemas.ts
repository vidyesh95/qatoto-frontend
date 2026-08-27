// TRANSPORT: props-only — the contract for the caller's own channel profile. No network.
//
// The WRITE side of what `/channel/:handle` renders. `lib/channels/schemas.ts` holds the public
// read; these are the same two fields as their owner may edit them.
//
// THE TWO SHAPES ARE NOT MERGED, on purpose. The public read serves whatever a moderator has left
// visible and cannot distinguish "unset" from "hidden"; this one is the creator's own text, which
// they can always see and edit even while it is hidden — otherwise they could not fix the thing
// they were asked to fix.

import { z } from "zod";

export const ProfileLinkSchema = z
  .object({
    label: z.string(),
    url: z.string(),
  })
  .strip();

export type ProfileLink = z.infer<typeof ProfileLinkSchema>;

export const ChannelProfileDraftSchema = z
  .object({
    bio: z.string().nullable(),
    links: z.array(ProfileLinkSchema),
  })
  .strip();

export type ChannelProfileDraft = z.infer<typeof ChannelProfileDraftSchema>;

/**
 * The request body for `PATCH /users/me/channel-profile`.
 *
 * A TS type rather than a Zod schema, per this repo's convention: the body is `.strict()` on the
 * backend, so the compiler is what stops a wrong field name and a runtime re-parse of an object we
 * just built would only re-check itself.
 *
 * BOTH KEYS ARE REQUIRED. `bio: null` clears the description and `links: []` clears the links —
 * omitting either would make "leave it alone" and "clear it" indistinguishable on the one write
 * that can do both.
 */
export interface UpdateChannelProfileInput {
  readonly bio: string | null;
  readonly links: readonly { readonly label: string; readonly url: string }[];
}

/** The description bounds the backend enforces, mirrored so the editor can say so before saving. */
export const CHANNEL_BIO_MINIMUM_LENGTH = 20;
export const CHANNEL_BIO_MAXIMUM_LENGTH = 5000;
export const CHANNEL_LINK_LABEL_MAXIMUM_LENGTH = 60;
export const MAXIMUM_CHANNEL_LINKS = 10;
