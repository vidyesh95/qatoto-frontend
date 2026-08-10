"use client";

// TRANSPORT: client-query — the inquiry lifecycle on the factory surface.
//
// THE TWO PUBLIC FACTORY READS ARE DELIBERATELY ABSENT, the same call `hooks/store/providers.ts`
// makes. The directory and the detail page are awaited in server components; putting a cacheable
// public read behind React Query would move it into the client bundle for no gain and lose the
// URL-as-state filtering that makes a filtered view shareable.
//
// The inquiry reads below are the opposite case: they are session-scoped, they are nobody's
// shareable URL, and they change under the viewer's own writes.
//
// NOTHING HERE IS OPTIMISTIC. An inquiry is a message to another business about work they might
// do; showing it as sent before the server says so is a lie the buyer then acts on. Every mutation
// invalidates and waits.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  answerFactoryInquiry,
  closeFactoryInquiry,
  createFactoryInquiry,
  getFactoryInquiry,
  listOwnFactoryInquiries,
  listReceivedFactoryInquiries,
  sendFactoryInquiry,
} from "@/lib/store/factories.api";
import type {
  CloseFactoryInquiryInput,
  CreatedFactoryInquiry,
  CreateFactoryInquiryInput,
  FactoryInquiry,
  FactoryInquiryListPage,
  ListFactoryInquiriesFilter,
} from "@/lib/store/factories.schemas";

/**
 * Query keys for the inquiry surface.
 *
 * ITS OWN FACTORY RATHER THAN A BRANCH OF `storeKeys`, matching what `admin-categories.ts` did:
 * these keys are invalidated as a set by every transition, and a set that lives inside a shared
 * factory tends to get invalidated by things that have nothing to do with it.
 */
export const factoryInquiryKeys = {
  all: ["factory-inquiries"] as const,
  mine: (state?: string) => ["factory-inquiries", "mine", state ?? "all"] as const,
  received: (state?: string) => ["factory-inquiries", "received", state ?? "all"] as const,
  detail: (inquiryId: string) => ["factory-inquiries", "detail", inquiryId] as const,
};

/** The buyer's own inquiries, any state, drafts included. */
export function useOwnFactoryInquiriesQuery(filter: ListFactoryInquiriesFilter = {}) {
  return useQuery<ActionResponse<FactoryInquiryListPage>>({
    queryKey: factoryInquiryKeys.mine(filter.state),
    queryFn: () => listOwnFactoryInquiries(filter),
    // A 401 or a 403 is an answer, not a flake. Retrying one only delays the sign-in prompt.
    retry: false,
  });
}

/** The factory's received queue. Never contains a draft — see the api module. */
export function useReceivedFactoryInquiriesQuery(filter: ListFactoryInquiriesFilter = {}) {
  return useQuery<ActionResponse<FactoryInquiryListPage>>({
    queryKey: factoryInquiryKeys.received(filter.state),
    queryFn: () => listReceivedFactoryInquiries(filter),
    retry: false,
  });
}

/** One inquiry, for whichever party the viewer turns out to be. */
export function useFactoryInquiryQuery(inquiryId: string, isEnabled = true) {
  return useQuery<ActionResponse<{ inquiry: FactoryInquiry }>>({
    queryKey: factoryInquiryKeys.detail(inquiryId),
    queryFn: () => getFactoryInquiry(inquiryId),
    enabled: isEnabled && inquiryId.length > 0,
    retry: false,
  });
}

/**
 * Creates a DRAFT inquiry to one factory.
 *
 * IT NOW INVALIDATES `/mine`, which it could not do before Phase 17 — the comment this replaced
 * said it invalidated nothing because no such read existed, and a create with no list to land in
 * is a write into a hole (§16.5).
 *
 * The idempotency key is minted by the composer, once per attempt. A fresh key on a retry is a
 * second inquiry the factory then has to work out is a duplicate.
 */
export function useCreateFactoryInquiry(): UseMutationResult<
  ActionResponse<CreatedFactoryInquiry>,
  Error,
  {
    readonly factorySlug: string;
    readonly input: CreateFactoryInquiryInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ factorySlug, input, idempotencyKey }) =>
      createFactoryInquiry(factorySlug, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryInquiryKeys.all });
    },
  });
}

/**
 * `draft` → `sent`. THIS is the call that notifies the factory.
 *
 * Carries an idempotency key because sending opens the one-to-one thread, and a retry without one
 * can open a second thread on a single inquiry.
 */
export function useSendFactoryInquiry(): UseMutationResult<
  ActionResponse<{ inquiry: FactoryInquiry }>,
  Error,
  { readonly inquiryId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inquiryId, idempotencyKey }) =>
      sendFactoryInquiry(inquiryId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryInquiryKeys.all });
    },
  });
}

/**
 * The factory marks an inquiry answered.
 *
 * A BOOKKEEPING MARK. The reply itself is a message in the thread; this only moves the row out of
 * the unworked part of the queue, and no copy on the control may imply the buyer has been written
 * to by pressing it.
 */
export function useAnswerFactoryInquiry(): UseMutationResult<
  ActionResponse<{ inquiry: FactoryInquiry }>,
  Error,
  { readonly inquiryId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inquiryId }) => answerFactoryInquiry(inquiryId),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryInquiryKeys.all });
    },
  });
}

/** Either party closes it, from any state but `closed`. The reason is optional. */
export function useCloseFactoryInquiry(): UseMutationResult<
  ActionResponse<{ inquiry: FactoryInquiry }>,
  Error,
  { readonly inquiryId: string; readonly input?: CloseFactoryInquiryInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inquiryId, input }) => closeFactoryInquiry(inquiryId, input ?? {}),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: factoryInquiryKeys.all });
    },
  });
}
