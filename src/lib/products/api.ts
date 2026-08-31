import {
  getJson,
  getPaginated,
  sendForm,
  sendJson,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  PaginationMetaSchema,
  ProductImageSchema,
  ProductListRowSchema,
  PublicProductSchema,
  SellerProductDocumentSchema,
  SellerProductRelationSchema,
  type CreateProductInput,
  type ProductAttributeValueInput,
  type ProductHighlightInput,
  type ProductImage,
  type ProductRelationInput,
  type SellerProductRelation,
  type ProductListRow,
  type ProductCustomizationOptionInput,
  type ProductVariantInput,
  type PublicProduct,
  type SellerProductDocument,
  type UpdateProductInput,
} from "@/lib/products/schemas";
import type { ProductDocumentKind } from "@/lib/store/products.schemas";
import { z } from "zod";

/**
 * One function per `/products` route. Each returns the tagged `ActionResponse`;
 * the seller id is server-derived from the session cookie — never sent here.
 */

export function createProduct(input: CreateProductInput): Promise<ActionResponse<PublicProduct>> {
  return sendJson("/products", "POST", input, PublicProductSchema);
}

export function getMyProducts(
  page: number,
  limit: number,
): Promise<ActionResponse<{ rows: ProductListRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/products/mine?page=${page}&limit=${limit}`,
    ProductListRowSchema,
    PaginationMetaSchema,
  );
}

export function getProduct(productId: string): Promise<ActionResponse<PublicProduct>> {
  return getJson(`/products/${productId}`, PublicProductSchema);
}

export function updateProduct(
  productId: string,
  patch: UpdateProductInput,
): Promise<ActionResponse<PublicProduct>> {
  return sendJson(`/products/${productId}`, "PATCH", patch, PublicProductSchema);
}

export function deleteProduct(productId: string): Promise<ActionResponse<unknown>> {
  return sendJson(`/products/${productId}`, "DELETE", undefined, z.unknown());
}

export function uploadProductImage(
  productId: string,
  imageFile: File,
): Promise<ActionResponse<ProductImage>> {
  const formData = new FormData();
  formData.append("image", imageFile);
  return sendForm(`/products/${productId}/images`, "POST", formData, ProductImageSchema);
}

export function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<ActionResponse<unknown>> {
  return sendJson(`/products/${productId}/images/${imageId}`, "DELETE", undefined, z.unknown());
}

/**
 * `PATCH /products/:id/images/reorder` — sets the whole gallery order at once.
 *
 * ⚠️ **`imageIds` MUST BE AN EXACT COVER OF THE LISTING'S IMAGES.** The service refuses anything
 * else with `IMAGE_ORDER_MISMATCH` (422): a missing id, an extra one, or a duplicate. It is not a
 * partial reorder, so it must never be sent from a stale gallery — the same rule
 * `reorderOrganizationMedia` states for seller-profile media.
 *
 * ⚠️ **INDEX 0 IS THE MAIN IMAGE.** This route is therefore also the only way to change a
 * listing's cover photo; there is no separate "set primary" endpoint, and before this wrapper
 * existed a seller could not change the cover at all except by deleting and re-uploading in order.
 *
 * ⚠️ **THE SET HAS TO INCLUDE IMAGES UPLOADED IN THE SAME SAVE**, whose ids do not exist until
 * `uploadProductImage` answers. That is why the caller runs this AFTER the upload loop and builds
 * the list from the ids the server returned rather than from local state — see `src/hooks/products.ts`.
 *
 * No `Idempotency-Key`: the route does not require one, and re-sending the same order is the same
 * order.
 */
export function reorderProductImages(
  productId: string,
  imageIds: readonly string[],
): Promise<ActionResponse<PublicProduct>> {
  return sendJson(
    `/products/${productId}/images/reorder`,
    "PATCH",
    { imageIds },
    PublicProductSchema,
  );
}

/**
 * `PUT /products/:id/highlights` — the long-form body, as a REPLACE-SET.
 *
 * Answers the whole `PublicProduct`, which is what makes the two-phase flow work: the response
 * carries the server-generated `id` of every block, and those ids are what the image upload below
 * is keyed on. There is no way to attach an image to a block that has not been saved first.
 *
 * ⚠️ SENDING `[]` CLEARS THE BODY, and its images with it. That is the replace-set's meaning, not
 * a bug — but it is why the wizard must send the blocks it is keeping rather than only the ones
 * it changed.
 */
export function replaceProductHighlights(
  productId: string,
  highlights: readonly ProductHighlightInput[],
): Promise<ActionResponse<PublicProduct>> {
  return sendJson(`/products/${productId}/highlights`, "PUT", { highlights }, PublicProductSchema);
}

/**
 * `POST /products/:id/highlights/:highlightId/image` — multipart, field `image`.
 *
 * The bytes are decoded and RE-ENCODED server-side by sharp, which is why no malware scan sits in
 * front of this the way one sits in front of an uploaded PDF: what lands in storage is sharp's
 * output, not the uploader's file.
 */
/**
 * STORE §21.3. Attaches one public PDF to a listing.
 *
 * ⚠️ THE SERVER ANSWERS 201, NOT 202 — there is no scan, and nothing in this flow may tell a
 * seller their file is "being checked". See migration `0155` for why that is the honest answer.
 *
 * NO IDEMPOTENCY KEY, and that is deliberate rather than forgotten: the storage key is derived
 * from the file's content hash and the row is unique on `(productId, contentSha256)`, so a retried
 * upload converges on the same document instead of duplicating it. Re-sending the same PDF is
 * success, not a conflict.
 */
export function uploadProductDocument(
  productId: string,
  documentFile: File,
  documentKind: ProductDocumentKind,
): Promise<ActionResponse<{ documents: SellerProductDocument[] }>> {
  const formData = new FormData();
  formData.append("document", documentFile);
  formData.append("documentKind", documentKind);
  return sendForm(
    `/products/${productId}/documents`,
    "POST",
    formData,
    z.object({ documents: z.array(SellerProductDocumentSchema) }),
  );
}

/** STORE §21.3. Removes one document. The server deletes the bytes before the row. */
export function deleteProductDocument(
  productId: string,
  documentId: string,
): Promise<ActionResponse<unknown>> {
  return sendJson(
    `/products/${productId}/documents/${documentId}`,
    "DELETE",
    undefined,
    z.unknown(),
  );
}

export function uploadProductHighlightImage(
  productId: string,
  highlightId: string,
  imageFile: File,
): Promise<ActionResponse<PublicProduct>> {
  const formData = new FormData();
  formData.append("image", imageFile);
  return sendForm(
    `/products/${productId}/highlights/${highlightId}/image`,
    "POST",
    formData,
    PublicProductSchema,
  );
}

/**
 * `PUT /products/:id/variants` — the whole variant set, as a REPLACE-SET.
 *
 * ⚠️ THIS ROUTE HAD NO CALLER AT ALL UNTIL NOW. The table, the route, the cart's `VARIANT_REQUIRED`
 * gate, the reservation, the prepare snapshot and the order line all shipped in Phase 8, and no
 * seller surface ever wrote to them — so `variant-picker.tsx` on the buyer page could only render
 * against seeded rows. Same shape as `highlights` above, one feature over.
 *
 * ⚠️ OMITTING A VARIANT RETIRES IT; IT DOES NOT DELETE IT. The upsert is keyed on `publicSlug`, and
 * a variant that has reached an order line cannot be deleted at all — `commerce_order_product_line
 * .variant_id` is `restrict`, because "Sea blue" is part of what someone bought. So sending `[]`
 * retires the lot rather than erasing them, and a caller must send back the ones it is KEEPING.
 *
 * Answers the whole `PublicProduct`, so the caller sees the server's ids, positions and states
 * without a follow-up read.
 */
/**
 * `PUT /products/:id/customization-options` — the whole slot plan, as a REPLACE-SET.
 *
 * ⚠️ THIS ROUTE HAD NO CALLER AT ALL UNTIL NOW. The table, the route, the buyer's slot grid and
 * fill-in sheet, the per-slot minimum enforced at cart and again at prepare — all shipped, and no
 * seller surface ever wrote to them. So the only slots in existence anywhere are seeded rows, which
 * is why `customization-sheet.tsx` could only ever render against the demo chair. Same shape as
 * `variants` above, one feature over.
 *
 * ⚠️ OMITTING A SLOT RETIRES IT; IT DOES NOT DELETE IT. The upsert is keyed on `slotKey`, and all
 * three selection tables — cart line, prepare line, order line — reference the option
 * `onDelete: restrict`, because the packaging a buyer chose is part of what they bought. So sending
 * `[]` retires the lot rather than erasing them, and a caller must send back the ones it is KEEPING.
 * Retirement is at least reversible here: re-sending a retired `slotKey` reactivates the same row.
 *
 * Answers the whole `PublicProduct`, so the caller sees the server's ids, positions and states
 * without a follow-up read — which only became useful once `PublicProductSchema` stopped stripping
 * `customizationOptions`.
 */
export function replaceProductCustomizationOptions(
  productId: string,
  options: readonly ProductCustomizationOptionInput[],
): Promise<ActionResponse<PublicProduct>> {
  return sendJson(
    `/products/${productId}/customization-options`,
    "PUT",
    { options },
    PublicProductSchema,
  );
}

/**
 * `PUT /commerce/products/:productId/relations` — the seller's own related-product declarations.
 *
 * ⚠️ **SEND ONLY `seller_declared` ROWS.** The server replaces that source kind and nothing else —
 * a moderator's curated edge and the derived co-occurrence graph survive a save that omits them,
 * measured live. But the unique index is `(from, to, relationKind)` and does NOT include
 * `sourceKind`, so **re-sending an edge a moderator has curated is a 409**, with the backend's own
 * sentence telling the seller to drop it. Filter before sending.
 *
 * ⚠️ **A DIFFERENT MOUNT AND A REQUIRED KEY.** This lives under `/commerce`, not `/products` like
 * every other replace-set in this file, and it is the only one whose `idempotency` is
 * `required: true` — a keyless call is a 400 rather than an accepted write.
 *
 * `rank` is omitted deliberately: the server falls back to array index, so position IS the order.
 *
 * Answers `{ relations }` for the WHOLE product — curated and derived rows included — not just the
 * ones sent. Do not feed that response straight back into the next save.
 */
export function replaceProductRelations(
  productId: string,
  relations: readonly ProductRelationInput[],
  options?: RequestOptions,
): Promise<ActionResponse<{ relations: SellerProductRelation[] }>> {
  return sendJson(
    `/commerce/products/${productId}/relations`,
    "PUT",
    { relations },
    z.object({ relations: z.array(SellerProductRelationSchema) }).strip(),
    options,
  );
}

export function replaceProductVariants(
  productId: string,
  variants: readonly ProductVariantInput[],
): Promise<ActionResponse<PublicProduct>> {
  return sendJson(`/products/${productId}/variants`, "PUT", { variants }, PublicProductSchema);
}

/**
 * `PUT /products/:id/attributes` — the listing's STRUCTURED answers, as a replace-set.
 *
 * Its own route rather than a field on the create/patch body, because the values are validated
 * against the category's resolved attribute set — which the product's category decides, and which
 * therefore has to be read after the listing exists.
 *
 * ⚠️ SENDING `[]` CLEARS THEM. That is the replace-set's meaning; the free-text `specifications`
 * on the main body are untouched by this call.
 */
export function replaceProductAttributeValues(
  productId: string,
  values: readonly ProductAttributeValueInput[],
): Promise<ActionResponse<unknown>> {
  return sendJson(`/products/${productId}/attributes`, "PUT", { values }, z.unknown());
}

export function publishProduct(productId: string): Promise<ActionResponse<PublicProduct>> {
  return sendJson(`/products/${productId}/publish`, "POST", undefined, PublicProductSchema);
}

export function unpublishProduct(productId: string): Promise<ActionResponse<PublicProduct>> {
  return sendJson(`/products/${productId}/unpublish`, "POST", undefined, PublicProductSchema);
}
