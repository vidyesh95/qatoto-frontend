// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. The home carousel reads the PUBLIC route server-side; the admin console
// reads and writes from a client island.

import { z } from "zod";

import { getJson, sendForm, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  AdminPromotionalSlideSchema,
  PublicPromotionalSlideSchema,
  type AdminPromotionalSlide,
  type CreatePromotionalSlideInput,
  type PublicPromotionalSlide,
  type UpdatePromotionalSlideInput,
} from "@/lib/promo/schemas";

/**
 * Every list route nests its array under `slides` rather than returning a bare array, so the
 * schema is the wrapper and the caller unwraps. Matching the backend exactly here is
 * cheaper than a helper that has to guess which shape a route uses.
 */
const PublicSlideListSchema = z.object({ slides: PublicPromotionalSlideSchema.array() }).strip();
const AdminSlideListSchema = z.object({ slides: AdminPromotionalSlideSchema.array() }).strip();

/**
 * `GET /promotions/slides` — PUBLIC, no session.
 *
 * Returns only live slides (active and inside their schedule window), already in display
 * order. Called from a server component; `cache: "no-store"` is the caller's to pass, since
 * an admin publishing a slide must not wait out a cache entry.
 */
export async function listActivePromotionalSlides(
  options?: RequestOptions,
): Promise<ActionResponse<PublicPromotionalSlide[]>> {
  const result = await getJson("/promotions/slides", PublicSlideListSchema, options);
  return result.success ? { success: true, data: result.data.slides } : result;
}

/** `GET /promotions/admin/slides` — every slide. Requires `manage_promotions`. */
export async function listPromotionalSlidesForAdmin(
  options?: RequestOptions,
): Promise<ActionResponse<AdminPromotionalSlide[]>> {
  const result = await getJson("/promotions/admin/slides", AdminSlideListSchema, options);
  return result.success ? { success: true, data: result.data.slides } : result;
}

/**
 * `POST /promotions/admin/slides` (multipart) — create.
 *
 * ONE ROUND TRIP: the image and the metadata go together, because a slide with no image is
 * not a slide. Booleans are sent as the literal "true"/"false" — multer hands the backend
 * strings, and its schema enumerates those two spellings rather than trusting truthiness.
 */
export function createPromotionalSlide(
  input: CreatePromotionalSlideInput,
  options?: RequestOptions,
): Promise<ActionResponse<AdminPromotionalSlide>> {
  const formData = new FormData();
  formData.append("image", input.imageFile);
  formData.append("altText", input.altText);
  formData.append("destinationKind", input.destinationKind);
  formData.append("destinationValue", input.destinationValue);
  formData.append("isActive", input.isActive ? "true" : "false");
  if (input.startsAt !== undefined) formData.append("startsAt", input.startsAt);
  if (input.endsAt !== undefined) formData.append("endsAt", input.endsAt);

  return sendForm(
    "/promotions/admin/slides",
    "POST",
    formData,
    AdminPromotionalSlideSchema,
    options,
  );
}

/**
 * `PATCH /promotions/admin/slides/:slideId` — alt text, destination, schedule, active flag.
 *
 * The body is `.strict()` server-side, so sending `position` or `imageUrl` is a 422 naming
 * the key rather than a silent no-op. Order goes through `reorderPromotionalSlides`; the
 * image goes through `replacePromotionalSlideImage`.
 */
export function updatePromotionalSlide(
  slideId: string,
  patch: UpdatePromotionalSlideInput,
  options?: RequestOptions,
): Promise<ActionResponse<AdminPromotionalSlide>> {
  return sendJson(
    `/promotions/admin/slides/${encodeURIComponent(slideId)}`,
    "PATCH",
    patch,
    AdminPromotionalSlideSchema,
    options,
  );
}

/**
 * `PATCH /promotions/admin/slides/:slideId/image` (multipart) — replace in place.
 *
 * ITS OWN ROUTE, separate from the metadata patch. Folding the file into that call would
 * make "leave the image alone" an absent multipart part, which is the ambiguity that
 * quietly clears a column the first time someone submits without re-picking a file.
 */
export function replacePromotionalSlideImage(
  slideId: string,
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<AdminPromotionalSlide>> {
  const formData = new FormData();
  formData.append("image", imageFile);

  return sendForm(
    `/promotions/admin/slides/${encodeURIComponent(slideId)}/image`,
    "PATCH",
    formData,
    AdminPromotionalSlideSchema,
    options,
  );
}

/**
 * `PATCH /promotions/admin/slides/reorder` — sets the WHOLE order at once.
 *
 * `slideIds` must be an exact permutation of every existing slide id; a partial list is a
 * 422, never a partial apply. Sending the whole order is also what makes the write atomic —
 * N per-slide position writes would leave a window where two slides claim one slot.
 */
export async function reorderPromotionalSlides(
  slideIds: readonly string[],
  options?: RequestOptions,
): Promise<ActionResponse<AdminPromotionalSlide[]>> {
  const result = await sendJson(
    "/promotions/admin/slides/reorder",
    "PATCH",
    { slideIds },
    AdminSlideListSchema,
    options,
  );
  return result.success ? { success: true, data: result.data.slides } : result;
}

/** `DELETE /promotions/admin/slides/:slideId` — removes the row and its Cloudinary asset. */
export function deletePromotionalSlide(
  slideId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deletedSlideId: string }>> {
  return sendJson(
    `/promotions/admin/slides/${encodeURIComponent(slideId)}`,
    "DELETE",
    undefined,
    z.object({ deletedSlideId: z.string() }).strip(),
    options,
  );
}
