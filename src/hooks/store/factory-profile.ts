"use client";

// TRANSPORT: client-query — the three seller-side factory profile writes.
//
// NO QUERY IN THIS FILE, and that is the backend's shape rather than an omission: §6.6 lists three
// PUTs and no reads, because a factory's lines, sites and terms are already projected by
// `GET /store/factories/:factorySlug`. The editor prefills from that public read and posts back
// through these three.
//
// ALL THREE INVALIDATE THE PUBLIC DETAIL READ AS WELL AS EACH OTHER, because that read is where
// the seller sees their own change. A form that saved and left the page showing the old figures is
// one the seller submits twice.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  replaceFactoryProductionLines,
  replaceFactorySites,
  updateFactoryTerms,
} from "@/lib/store/factory-profile.api";
import type {
  FactoryProductionLine,
  FactorySite,
  FactoryTerms,
  ReplaceFactorySitesInput,
  ReplaceProductionLinesInput,
  UpdateFactoryTermsInput,
} from "@/lib/store/factories.schemas";

export const factoryProfileKeys = {
  all: ["factory-profile"] as const,
  detail: (organizationId: string) => ["factory-profile", organizationId] as const,
};

/**
 * Replaces the WHOLE production-line list.
 *
 * THE BODY IS THE NEW LIST. An omitted row is a deletion and array order is the stored order —
 * there is no per-row route and there should not be one, because a per-row move has to write
 * intermediate positions that violate the server's unique `(organizationId, position)` index
 * mid-transaction.
 */
export function useReplaceFactoryProductionLinesMutation(): UseMutationResult<
  ActionResponse<{ productionLines: FactoryProductionLine[] }>,
  Error,
  { readonly organizationId: string; readonly input: ReplaceProductionLinesInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, input }) => replaceFactoryProductionLines(organizationId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}

/**
 * Replaces the WHOLE site list.
 *
 * These per-site areas may disagree with the organization's own `factoryAreaSquareMetres`, and
 * neither this write nor the read reconciles them. Both are seller-declared; a platform that
 * summed one into the other would assert something neither party said (§16.3).
 */
export function useReplaceFactorySitesMutation(): UseMutationResult<
  ActionResponse<{ sites: FactorySite[] }>,
  Error,
  { readonly organizationId: string; readonly input: ReplaceFactorySitesInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, input }) => replaceFactorySites(organizationId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}

/**
 * Sample policy, order bounds and the inbox switch, in ONE object.
 *
 * A WHOLE-OBJECT PUT because both invariants are cross-field: a sample fee is only meaningful when
 * samples are offered, and an MOQ is only readable beside its unit. The form therefore submits
 * every field it renders, including the ones the seller did not touch.
 */
export function useUpdateFactoryTermsMutation(): UseMutationResult<
  ActionResponse<FactoryTerms>,
  Error,
  { readonly organizationId: string; readonly input: UpdateFactoryTermsInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, input }) => updateFactoryTerms(organizationId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryProfileKeys.all });
    },
  });
}
