// TRANSPORT: client-query — React Query over `@/lib/spotlight/api`. Every hook here is
// called by `SpotlightAdminPage`; the home rail deliberately has NO hook, because it reads
// the public route from a server component.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrap } from "@/lib/http";
import { listSpotlightSlotsForAdmin, replaceSpotlightSlots } from "@/lib/spotlight/api";
import type { ReplaceSpotlightSlotsInput } from "@/lib/spotlight/schemas";

/**
 * Its own key factory rather than an entry in `rndKeys`, which scopes itself to the R&D
 * domain. Same arrangement as `promotionalSlideKeys`.
 */
export const spotlightSlotKeys = {
  all: ["spotlight-slots"] as const,
  adminList: () => ["spotlight-slots", "admin", "list"] as const,
};

/**
 * Every stored slot. Requires `manage_promotions`.
 *
 * `isEnabled` exists so opening the page fires nothing for a staff member without the
 * capability. `retry: false` because a 403 is an answer, not a flake.
 */
export function useAdminSpotlightSlotsQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: spotlightSlotKeys.adminList(),
    queryFn: async () => unwrap(await listSpotlightSlotsForAdmin()),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Replaces the whole ordered set.
 *
 * NOT OPTIMISTIC — what the admin sees after a save is exactly what the front page will
 * serve.
 */
export function useReplaceSpotlightSlotsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReplaceSpotlightSlotsInput) =>
      unwrap(await replaceSpotlightSlots(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spotlightSlotKeys.adminList() });
    },
  });
}
