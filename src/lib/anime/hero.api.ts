// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. The /anime carousel reads the PUBLIC route server-side; the admin
// console reads and writes from a client island.

import {
  AdminAnimeHeroSlideSchema,
  PublicAnimeHeroSlideSchema,
  type AdminAnimeHeroSlide,
  type CreateAnimeHeroSlideInput,
  type PublicAnimeHeroSlide,
  type UpdateAnimeHeroSlideInput,
} from "@/lib/anime/schemas";
import { getJson, sendForm, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import { z } from "zod";

/**
 * Every list route nests its array under `slides` rather than returning a bare array, so the
 * schema is the wrapper and the caller unwraps. Matching the backend exactly is cheaper than
 * a helper that has to guess which shape a route uses.
 */
const PublicSlideListSchema = z.object({ slides: PublicAnimeHeroSlideSchema.array() }).strip();
const AdminSlideListSchema = z.object({ slides: AdminAnimeHeroSlideSchema.array() }).strip();

/**
 * `GET /anime/hero-slides` — PUBLIC, no session.
 *
 * Returns only live slides (active and inside their schedule window), already in display
 * order. Called from a server component; `cache: "no-store"` is the caller's to pass, since
 * an admin publishing a slide must not wait out a cache entry.
 */
export async function listActiveAnimeHeroSlides(
  options?: RequestOptions,
): Promise<ActionResponse<PublicAnimeHeroSlide[]>> {
  const result = await getJson("/anime/hero-slides", PublicSlideListSchema, options);
  return result.success ? { success: true, data: result.data.slides } : result;
}

/** `GET /anime/admin/hero-slides` — every slide. Requires `manage_promotions`. */
export async function listAnimeHeroSlidesForAdmin(
  options?: RequestOptions,
): Promise<ActionResponse<AdminAnimeHeroSlide[]>> {
  const result = await getJson("/anime/admin/hero-slides", AdminSlideListSchema, options);
  return result.success ? { success: true, data: result.data.slides } : result;
}

/**
 * `POST /anime/admin/hero-slides` (multipart) — create.
 *
 * ONE ROUND TRIP: the image and the metadata go together, because a slide with no image is
 * not a slide. Booleans are sent as the literal "true"/"false" — multer hands the backend
 * strings, and its schema enumerates those two spellings rather than trusting truthiness.
 *
 * A blank link is an OMITTED part, not an empty string: the backend's schema requires a
 * non-empty path when the key is present, and absent is how "decorative slide" is spelled.
 */
export function createAnimeHeroSlide(
  input: CreateAnimeHeroSlideInput,
  options?: RequestOptions,
): Promise<ActionResponse<AdminAnimeHeroSlide>> {
  const formData = new FormData();
  formData.append("image", input.imageFile);
  formData.append("title", input.title);
  if (input.destinationPath !== null) formData.append("destinationPath", input.destinationPath);
  formData.append("isActive", input.isActive ? "true" : "false");
  if (input.startsAt !== undefined) formData.append("startsAt", input.startsAt);
  if (input.endsAt !== undefined) formData.append("endsAt", input.endsAt);

  return sendForm("/anime/admin/hero-slides", "POST", formData, AdminAnimeHeroSlideSchema, options);
}

/**
 * `PATCH /anime/admin/hero-slides/:slideId` — title, link, schedule, active flag.
 *
 * The body is `.strict()` server-side, so sending `position` or `imageUrl` is a 422 naming
 * the key rather than a silent no-op. Order goes through `reorderAnimeHeroSlides`; the image
 * goes through `replaceAnimeHeroSlideImage`.
 */
export function updateAnimeHeroSlide(
  slideId: string,
  patch: UpdateAnimeHeroSlideInput,
  options?: RequestOptions,
): Promise<ActionResponse<AdminAnimeHeroSlide>> {
  return sendJson(
    `/anime/admin/hero-slides/${encodeURIComponent(slideId)}`,
    "PATCH",
    patch,
    AdminAnimeHeroSlideSchema,
    options,
  );
}

/**
 * `PATCH /anime/admin/hero-slides/:slideId/image` (multipart) — replace in place.
 *
 * ITS OWN ROUTE, separate from the metadata patch. Folding the file into that call would
 * make "leave the image alone" an absent multipart part, which is the ambiguity that quietly
 * clears a column the first time someone submits without re-picking a file.
 *
 * This is also how a SEEDED slide stops pointing at `/dummy/…` and becomes a real uploaded
 * asset, which is the intended way off the seed rows.
 */
export function replaceAnimeHeroSlideImage(
  slideId: string,
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<AdminAnimeHeroSlide>> {
  const formData = new FormData();
  formData.append("image", imageFile);

  return sendForm(
    `/anime/admin/hero-slides/${encodeURIComponent(slideId)}/image`,
    "PATCH",
    formData,
    AdminAnimeHeroSlideSchema,
    options,
  );
}

/**
 * `PATCH /anime/admin/hero-slides/reorder` — sets the WHOLE order at once.
 *
 * `slideIds` must be an exact permutation of every existing slide id; a partial list is a
 * 422, never a partial apply. Sending the whole order is also what makes the write atomic —
 * N per-slide position writes would leave a window where two slides claim one slot.
 */
export async function reorderAnimeHeroSlides(
  slideIds: readonly string[],
  options?: RequestOptions,
): Promise<ActionResponse<AdminAnimeHeroSlide[]>> {
  const result = await sendJson(
    "/anime/admin/hero-slides/reorder",
    "PATCH",
    { slideIds },
    AdminSlideListSchema,
    options,
  );
  return result.success ? { success: true, data: result.data.slides } : result;
}

/** `DELETE /anime/admin/hero-slides/:slideId` — removes the row and its stored image. */
export function deleteAnimeHeroSlide(
  slideId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deletedSlideId: string }>> {
  return sendJson(
    `/anime/admin/hero-slides/${encodeURIComponent(slideId)}`,
    "DELETE",
    undefined,
    z.object({ deletedSlideId: z.string() }).strip(),
    options,
  );
}
