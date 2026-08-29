import {
  getJson,
  getPaginated,
  sendForm,
  sendJson,
  type ActionResponse,
  type PaginationMeta,
} from "@/lib/http";
import {
  PaginationMetaSchema,
  ProductImageSchema,
  ProductListRowSchema,
  PublicProductSchema,
  type CreateProductInput,
  type ProductAttributeValueInput,
  type ProductHighlightInput,
  type ProductImage,
  type ProductListRow,
  type PublicProduct,
  type UpdateProductInput,
} from "@/lib/products/schemas";
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
