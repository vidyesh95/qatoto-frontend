// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. The home Spotlight rail reads the PUBLIC route server-side; the admin
// console reads and writes from a client island.

import { z } from "zod";

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  AdminSpotlightSlotSchema,
  PublicSpotlightVideoSchema,
  type AdminSpotlightSlot,
  type PublicSpotlightVideo,
  type ReplaceSpotlightSlotsInput,
} from "@/lib/spotlight/schemas";

/**
 * Every list route nests its array under a named key rather than returning a bare array,
 * matching promotions. The schema is the wrapper; the caller unwraps.
 */
const PublicVideoListSchema = z.object({ videos: PublicSpotlightVideoSchema.array() }).strip();
const AdminSlotListSchema = z.object({ slots: AdminSpotlightSlotSchema.array() }).strip();

/**
 * `GET /spotlight/videos` — PUBLIC, no session.
 *
 * Returns only feed-eligible slots, already in display order. Called from a server
 * component; `cache: "no-store"` is the caller's to pass, since an admin publishing a
 * change must not wait out a cache entry.
 */
export async function listActiveSpotlightVideos(
  options?: RequestOptions,
): Promise<ActionResponse<PublicSpotlightVideo[]>> {
  const result = await getJson("/spotlight/videos", PublicVideoListSchema, options);
  return result.success ? { success: true, data: result.data.videos } : result;
}

/** `GET /spotlight/admin/slots` — every stored slot. Requires `manage_promotions`. */
export async function listSpotlightSlotsForAdmin(
  options?: RequestOptions,
): Promise<ActionResponse<AdminSpotlightSlot[]>> {
  const result = await getJson("/spotlight/admin/slots", AdminSlotListSchema, options);
  return result.success ? { success: true, data: result.data.slots } : result;
}

/**
 * `PUT /spotlight/admin/slots` — replace the whole ordered set.
 *
 * NOT OPTIMISTIC. The list re-renders from the server's answer so the console and the
 * live rail cannot disagree after a save.
 */
export function replaceSpotlightSlots(
  input: ReplaceSpotlightSlotsInput,
  options?: RequestOptions,
): Promise<ActionResponse<AdminSpotlightSlot[]>> {
  return sendJson(
    "/spotlight/admin/slots",
    "PUT",
    { videoIds: [...input.videoIds] },
    AdminSlotListSchema,
    options,
  ).then((result) => (result.success ? { success: true, data: result.data.slots } : result));
}
