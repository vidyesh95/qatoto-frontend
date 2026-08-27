// TRANSPORT: props-only — the contract for the channel page. No network.
import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * The channel header.
 *
 * `handle` IS NOT NULLABLE HERE even though `user.handle` is nullable on the backend's table.
 * The route is KEYED by handle, so a row that reaches this schema matched one — and a creator
 * who never set a handle simply has no channel page, which is already true of every link:
 * `toVideoCardProps` omits `channelHref` entirely for them rather than building `/channel/null`.
 *
 * THREE COUNTERS, AND TWO OF THEM ARE NOT THE ONES IN `creator_stats`. That distinction is the
 * whole reason they are safe to render, so do not "simplify" them back to the cached figures:
 *
 *   - `publishedVideoCount` counts published rows regardless of VISIBILITY, so it would exceed
 *     the grid below it and read as a bug.
 *   - `totalViewCount` is a lifetime figure including views of videos since made private or
 *     deleted — a fact about withdrawn content, and one a viewer could diff against the visible
 *     grid to infer that deleted videos existed.
 *
 * `publicVideoCount` and `publicViewCount` are instead aggregated server-side over the SAME
 * predicate that selects the videos on this page. So the count always equals what is on screen,
 * and neither number describes anything the creator has withdrawn.
 *
 * `joinedAt` is `user.created_at`, public for the first time on this read.
 *
 * `bio` NULL AND `links` EMPTY MEAN TWO THINGS AT ONCE — unset, or hidden by a moderator — and the
 * wire deliberately does not distinguish them. A page that said "this description was hidden" would
 * hand a reporter a receipt and the subject a notification, neither of which this surface owes
 * anyone. Render the absence, never the reason.
 */
/**
 * One external link a creator published.
 *
 * The backend refuses anything that is not `https://` with a CHECK constraint, so this schema does
 * not re-validate the scheme — but the renderer still must not trust it blindly: it is user-supplied
 * text on a public page, so the anchor carries `rel="noopener noreferrer nofollow ugc"`.
 */
export const ProfileLinkSchema = z
  .object({
    label: z.string(),
    url: z.string(),
  })
  .strip();

export type ProfileLink = z.infer<typeof ProfileLinkSchema>;

export const ChannelProfileSchema = z
  .object({
    creatorId: z.string(),
    handle: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    subscriberCount: z.number().int(),
    bio: z.string().nullable(),
    links: z.array(ProfileLinkSchema),
    publicVideoCount: z.number().int(),
    publicViewCount: z.number().int(),
    joinedAt: IsoDateTimeSchema,
    viewerState: z
      .object({
        /** `false`, never null, for a signed-out viewer — definitionally true of them. */
        isSubscribedToCreator: z.boolean(),
      })
      .strip(),
  })
  .strip();

export type ChannelProfile = z.infer<typeof ChannelProfileSchema>;

/**
 * One row of `GET /channels` — the opted-in public directory.
 *
 * DELIBERATELY THIN. Its only consumer is `sitemap.ts`, which needs a handle and nothing else; the
 * name rides along so a future directory PAGE would not need a second route. Adding avatars, counts
 * or bios here would put a per-creator join behind a read whose job is to be walked in full.
 */
export const ListedChannelSchema = z
  .object({
    handle: z.string(),
    name: z.string(),
  })
  .strip();

export type ListedChannel = z.infer<typeof ListedChannelSchema>;
