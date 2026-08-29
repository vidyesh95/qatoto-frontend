"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/lib/http";
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getMyProducts,
  getProduct,
  publishProduct,
  updateProduct,
  uploadProductImage,
  replaceProductHighlights,
  uploadProductHighlightImage,
} from "@/lib/products/api";
import type {
  CreateProductInput,
  ProductHighlightInput,
  UpdateProductInput,
} from "@/lib/products/schemas";

/** Query key factory — one place so invalidation can't drift. */
export const productKeys = {
  all: ["products"] as const,
  mine: (page: number) => ["products", "mine", page] as const,
  detail: (productId: string) => ["products", "detail", productId] as const,
};

// `ApiRequestError` and `unwrap` moved to `@/lib/http` so the research-and-
// development hooks can share them without importing from a products module.
// Re-exported here because existing consumers import them from this path.
export { ApiRequestError } from "@/lib/http";

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
  /** The highlight blocks: one PUT for the plan, then one upload per block that has an image. */
  | { phase: "highlights"; current: number; total: number }
  | { phase: "publishing" }
  | { phase: "done" };

interface CreateListingVariables {
  input: CreateProductInput;
  imageFiles: File[];
  /** The long-form body. Saved after the listing exists — see `saveProductHighlights`. */
  highlights: readonly ProductHighlightInput[];
  highlightImageFileByIndex: ReadonlyMap<number, File>;
  publish: boolean;
  onProgress?: (progress: SaveProgress) => void;
}

/**
 * Save the long-form body: the plan first, then one image upload per block that has a new file.
 *
 * TWO PHASES BECAUSE THE IMAGE IS KEYED ON A ROW THAT MUST EXIST FIRST. `PUT …/highlights` answers
 * the whole product, so the server-generated ids come back in the same round trip and the uploads
 * below can be addressed. This mirrors the image flow the wizard already runs for the gallery.
 *
 * ⚠️ THE ORDER OF `highlights` IS THE ORDER ON THE PAGE, and `imageFileByIndex` is keyed on that
 * same index rather than on an id — a newly added block has no id until the PUT returns.
 */
async function saveProductHighlights(
  productId: string,
  highlights: readonly ProductHighlightInput[],
  imageFileByIndex: ReadonlyMap<number, File>,
  onProgress?: (progress: SaveProgress) => void,
): Promise<void> {
  onProgress?.({ phase: "highlights", current: 0, total: imageFileByIndex.size });
  const saved = unwrap(await replaceProductHighlights(productId, highlights));

  const savedByPosition = saved.highlights.toSorted(
    (first, second) => first.position - second.position,
  );
  let uploadedCount = 0;
  for (const [highlightIndex, imageFile] of imageFileByIndex) {
    const savedHighlight = savedByPosition[highlightIndex];
    // A block whose row is missing means the plan and the response disagree about length, which
    // the server decides. Skipping is right: inventing an id would upload against someone else's
    // block, and the service would refuse it anyway.
    if (savedHighlight === undefined) continue;
    uploadedCount += 1;
    onProgress?.({ phase: "highlights", current: uploadedCount, total: imageFileByIndex.size });
    unwrap(await uploadProductHighlightImage(productId, savedHighlight.id, imageFile));
  }
}

export function useCreateListingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      imageFiles,
      highlights,
      highlightImageFileByIndex,
      publish,
      onProgress,
    }: CreateListingVariables) => {
      onProgress?.({ phase: "creating" });
      const created = unwrap(await createProduct(input));

      for (let imageIndex = 0; imageIndex < imageFiles.length; imageIndex++) {
        onProgress?.({ phase: "uploading", current: imageIndex + 1, total: imageFiles.length });
        unwrap(await uploadProductImage(created.id, imageFiles[imageIndex]));
      }

      // AFTER the gallery, BEFORE publish: the publish gate re-derives completeness from the row,
      // so anything that should count towards it has to be saved first.
      if (highlights.length > 0) {
        await saveProductHighlights(created.id, highlights, highlightImageFileByIndex, onProgress);
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
  highlights: readonly ProductHighlightInput[];
  highlightImageFileByIndex: ReadonlyMap<number, File>;
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
      highlights,
      highlightImageFileByIndex,
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

      // ALWAYS sent on an edit, even when empty — this is a replace-set, so "no blocks" is a real
      // instruction (the seller deleted them) and skipping the call would silently keep them.
      await saveProductHighlights(productId, highlights, highlightImageFileByIndex, onProgress);

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
