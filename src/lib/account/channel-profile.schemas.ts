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
    /**
     * Whether a moderator has hidden this text from the public channel page.
     *
     * ⚠️ THIS IS THE ONLY WAY THE PERSON FINDS OUT. Upholding a report writes an audit entry and
     * an action row and reaches them not at all — there is no notification. Without this field the
     * editor would render their description exactly as before, so somebody asked to fix a problem
     * would not know there was one.
     */
    profileModerationState: z.enum(["visible", "hidden_by_moderator"]),
    /**
     * Whether this creator's channel page is announced in Qatoto's public sitemap.
     *
     * DISCOVERABILITY, NOT VISIBILITY, and the editor's copy has to say so. The channel page is
     * public either way — every feed card links to it — and this only decides whether
     * `GET /channels` announces the handle to a crawler. Copy implying that switching it off makes
     * a channel private would be a promise the backend cannot keep.
     *
     * DEFAULTS TRUE server-side, so this control is an opt-OUT. It shipped as an opt-in and was
     * reversed: indexing a page that is already public and already linked from every feed card
     * reveals nothing new, and the opt-in produced zero listed channels because nobody ticks a box
     * they are never shown. Keeping the control at all is stricter than YouTube, which indexes
     * channel pages by default and offers no toggle.
     */
    isChannelListed: z.boolean(),
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
 * ALL THREE KEYS ARE REQUIRED. `bio: null` clears the description and `links: []` clears the links
 * — omitting either would make "leave it alone" and "clear it" indistinguishable on the one write
 * that can do both. `isChannelListed` is required for the same reason and one more: it is a CONSENT
 * flag, and a body that can omit it is a body that can flip it by accident on a save that only
 * meant to change a description.
 */
export interface UpdateChannelProfileInput {
  readonly bio: string | null;
  readonly links: readonly { readonly label: string; readonly url: string }[];
  readonly isChannelListed: boolean;
}

/** The description bounds the backend enforces, mirrored so the editor can say so before saving. */
export const CHANNEL_BIO_MINIMUM_LENGTH = 20;
export const CHANNEL_BIO_MAXIMUM_LENGTH = 5000;
export const CHANNEL_LINK_LABEL_MAXIMUM_LENGTH = 60;
export const MAXIMUM_CHANNEL_LINKS = 10;
