// TRANSPORT: client-query — React Query over `@/lib/promo/api`. Every hook here is called by
// `PromotionalSlideAdminPage`; the home carousel deliberately has NO hook, because it reads
// the public route from a server component.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrap } from "@/lib/http";
import {
  createPromotionalSlide,
  deletePromotionalSlide,
  listPromotionalSlidesForAdmin,
  reorderPromotionalSlides,
  replacePromotionalSlideImage,
  updatePromotionalSlide,
} from "@/lib/promo/api";
import type { CreatePromotionalSlideInput, UpdatePromotionalSlideInput } from "@/lib/promo/schemas";

/**
 * Its own key factory rather than an entry in `rndKeys`, which scopes itself to the R&D
 * domain in its own doc comment. Same arrangement as `productKeys`.
 */
export const promotionalSlideKeys = {
  all: ["promotional-slides"] as const,
  adminList: () => ["promotional-slides", "admin", "list"] as const,
};

/**
 * Every slide, retired and scheduled included. Requires `manage_promotions`.
 *
 * `isEnabled` exists so opening the page fires nothing for a staff member without the
 * capability: a speculative call would burn a 403 for every moderator who lands here, and
 * the page already knows the answer from `whoami`.
 *
 * `retry: false` because a 403 is an answer, not a flake.
 */
export function useAdminPromotionalSlidesQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: promotionalSlideKeys.adminList(),
    queryFn: async () => unwrap(await listPromotionalSlidesForAdmin()),
    enabled: isEnabled,
    retry: false,
  });
}

/** Creates a slide from an uploaded file plus its metadata, in one multipart call. */
export function useCreatePromotionalSlideMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePromotionalSlideInput) =>
      unwrap(await createPromotionalSlide(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionalSlideKeys.adminList() });
    },
  });
}

/**
 * Alt text, destination, schedule and the active toggle all ride this one mutation.
 *
 * The toggle deliberately does NOT get its own hook: one control deserves one hook, and a
 * second one wrapping the same route is how an uncalled hook appears.
 */
export function useUpdatePromotionalSlideMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slideId: string; patch: UpdatePromotionalSlideInput }) =>
      unwrap(await updatePromotionalSlide(input.slideId, input.patch)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionalSlideKeys.adminList() });
    },
  });
}

/** Replaces the image in place. The returned URL carries a fresh CDN version segment. */
export function useReplacePromotionalSlideImageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slideId: string; imageFile: File }) =>
      unwrap(await replacePromotionalSlideImage(input.slideId, input.imageFile)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionalSlideKeys.adminList() });
    },
  });
}

/**
 * Sets the whole display order.
 *
 * NOT OPTIMISTIC, and that matters more here than elsewhere: the list re-renders from the
 * server's answer, so what the admin sees after a reorder is exactly what the front page
 * will serve. An optimistic reorder that failed would leave the console disagreeing with
 * the live site.
 */
export function useReorderPromotionalSlidesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slideIds: readonly string[]) =>
      unwrap(await reorderPromotionalSlides(slideIds)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionalSlideKeys.adminList() });
    },
  });
}

/** Deletes the slide and its stored image, then re-packs the remaining positions. */
export function useDeletePromotionalSlideMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slideId: string) => unwrap(await deletePromotionalSlide(slideId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionalSlideKeys.adminList() });
    },
  });
}
