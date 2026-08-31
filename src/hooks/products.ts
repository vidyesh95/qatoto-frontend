"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/lib/http";
import type { ProductDocumentKind } from "@/lib/store/products.schemas";
import {
  createProduct,
  deleteProductDocument,
  uploadProductDocument,
  deleteProduct,
  deleteProductImage,
  reorderProductImages,
  getMyProducts,
  getProduct,
  publishProduct,
  updateProduct,
  uploadProductImage,
  replaceProductAttributeValues,
  replaceProductRelations,
  replaceProductCustomizationOptions,
  replaceProductVariants,
  replaceProductHighlights,
  uploadProductHighlightImage,
} from "@/lib/products/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import type {
  CreateProductInput,
  ProductAttributeValueInput,
  ProductHighlightInput,
  ProductCustomizationOptionInput,
  ProductVariantInput,
  ProductRelationInput,
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
  /** STORE §21.3. One POST per attached PDF, after the listing exists. */
  | { phase: "documents"; current: number; total: number }
  | { phase: "publishing" }
  | { phase: "done" };

/** STORE §21.3. A file the seller picked but that has not been uploaded yet. */
export interface PendingProductDocument {
  readonly file: File;
  readonly documentKind: ProductDocumentKind;
}

interface CreateListingVariables {
  input: CreateProductInput;
  imageFiles: File[];
  /** The long-form body. Saved after the listing exists — see `saveProductHighlights`. */
  highlights: readonly ProductHighlightInput[];
  highlightImageFileByIndex: ReadonlyMap<number, File>;
  /** STORE §20. Structured answers, saved through their own route after the listing exists. */
  attributeValues: readonly ProductAttributeValueInput[];
  /** STORE §21.3. PDFs picked in the wizard, uploaded once the listing has an id. */
  newDocuments: readonly PendingProductDocument[];
  /** A1. The variant set, saved through its own replace-set route after the listing exists. */
  variants: readonly ProductVariantInput[];
  /** A18. The customization slots, same shape and same route timing as the variants above. */
  customizationOptions: readonly ProductCustomizationOptionInput[];
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
/**
 * STORE §21.3. Uploads the PDFs a seller attached, and removes the ones they took away.
 *
 * SIMPLER THAN `saveProductHighlights` ON PURPOSE. A highlight needs a server-minted id before its
 * image can go anywhere, so that one is a two-phase dance. A document's identity is its own content
 * hash, so this is the images loop: delete what was removed, then post what is new.
 *
 * ⚠️ REMOVALS FIRST. The listing is capped at five documents, so replacing a file when already at
 * the cap only works if the old one goes first — the other order refuses with the seller's own
 * change half-applied.
 */
async function saveProductDocuments(
  productId: string,
  removedDocumentIds: readonly string[],
  newDocuments: readonly PendingProductDocument[],
  onProgress?: (progress: SaveProgress) => void,
): Promise<void> {
  for (const documentId of removedDocumentIds) {
    unwrap(await deleteProductDocument(productId, documentId));
  }

  for (let documentIndex = 0; documentIndex < newDocuments.length; documentIndex++) {
    const pending = newDocuments[documentIndex];
    onProgress?.({
      phase: "documents",
      current: documentIndex + 1,
      total: newDocuments.length,
    });
    unwrap(await uploadProductDocument(productId, pending.file, pending.documentKind));
  }
}

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
      attributeValues,
      newDocuments,
      variants,
      customizationOptions,
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

      // AFTER the listing exists: the backend validates each answer against the resolved
      // attribute set of the product's category, which it cannot look up before there is one.
      if (attributeValues.length > 0) {
        unwrap(await replaceProductAttributeValues(created.id, attributeValues));
      }

      // STORE §21.3. Nothing to remove on a fresh listing, so only the uploads run.
      if (newDocuments.length > 0) {
        await saveProductDocuments(created.id, [], newDocuments, onProgress);
      }

      // A1. AFTER the listing exists, because the route is keyed on its id. Skipped when empty on a
      // FRESH listing only — there is nothing to retire yet, so the call would be a no-op.
      if (variants.length > 0) {
        unwrap(await replaceProductVariants(created.id, variants));
      }

      // A18. Same rule as variants immediately above: keyed on the listing id, and skipped when
      // empty on a FRESH listing only, because there is no slot to retire yet.
      if (customizationOptions.length > 0) {
        unwrap(await replaceProductCustomizationOptions(created.id, customizationOptions));
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
  /**
   * The ids of the images the seller is KEEPING, in the order they should appear — index 0 is the
   * cover. Empty means "the seller did not reorder anything", which is NOT the same as "no images"
   * and is why this is a separate signal rather than being inferred from length.
   *
   * ⚠️ These are the EXISTING ids only. Images uploaded in this same save have no id until the
   * upload answers, so the mutation appends those itself — see the reorder phase below.
   */
  keptImageIdsInOrder: readonly string[];
  /**
   * The seller's OWN relations. Curated and derived rows are excluded by the caller — resending a
   * curated edge is a 409, see the api file.
   */
  relations: readonly ProductRelationInput[];
  highlights: readonly ProductHighlightInput[];
  highlightImageFileByIndex: ReadonlyMap<number, File>;
  attributeValues: readonly ProductAttributeValueInput[];
  /** STORE §21.3. Newly picked PDFs, and the ids of ones the seller removed. */
  newDocuments: readonly PendingProductDocument[];
  removedDocumentIds: readonly string[];
  /** A1. The variants the seller is KEEPING. Anything absent is retired — see the call site. */
  variants: readonly ProductVariantInput[];
  /** A18. The slots the seller is KEEPING. Anything absent is retired — see the call site. */
  customizationOptions: readonly ProductCustomizationOptionInput[];
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
      keptImageIdsInOrder,
      relations,
      highlights,
      highlightImageFileByIndex,
      attributeValues,
      newDocuments,
      removedDocumentIds,
      variants,
      customizationOptions,
      publish,
      onProgress,
    }: UpdateListingVariables) => {
      onProgress?.({ phase: "creating" });
      unwrap(await updateProduct(productId, patch));

      for (const imageId of removedImageIds) {
        unwrap(await deleteProductImage(productId, imageId));
      }

      // The uploaded ids are CAPTURED rather than discarded, because the reorder below needs an
      // exact cover of the gallery and a freshly uploaded image has no id until this answers.
      const uploadedImageIds: string[] = [];
      for (let imageIndex = 0; imageIndex < newImageFiles.length; imageIndex++) {
        onProgress?.({ phase: "uploading", current: imageIndex + 1, total: newImageFiles.length });
        const uploadedImage = unwrap(
          await uploadProductImage(productId, newImageFiles[imageIndex]),
        );
        uploadedImageIds.push(uploadedImage.id);
      }

      /**
       * A THIRD PHASE, AFTER THE DELETES AND THE UPLOADS, and it can only run here.
       *
       * ⚠️ The route demands an EXACT COVER of the listing's images, so the set has to include the
       * ones uploaded a moment ago — whose ids did not exist when the seller pressed save. Sending
       * only the pre-existing ids is `IMAGE_ORDER_MISMATCH` (422).
       *
       * ⚠️ SENT ONLY WHEN THE SELLER ACTUALLY MOVED SOMETHING. `keptImageIdsInOrder` is empty on an
       * ordinary save, and an unconditional call would write a new order on every edit for nothing.
       * New uploads alone need no call either: the upload loop appends in array order, so the
       * positions already come out right.
       *
       * Uploads go LAST because that is where the server just put them, so an untouched gallery
       * plus a new photo needs no reordering at all.
       */
      if (keptImageIdsInOrder.length > 0) {
        unwrap(
          await reorderProductImages(productId, [...keptImageIdsInOrder, ...uploadedImageIds]),
        );
      }

      // ALWAYS sent on an edit, even when empty — this is a replace-set, so "no blocks" is a real
      // instruction (the seller deleted them) and skipping the call would silently keep them.
      await saveProductHighlights(productId, highlights, highlightImageFileByIndex, onProgress);

      // ALWAYS sent on an edit, even when empty: a replace-set's "no answers" is the seller
      // having cleared them, and skipping the call would silently keep the old ones.
      unwrap(await replaceProductAttributeValues(productId, attributeValues));

      /**
       * ALWAYS sent on an edit too, for the same reason — an empty list is the seller having
       * removed their declarations, and skipping the call would silently keep them.
       *
       * ⚠️ Its own idempotency key: this route is the only replace-set here that REQUIRES one, and
       * a key shared with another write in this sequence would make it a replay.
       */
      unwrap(
        await replaceProductRelations(productId, relations, {
          headers: { "Idempotency-Key": newIdempotencyKey() },
        }),
      );

      /**
       * STORE §21.3. NOT a replace-set, unlike the two calls above — documents are append/delete,
       * so an empty pair is genuinely nothing to do and the guard is real rather than a shortcut.
       */
      if (removedDocumentIds.length > 0 || newDocuments.length > 0) {
        await saveProductDocuments(productId, removedDocumentIds, newDocuments, onProgress);
      }

      /**
       * A1. ALWAYS sent on an edit, like the two replace-sets above — but the consequence of
       * getting it wrong is heavier here. Omitting a variant RETIRES it, so this must carry every
       * variant the seller is keeping, not just the ones they touched. A retired variant is not
       * deleted: order lines bought under it still name it.
       */
      unwrap(await replaceProductVariants(productId, variants));

      /**
       * A18. ALWAYS sent on an edit, for the same reason and with the same weight. Omitting a slot
       * RETIRES it, so this must carry every slot the seller is keeping. Retirement is reversible
       * here — re-sending the `slotKey` reactivates the same row — which makes it a softer failure
       * than the variant case, not a safe one.
       */
      unwrap(await replaceProductCustomizationOptions(productId, customizationOptions));

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
