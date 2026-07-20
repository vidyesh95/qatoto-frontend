"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResponse, ApiError } from "@/lib/http";
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getMyProducts,
  getProduct,
  publishProduct,
  updateProduct,
  uploadProductImage,
} from "@/lib/products/api";
import type { CreateProductInput, UpdateProductInput } from "@/lib/products/schemas";

/** Query key factory — one place so invalidation can't drift. */
export const productKeys = {
  all: ["products"] as const,
  mine: (page: number) => ["products", "mine", page] as const,
  detail: (productId: string) => ["products", "detail", productId] as const,
};

/**
 * Error thrown by the mutation flows so React Query's `error` carries the backend
 * envelope (message, code, 422 fieldErrors). UI reads `.apiError`.
 */
export class ApiRequestError extends Error {
  readonly apiError: ApiError;
  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
    this.apiError = apiError;
  }
}

/** Throw on failure so a mutation chain aborts; return data on success. */
function unwrap<T>(result: ActionResponse<T>): T {
  if (!result.success) throw new ApiRequestError(result.error);
  return result.data;
}

const DEFAULT_PAGE_LIMIT = 20;

// --- Queries ----------------------------------------------------------------

export function useMyProductsQuery(page: number = 1) {
  return useQuery({
    queryKey: productKeys.mine(page),
    queryFn: async () => unwrap(await getMyProducts(page, DEFAULT_PAGE_LIMIT)),
  });
}

export function useProductQuery(productId: string | undefined) {
  return useQuery({
    queryKey: productId ? productKeys.detail(productId) : ["products", "detail", "none"],
    queryFn: async () => {
      if (!productId) throw new Error("Missing product id");
      return unwrap(await getProduct(productId));
    },
    enabled: Boolean(productId),
  });
}

// --- Create flow (create → upload each image → optionally publish) -----------

export type SaveProgress =
  | { phase: "idle" }
  | { phase: "creating" }
  | { phase: "uploading"; current: number; total: number }
  | { phase: "publishing" }
  | { phase: "done" };

interface CreateListingVariables {
  input: CreateProductInput;
  imageFiles: File[];
  publish: boolean;
  onProgress?: (progress: SaveProgress) => void;
}

export function useCreateListingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, imageFiles, publish, onProgress }: CreateListingVariables) => {
      onProgress?.({ phase: "creating" });
      const created = unwrap(await createProduct(input));

      for (let imageIndex = 0; imageIndex < imageFiles.length; imageIndex++) {
        onProgress?.({ phase: "uploading", current: imageIndex + 1, total: imageFiles.length });
        unwrap(await uploadProductImage(created.id, imageFiles[imageIndex]));
      }

      if (publish) {
        onProgress?.({ phase: "publishing" });
        const published = unwrap(await publishProduct(created.id));
        onProgress?.({ phase: "done" });
        return published;
      }

      onProgress?.({ phase: "done" });
      return created;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// --- Edit flow (patch fields → delete removed images → upload new → publish) -

interface UpdateListingVariables {
  productId: string;
  patch: UpdateProductInput;
  newImageFiles: File[];
  removedImageIds: string[];
  /** true = ensure the listing ends up active (publish); false = leave as-is. */
  publish: boolean;
  onProgress?: (progress: SaveProgress) => void;
}

export function useUpdateListingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      patch,
      newImageFiles,
      removedImageIds,
      publish,
      onProgress,
    }: UpdateListingVariables) => {
      onProgress?.({ phase: "creating" });
      unwrap(await updateProduct(productId, patch));

      for (const imageId of removedImageIds) {
        unwrap(await deleteProductImage(productId, imageId));
      }

      for (let imageIndex = 0; imageIndex < newImageFiles.length; imageIndex++) {
        onProgress?.({ phase: "uploading", current: imageIndex + 1, total: newImageFiles.length });
        unwrap(await uploadProductImage(productId, newImageFiles[imageIndex]));
      }

      if (publish) {
        onProgress?.({ phase: "publishing" });
        const published = unwrap(await publishProduct(productId));
        onProgress?.({ phase: "done" });
        return published;
      }

      onProgress?.({ phase: "done" });
      return unwrap(await getProduct(productId));
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => unwrap(await deleteProduct(productId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
