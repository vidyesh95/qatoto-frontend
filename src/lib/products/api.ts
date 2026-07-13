import { getJson, getPaginated, sendForm, sendJson, type ActionResponse, type PaginationMeta } from "@/lib/http";
import {
  PaginationMetaSchema,
  ProductImageSchema,
  ProductListRowSchema,
  PublicProductSchema,
  type CreateProductInput,
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

export function publishProduct(productId: string): Promise<ActionResponse<PublicProduct>> {
  return sendJson(`/products/${productId}/publish`, "POST", undefined, PublicProductSchema);
}

export function unpublishProduct(productId: string): Promise<ActionResponse<PublicProduct>> {
  return sendJson(`/products/${productId}/unpublish`, "POST", undefined, PublicProductSchema);
}
