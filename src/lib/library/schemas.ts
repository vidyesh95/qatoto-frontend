// TRANSPORT: props-only — the contract for the viewer's own collections. No network.
import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * One video in the caller's liked list or watch-later list.
 *
 * ONE SHAPE FOR BOTH, because they are the same card behind two tabs. The wire field is
 * `addedAt` rather than `likedAt`/`savedAt` for the same reason — the tab already says which
 * collection you are looking at, and two names for one instant would fork the card component.
 *
 * THE LIST IS FILTERED, SO ITS LENGTH IS NOT A COUNT. A video the creator has since made
 * private drops out of this list while the like itself survives on the server, and there is no
 * total anywhere on the wire. Never render "12 liked videos" from `rows.length` — it would be
 * wrong the moment any creator unpublishes anything, and wrong in a direction nobody can see.
 *
 * THREE NULLABLE FIELDS, none an oversight. `thumbnailUrl` is null for a video whose oEmbed
 * lookup returned no image; `durationSeconds` is null until the backend has five independent
 * samples and is NEVER substituted with a client-reported number; `creatorHandle` is null for an
 * account that has not set one, so a caller must branch rather than build `/channel/${handle}`.
 */
export const LibraryVideoRowSchema = z
  .object({
    videoId: z.string(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    durationSeconds: z.number().int().nullable(),
    viewCount: z.number().int(),
    creatorId: z.string(),
    creatorName: z.string(),
    creatorHandle: z.string().nullable(),
    addedAt: IsoDateTimeSchema,
  })
  .strip();

export type LibraryVideoRow = z.infer<typeof LibraryVideoRowSchema>;

/**
 * One channel the caller follows.
 *
 * `subscriberCount` IS THE ONLY NUMBER, and it is already public — the watch page shows it on
 * every video. There is deliberately no "3 new videos since you last looked": that needs a
 * last-seen clock nobody keeps.
 *
 * A CREATOR WITH NO VIDEOS IS A REAL ROW. Following a channel before it publishes anything is a
 * normal thing to do, and the server does not filter those out — hiding them would make the
 * subscription unliftable from the only surface that lists it.
 */
export const SubscribedCreatorRowSchema = z
  .object({
    creatorId: z.string(),
    handle: z.string().nullable(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    subscriberCount: z.number().int(),
    subscribedAt: IsoDateTimeSchema,
  })
  .strip();

export type SubscribedCreatorRow = z.infer<typeof SubscribedCreatorRowSchema>;
