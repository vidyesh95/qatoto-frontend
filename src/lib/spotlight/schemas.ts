// TRANSPORT: props-only — pure contract. Zod schemas for the home Spotlight rail.
//
// Every object is `.strip()`, so a backend that adds a field in a minor release does not
// blank the rail (CLAUDE.md Pattern 2).

import { z } from "zod";

/** Hard ceiling — left / center / right. Mirrored from the backend's MAX_SPOTLIGHT_SLOTS. */
export const MAX_SPOTLIGHT_SLOTS = 3;

/**
 * What `GET /spotlight/videos` returns per row. Deliberately thinner than a full feed card:
 * the expanding-tile UI only needs an id, a title and a thumbnail.
 *
 * No `position` — array order IS left → center → right.
 */
export const PublicSpotlightVideoSchema = z
  .object({
    videoId: z.string().min(1),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
  })
  .strip();
export type PublicSpotlightVideo = z.infer<typeof PublicSpotlightVideoSchema>;

/** What the admin console sees for one stored slot. */
export const AdminSpotlightSlotSchema = z
  .object({
    position: z.number().int().min(0).max(2),
    videoId: z.string().min(1),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    updatedByUserId: z.string().nullable(),
    // Wire instant as a string (same as promotional slides). Display formatting is the
    // caller's job; we only need identity for the admin list.
    updatedAt: z.string(),
  })
  .strip();
export type AdminSpotlightSlot = z.infer<typeof AdminSpotlightSlotSchema>;

/** Body for `PUT /spotlight/admin/slots`. Empty clears the rail. */
export interface ReplaceSpotlightSlotsInput {
  readonly videoIds: readonly string[];
}
