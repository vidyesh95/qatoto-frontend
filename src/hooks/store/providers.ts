"use client";

// TRANSPORT: client-query — the provider's own listings and the one mutation over them.
//
// THE THREE PUBLIC PROVIDER READS ARE DELIBERATELY ABSENT. The directory, the provider detail and the service
// detail are awaited in server components; putting them behind React Query would move a cacheable public page
// into the client bundle for no gain.
//
// What IS here is session-scoped: `offerings/mine` returns the caller's own drafts, which no public read can,
// and the create mutation that produces them.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  createServiceOffering,
  listMyServiceOfferings,
  listStoreProviders,
  submitServiceOffering,
  updateServiceOffering,
} from "@/lib/store/providers.api";
import type {
  CreatedServiceOffering,
  CreateServiceOfferingInput,
  ListProvidersFilter,
  ProviderDirectoryPage,
  UpdateServiceOfferingInput,
} from "@/lib/store/providers.schemas";

/** Every offering the caller's organization owns, drafts included. The only read that shows one. */
/**
 * The PUBLIC provider directory, as a client query.
 *
 * `listStoreProviders` is `TRANSPORT: server-fetch` and its only consumer is a server component, so
 * there was no hook and no key. This adds both — additive plumbing over an already-wired public
 * read, not a new transport; `getJson` is isomorphic and the wrapper already threads
 * `RequestOptions`.
 *
 * ⚠️ **FILTERED BY `providerKind` FOR A REASON THAT IS NOT COSMETIC.** An invitation is refused
 * unless the provider holds a VERIFIED link for one of the kinds the RFQ's service lines name, and
 * the whole invite batch is one transaction whose refusal names no id. Narrowing the list to the
 * kind the RFQ actually needs is what turns a 409 nobody can act on into a list that works.
 */
export function useProviderDirectoryQuery(filter: ListProvidersFilter, isEnabled: boolean) {
  return useQuery<ActionResponse<ProviderDirectoryPage>>({
    queryKey: storeKeys.providerDirectory(filter),
    queryFn: () => listStoreProviders(filter),
    enabled: isEnabled,
    retry: false,
  });
}

export function useMyServiceOfferingsQuery() {
  return useQuery({
    queryKey: storeKeys.providerOfferingsMine(),
    queryFn: () => listMyServiceOfferings(),
  });
}

/**
 * Creates a DRAFT service offering.
 *
 * INVALIDATES ONLY THE PROVIDER'S OWN LIST. A draft appears in no public read — not the directory, not
 * search, not a category — so there is nothing else to refetch. It becomes public after `submit` and after a
 * moderator approves, neither of which happens here.
 *
 * The idempotency key is minted by the composer, once per attempt. A fresh key on a retry is a second draft
 * listing, which is a duplicate a moderator then has to reject by hand.
 */
export function useCreateServiceOffering(): UseMutationResult<
  ActionResponse<CreatedServiceOffering>,
  Error,
  { readonly input: CreateServiceOfferingInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createServiceOffering(input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.providerOfferingsMine() });
    },
  });
}

/**
 * Edits a listing in place — a SPARSE patch, so the caller sends only what changed.
 *
 * Invalidates the provider's own list, which is the only read that carries a draft. An `active`
 * listing also appears in public reads that are server-fetched and never in this cache, so a buyer
 * sees the edit on their next request rather than through an invalidation here.
 */
export function useUpdateServiceOfferingMutation(): UseMutationResult<
  ActionResponse<CreatedServiceOffering>,
  Error,
  {
    readonly offeringId: string;
    readonly input: UpdateServiceOfferingInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offeringId, input, idempotencyKey }) =>
      updateServiceOffering(offeringId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.providerOfferingsMine() });
    },
  });
}

/**
 * Sends a draft for review — `draft` → `pending_review`.
 *
 * ⚠️ **NOT OPTIMISTIC, AND NOT A PUBLICATION.** The row's new state comes from the response, and
 * that state is `pending_review`: a moderator has not looked yet. A UI that flipped the row to
 * "published" here would tell a provider their listing is findable when its public URL is still a
 * 404.
 */
export function useSubmitServiceOfferingMutation(): UseMutationResult<
  ActionResponse<CreatedServiceOffering>,
  Error,
  { readonly offeringId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offeringId, idempotencyKey }) =>
      submitServiceOffering(offeringId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.providerOfferingsMine() });
    },
  });
}
