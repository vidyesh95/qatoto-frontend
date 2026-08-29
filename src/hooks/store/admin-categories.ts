// TRANSPORT: client-query — React Query over `@/lib/store/admin-categories.api`. Every hook
// here is called by `StoreCategoryAdminPage` or by the studio's category-request island; the
// storefront's own category reads deliberately have NO hook, because they are awaited by
// server components in `catalog.api.ts`.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrap } from "@/lib/http";
import {
  createCategoryAttribute,
  createStoreCategory,
  decideStoreCategoryRequest,
  listCategoryAttributesForAdmin,
  listStoreCategoriesForAdmin,
  listStoreCategoryRequestsForAdmin,
  reorderStoreCategories,
  replaceStoreCategoryImage,
  retireStoreCategory,
  submitStoreCategoryRequest,
  updateCategoryAttribute,
  updateStoreCategory,
} from "@/lib/store/admin-categories.api";
import type {
  CreateCategoryAttributeInput,
  CreateStoreCategoryInput,
  DecideStoreCategoryRequestInput,
  SubmitStoreCategoryRequestInput,
  UpdateCategoryAttributeInput,
  UpdateStoreCategoryInput,
} from "@/lib/store/admin-categories.schemas";

/**
 * Its own key factory rather than an entry in `rndKeys`, which scopes itself to the R&D
 * domain in its own doc comment. Same arrangement as `promotionalSlideKeys`.
 *
 * The tree and the queue are SEPARATE keys because they invalidate together in only one
 * direction: deciding a request changes both, but renaming a category changes only the tree.
 */
export const storeCategoryKeys = {
  all: ["store-categories"] as const,
  adminList: () => ["store-categories", "admin", "list"] as const,
  adminRequests: (state?: string) =>
    ["store-categories", "admin", "requests", state ?? "all"] as const,
  /** Per category, because the resolved set differs for every node in the tree. */
  adminAttributes: (categoryId: string) =>
    ["store-categories", "admin", "attributes", categoryId] as const,
};

/**
 * The whole tree, draft and retired included. Requires `moderate_commerce`.
 *
 * `isEnabled` exists so opening the page fires nothing for a staff member without the
 * capability: a speculative call would burn a 403 for every auditor who lands here, and the
 * page already knows the answer from `whoami`.
 *
 * `retry: false` because a 403 is an answer, not a flake.
 */
export function useAdminStoreCategoriesQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: storeCategoryKeys.adminList(),
    queryFn: async () => unwrap(await listStoreCategoriesForAdmin()),
    enabled: isEnabled,
    retry: false,
  });
}

/** The seller-request moderation queue. Same gating and the same reason. */
export function useAdminStoreCategoryRequestsQuery(
  isEnabled: boolean,
  state?: "pending" | "approved" | "rejected",
) {
  return useQuery({
    queryKey: storeCategoryKeys.adminRequests(state),
    queryFn: async () => unwrap(await listStoreCategoryRequestsForAdmin({ state })),
    enabled: isEnabled,
    retry: false,
  });
}

/** Creates a category from its metadata plus an optional image, in one multipart call. */
export function useCreateStoreCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStoreCategoryInput) => unwrap(await createStoreCategory(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.adminList() });
    },
  });
}

/**
 * Name, parent, synonyms and the state select all ride this one mutation.
 *
 * The state select deliberately does NOT get its own hook: one control deserves one hook,
 * and a second one wrapping the same route is how an uncalled hook appears.
 */
export function useUpdateStoreCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { categoryId: string; patch: UpdateStoreCategoryInput }) =>
      unwrap(await updateStoreCategory(input.categoryId, input.patch)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.adminList() });
    },
  });
}

/** Replaces a category's tile art in place, at its deterministic Cloudinary public id. */
export function useReplaceStoreCategoryImageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { categoryId: string; imageFile: File }) =>
      unwrap(await replaceStoreCategoryImage(input.categoryId, input.imageFile)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.adminList() });
    },
  });
}

/**
 * Rewrites one parent's whole sibling order.
 *
 * NOTHING OPTIMISTIC. The order is protected by a UNIQUE index and the server rewrites it in
 * two passes; guessing the outcome locally would show an arrangement that may not be the one
 * that landed.
 */
export function useReorderStoreCategoriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      parentCategoryId: string | null;
      categoryIds: readonly string[];
    }) => unwrap(await reorderStoreCategories(input.parentCategoryId, input.categoryIds)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.adminList() });
    },
  });
}

/**
 * Takes a category out of browse. NOT a delete — there is no delete route.
 *
 * A 409 here is a FINDING, not a retry: it names how many listings or sub-categories are
 * still blocking, and that count is what the moderator acts on next.
 */
export function useRetireStoreCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => unwrap(await retireStoreCategory(categoryId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.adminList() });
    },
  });
}

/**
 * The verdict on a seller request.
 *
 * Invalidates BOTH keys, and that is not belt-and-braces: approving mints a category and
 * moves listings into it, so the tree is as stale as the queue afterwards.
 */
export function useDecideStoreCategoryRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; input: DecideStoreCategoryRequestInput }) =>
      unwrap(await decideStoreCategoryRequest(input.requestId, input.input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.all });
    },
  });
}

/**
 * A SELLER asking for a category that does not exist yet.
 *
 * Lives here beside the moderation hooks rather than in a studio-only module because it
 * writes the same table the queue reads, and splitting them would put one half of a contract
 * where nobody looking at the other half would find it.
 */
export function useSubmitStoreCategoryRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitStoreCategoryRequestInput) =>
      unwrap(await submitStoreCategoryRequest(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCategoryKeys.all });
    },
  });
}

/**
 * The resolved attribute set for one category. Requires `moderate_commerce`.
 *
 * `isEnabled` is false until the admin opens the panel, so a page of forty categories fires forty
 * reads only if somebody opens forty panels. `retry: false` for the same reason as its siblings: a
 * 403 is an answer, not a flake.
 */
export function useAdminCategoryAttributesQuery(categoryId: string, isEnabled: boolean) {
  return useQuery({
    queryKey: storeCategoryKeys.adminAttributes(categoryId),
    queryFn: async () => unwrap(await listCategoryAttributesForAdmin(categoryId)),
    enabled: isEnabled,
    retry: false,
  });
}

export function useCreateCategoryAttributeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { categoryId: string; input: CreateCategoryAttributeInput }) =>
      unwrap(await createCategoryAttribute(input.categoryId, input.input)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: storeCategoryKeys.adminAttributes(variables.categoryId),
      });
    },
  });
}

/**
 * Edit a definition's presentation and flags.
 *
 * ⚠️ INVALIDATES EVERY ATTRIBUTE KEY, not just this category's, and the breadth is the point: an
 * attribute is INHERITED, so editing one on a parent changes the resolved set of every descendant
 * whose panel may also be open. Narrowing this to the owning category would leave a child showing
 * the old label.
 */
export function useUpdateCategoryAttributeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { attributeId: string; patch: UpdateCategoryAttributeInput }) =>
      unwrap(await updateCategoryAttribute(input.attributeId, input.patch)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["store-categories", "admin", "attributes"],
      });
    },
  });
}
