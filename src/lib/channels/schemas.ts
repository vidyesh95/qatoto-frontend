// TRANSPORT: props-only — the contract for the channel page. No network.
import { z } from "zod";

/**
 * The channel header.
 *
 * `handle` IS NOT NULLABLE HERE even though `user.handle` is nullable on the backend's table.
 * The route is KEYED by handle, so a row that reaches this schema matched one — and a creator
 * who never set a handle simply has no channel page, which is already true of every link:
 * `toVideoCardProps` omits `channelHref` entirely for them rather than building `/channel/null`.
 *
 * ONE COUNTER, AND THE OTHER TWO ARE DELIBERATELY ABSENT. `subscriberCount` is already public on
 * every watch payload. `publishedVideoCount` counts published rows regardless of VISIBILITY, so
 * it would exceed the grid below it and read as a bug; `totalViewCount` is a lifetime figure that
 * includes views of videos since made private, which is a fact about withdrawn content. Neither
 * is on the wire — do not add a "12 videos" label from any other source.
 */
export const ChannelProfileSchema = z
  .object({
    creatorId: z.string(),
    handle: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    subscriberCount: z.number().int(),
    viewerState: z
      .object({
        /** `false`, never null, for a signed-out viewer — definitionally true of them. */
        isSubscribedToCreator: z.boolean(),
      })
      .strip(),
  })
  .strip();

export type ChannelProfile = z.infer<typeof ChannelProfileSchema>;
