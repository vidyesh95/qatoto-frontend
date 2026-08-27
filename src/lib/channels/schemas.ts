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
 */
export const ChannelProfileSchema = z
  .object({
    creatorId: z.string(),
    handle: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    subscriberCount: z.number().int(),
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
