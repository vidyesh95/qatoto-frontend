"use client";

// TRANSPORT: client-query — organization addresses.
//
// THE ORGANIZATION IS SERVER-DERIVED, NOT ASSERTED. These reads need an organization id in the
// path, and the client gets it by ASKING (`GET /commerce/organizations/mine`) rather than by
// believing one it stored. Every write is re-authorized against that membership server-side
// regardless, so the id in the path is an address, not a permission.
//
// NOTHING IS OPTIMISTIC and no address is cached under a persisted key: the street lines,
// recipient name and phone are PII decrypted for a member who may read them.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import { useViewerOrganizationsQuery } from "@/hooks/store/orders";
import type { ActionResponse } from "@/lib/http";
import {
  createOrganizationAddress,
  listOrganizationAddresses,
  updateOrganizationAddress,
} from "@/lib/store/addresses.api";
import type {
  OrganizationAddress,
  UpsertOrganizationAddressInput,
} from "@/lib/store/addresses.schemas";

/**
 * The caller's first organization, or `null` while unknown.
 *
 * FIRST, NOT "the active one" — the wire carries no notion of an active organization on this read,
 * and picking one here is a display decision, not an authorization. Multi-organization buyers are
 * rare enough on this surface that a picker is not yet worth the control; the server still
 * re-authorizes every write against the membership.
 */
export function useViewerOrganizationId(): string | null {
  const organizationsQuery = useViewerOrganizationsQuery();
  const result = organizationsQuery.data;
  if (result === undefined || !result.success) return null;
  return result.data[0] ?? null;
}

export function useOrganizationAddressesQuery(organizationId: string | null) {
  return useQuery<ActionResponse<readonly OrganizationAddress[]>>({
    queryKey: storeKeys.organizationAddresses(organizationId ?? ""),
    queryFn: () => listOrganizationAddresses(organizationId ?? ""),
    enabled: organizationId !== null && organizationId.length > 0,
    // A 401 or a 403 is an answer, not a flake.
    retry: false,
  });
}

export function useCreateOrganizationAddress(
  organizationId: string | null,
): UseMutationResult<
  ActionResponse<OrganizationAddress>,
  Error,
  { readonly input: UpsertOrganizationAddressInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createOrganizationAddress(organizationId ?? "", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({
        queryKey: storeKeys.organizationAddresses(organizationId ?? ""),
      });
    },
  });
}

export function useUpdateOrganizationAddress(organizationId: string | null): UseMutationResult<
  ActionResponse<OrganizationAddress>,
  Error,
  {
    readonly addressId: string;
    readonly input: UpsertOrganizationAddressInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, input, idempotencyKey }) =>
      updateOrganizationAddress(organizationId ?? "", addressId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({
        queryKey: storeKeys.organizationAddresses(organizationId ?? ""),
      });
    },
  });
}
