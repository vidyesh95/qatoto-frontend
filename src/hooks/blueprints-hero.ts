// TRANSPORT: client-query — React Query over `@/lib/blueprints/hero.api`. Every hook here is
// called by `BlueprintHeroSlideAdminPage`; the /blueprints carousel deliberately has NO hook, because
// it reads the public route from a server component.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBlueprintHeroSlide,
  deleteBlueprintHeroSlide,
  listBlueprintHeroSlidesForAdmin,
  reorderBlueprintHeroSlides,
  replaceBlueprintHeroSlideImage,
  updateBlueprintHeroSlide,
} from "@/lib/blueprints/hero.api";
import type {
  CreateBlueprintHeroSlideInput,
  UpdateBlueprintHeroSlideInput,
} from "@/lib/blueprints/hero.schemas";
import { unwrap } from "@/lib/http";

/**
 * Its own key factory rather than an entry in `rndKeys`, which scopes itself to the R&D
 * domain in its own doc comment. Same arrangement as `promotionalSlideKeys`.
 */
export const blueprintHeroSlideKeys = {
  all: ["blueprint-hero-slides"] as const,
  adminList: () => ["blueprint-hero-slides", "admin", "list"] as const,
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
export function useAdminBlueprintHeroSlidesQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: blueprintHeroSlideKeys.adminList(),
    queryFn: async () => unwrap(await listBlueprintHeroSlidesForAdmin()),
    enabled: isEnabled,
    retry: false,
  });
}

/** Creates a slide from an uploaded file plus its metadata, in one multipart call. */
export function useCreateBlueprintHeroSlideMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBlueprintHeroSlideInput) =>
      unwrap(await createBlueprintHeroSlide(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintHeroSlideKeys.adminList() });
    },
  });
}

/**
 * Title, link, schedule and the active toggle all ride this one mutation.
 *
 * The toggle deliberately does NOT get its own hook: one control deserves one hook, and a
 * second one wrapping the same route is how an uncalled hook appears.
 */
export function useUpdateBlueprintHeroSlideMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slideId: string; patch: UpdateBlueprintHeroSlideInput }) =>
      unwrap(await updateBlueprintHeroSlide(input.slideId, input.patch)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintHeroSlideKeys.adminList() });
    },
  });
}

/** Replaces the image in place. The returned URL carries a fresh CDN version segment. */
export function useReplaceBlueprintHeroSlideImageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { slideId: string; imageFile: File }) =>
      unwrap(await replaceBlueprintHeroSlideImage(input.slideId, input.imageFile)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintHeroSlideKeys.adminList() });
    },
  });
}

/**
 * Sets the whole display order.
 *
 * NOT OPTIMISTIC, and that matters more here than elsewhere: the list re-renders from the
 * server's answer, so what the admin sees after a reorder is exactly what /blueprints will serve.
 * An optimistic reorder that failed would leave the console disagreeing with the live site.
 */
export function useReorderBlueprintHeroSlidesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slideIds: readonly string[]) =>
      unwrap(await reorderBlueprintHeroSlides(slideIds)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintHeroSlideKeys.adminList() });
    },
  });
}

/** Deletes the slide and its stored image, then re-packs the remaining positions. */
export function useDeleteBlueprintHeroSlideMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slideId: string) => unwrap(await deleteBlueprintHeroSlide(slideId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blueprintHeroSlideKeys.adminList() });
    },
  });
}
