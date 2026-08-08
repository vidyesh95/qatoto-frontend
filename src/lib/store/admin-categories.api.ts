// TRANSPORT: client-query — every call here is made from the admin console island. The
// PUBLIC category reads live in `catalog.api.ts` and are awaited by server components.
//
// `RequestOptions` is threaded anyway so a server component could call one later without
// the signature changing.

import { z } from "zod";

import { sendForm, sendJson, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  AdminStoreCategorySchema,
  CommerceCategoryRequestSchema,
  type AdminStoreCategory,
  type CommerceCategoryRequest,
  type CreateStoreCategoryInput,
  type DecideStoreCategoryRequestInput,
  type SubmitStoreCategoryRequestInput,
  type UpdateStoreCategoryInput,
} from "@/lib/store/admin-categories.schemas";

/**
 * Every route nests its payload under a named key rather than returning a bare value, so the
 * schema is the wrapper and the caller unwraps. Matching the backend exactly here is cheaper
 * than a helper that has to guess which shape a route uses.
 */
const AdminCategoryListSchema = z
  .object({ items: AdminStoreCategorySchema.array(), homeRailLimit: z.number().int() })
  .strip();
const AdminCategorySchema = z.object({ category: AdminStoreCategorySchema }).strip();
const CategoryRequestListSchema = z
  .object({ requests: CommerceCategoryRequestSchema.array() })
  .strip();
const CategoryRequestSchema = z.object({ request: CommerceCategoryRequestSchema }).strip();
const DecideResultSchema = z
  .object({
    request: CommerceCategoryRequestSchema,
    // Null on a rejection. NOT a placeholder row — a rejected request became nothing, and
    // inventing an empty category here would be fabricating a value the server said was
    // absent.
    category: AdminStoreCategorySchema.nullable(),
  })
  .strip();

/** `GET /commerce/admin/categories` — the whole tree, draft and retired included. */
export async function listStoreCategoriesForAdmin(
  options?: RequestOptions,
): Promise<ActionResponse<{ items: AdminStoreCategory[]; homeRailLimit: number }>> {
  return getJson("/commerce/admin/categories", AdminCategoryListSchema, options);
}

/**
 * `POST /commerce/admin/categories` (multipart) — create.
 *
 * ONE ROUND TRIP for the metadata and any image. Multer hands the backend STRINGS, which is
 * why `searchSynonyms` travels as a comma-joined value and not as JSON: agreeing to parse
 * JSON out of an untrusted multipart part is how you end up with a JSON parser on a file
 * upload route. An absent `parentCategoryId` part and an empty one both mean "a root".
 */
export function createStoreCategory(
  input: CreateStoreCategoryInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ category: AdminStoreCategory }>> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("slug", input.slug);
  formData.append("state", input.state);
  formData.append("parentCategoryId", input.parentCategoryId ?? "");
  formData.append("searchSynonyms", input.searchSynonyms.join(","));
  if (input.imageFile !== null) formData.append("image", input.imageFile);

  return sendForm("/commerce/admin/categories", "POST", formData, AdminCategorySchema, options);
}

/**
 * `PATCH /commerce/admin/categories/:categoryId` — name, parent, synonyms, state.
 *
 * The body is `.strict()` server-side, so sending `siblingOrder` or `imageUrl` is a 422
 * naming the key rather than a silent no-op. Order goes through `reorderStoreCategories`;
 * the image goes through `replaceStoreCategoryImage`.
 */
export function updateStoreCategory(
  categoryId: string,
  patch: UpdateStoreCategoryInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ category: AdminStoreCategory }>> {
  return sendJson(
    `/commerce/admin/categories/${encodeURIComponent(categoryId)}`,
    "PATCH",
    patch,
    AdminCategorySchema,
    options,
  );
}

/**
 * `PATCH /commerce/admin/categories/:categoryId/image` (multipart) — replace in place.
 *
 * ITS OWN ROUTE, separate from the metadata patch. Folding the file into that call would
 * make "leave the image alone" an absent multipart part, which is the ambiguity that quietly
 * clears a column the first time someone submits without re-picking a file.
 */
export function replaceStoreCategoryImage(
  categoryId: string,
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<{ category: AdminStoreCategory }>> {
  const formData = new FormData();
  formData.append("image", imageFile);

  return sendForm(
    `/commerce/admin/categories/${encodeURIComponent(categoryId)}/image`,
    "PATCH",
    formData,
    AdminCategorySchema,
    options,
  );
}

/**
 * `PATCH /commerce/admin/categories/reorder` — sets one parent's WHOLE order at once.
 *
 * `categoryIds` must be an exact permutation of every category under that parent; a partial
 * list is a 422, never a partial apply. Sending the whole order is also what makes the write
 * atomic — N per-row writes would leave a window where two siblings claim one slot, and that
 * slot is protected by a UNIQUE index.
 */
export async function reorderStoreCategories(
  parentCategoryId: string | null,
  categoryIds: readonly string[],
  options?: RequestOptions,
): Promise<ActionResponse<AdminStoreCategory[]>> {
  const result = await sendJson(
    "/commerce/admin/categories/reorder",
    "PATCH",
    { parentCategoryId, categoryIds },
    z.object({ items: AdminStoreCategorySchema.array() }).strip(),
    options,
  );
  return result.success ? { success: true, data: result.data.items } : result;
}

/**
 * `POST /commerce/admin/categories/:categoryId/retire` — out of browse, reversibly.
 *
 * There is deliberately no delete. `product.categoryId` is `ON DELETE RESTRICT` and the
 * demand snapshots cascade, so removal would either fail or take history with it. A 409 here
 * names the count still blocking it — listings to move, or sub-categories to retire first.
 */
export function retireStoreCategory(
  categoryId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ category: AdminStoreCategory }>> {
  return sendJson(
    `/commerce/admin/categories/${encodeURIComponent(categoryId)}/retire`,
    "POST",
    undefined,
    AdminCategorySchema,
    options,
  );
}

/** `GET /commerce/admin/category-requests` — the moderation queue. */
export async function listStoreCategoryRequestsForAdmin(
  filter: { readonly state?: "pending" | "approved" | "rejected" } = {},
  options?: RequestOptions,
): Promise<ActionResponse<CommerceCategoryRequest[]>> {
  const query = filter.state === undefined ? "" : `?state=${encodeURIComponent(filter.state)}`;
  const result = await getJson(
    `/commerce/admin/category-requests${query}`,
    CategoryRequestListSchema,
    options,
  );
  return result.success ? { success: true, data: result.data.requests } : result;
}

/**
 * `POST /commerce/admin/category-requests/:requestId/decide` — the verdict.
 *
 * TERMINAL. Deciding an already-decided request answers 409 naming the state it holds — that
 * is another moderator having got there first, which is a finding to surface and not an
 * action to retry.
 */
export function decideStoreCategoryRequest(
  requestId: string,
  input: DecideStoreCategoryRequestInput,
  options?: RequestOptions,
): Promise<
  ActionResponse<{ request: CommerceCategoryRequest; category: AdminStoreCategory | null }>
> {
  return sendJson(
    `/commerce/admin/category-requests/${encodeURIComponent(requestId)}/decide`,
    "POST",
    input,
    DecideResultSchema,
    options,
  );
}

/**
 * `POST /commerce/category-requests` — a SELLER asks for a category that does not exist.
 *
 * The only non-staff write in this file. It mints nothing: the listing publishes immediately
 * and parks in `misc` until a moderator decides.
 */
export function submitStoreCategoryRequest(
  input: SubmitStoreCategoryRequestInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ request: CommerceCategoryRequest }>> {
  return sendJson("/commerce/category-requests", "POST", input, CategoryRequestSchema, options);
}

/** `GET /commerce/category-requests/mine` — what this seller asked for, and how it went. */
export async function listOwnStoreCategoryRequests(
  options?: RequestOptions,
): Promise<ActionResponse<CommerceCategoryRequest[]>> {
  const result = await getJson(
    "/commerce/category-requests/mine",
    CategoryRequestListSchema,
    options,
  );
  return result.success ? { success: true, data: result.data.requests } : result;
}
