"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/store/provider-freight.api`, all called
// from the forwarder's rate-card composer island (§19.12).
//
// NOTHING HERE IS OPTIMISTIC. Creating a card can close one of the author's own live cards on the
// same lane, and the only report is `supersededRateCardId` on that one response. Painting a result
// before the server answered would show a forwarder a lane state that may not exist.
//
// EVERY WRITE TAKES ITS IDEMPOTENCY KEY AS AN ARGUMENT and sets it as an HTTP header. The key is
// minted and rotated by the component, because only the component knows when one ATTEMPT ends: a
// retry after a network failure must carry the key of the attempt it is retrying, or one click
// publishes two tariffs.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toCursorKeysetPage, useKeysetList, type KeysetToken } from "@/hooks/keyset-list";
import { type ActionResponse } from "@/lib/http";
import {
  appendProviderFreightRateBreak,
  createProviderFreightRateCard,
  listProviderFreightRateCards,
  replaceProviderFreightRateBreaks,
  updateProviderFreightRateCard,
} from "@/lib/store/provider-freight.api";
import {
  type AdminFreightRateCard,
  type CreateProviderFreightRateCardInput,
  type FreightRateBreakInput,
  type ListProviderFreightRateCardsFilter,
  type UpdateProviderFreightRateCardInput,
} from "@/lib/store/provider-freight.schemas";

/**
 * ITS OWN NAMESPACE, not a branch of `freightAdminKeys` (`["store","admin","freight"]`).
 *
 * The two surfaces read the SAME rows through different routes under different authorization, and
 * both invalidate coarsely after a write. Sharing a prefix would let a moderator's console write
 * blow away a forwarder's cache and vice versa — and worse, would make a cached staff page look
 * like an answer to "what are MY lanes".
 *
 * THE FILTER IS PART OF THE KEY; THE CURSOR IS NOT. A filter change is a different list; a cursor
 * is one more page of the same one, and keyset pages accumulate under a single key.
 */
export const providerFreightKeys = {
  all: ["store", "provider", "freight"] as const,
  rateCards: (filter: ListProviderFreightRateCardsFilter) =>
    [
      "store",
      "provider",
      "freight",
      "cards",
      filter.originCountryCode,
      filter.destinationCountryCode,
      filter.mode,
      filter.state,
    ] as const,
};

/** The backend caps at 50; 25 keeps a page short enough to scan. */
const PROVIDER_FREIGHT_PAGE_LIMIT = 25;

/** Bridges the store's `{ items, page.nextCursor }` envelope to `useKeysetList`'s page shape. */
function toStoreCursorPage<TRow>(
  result: ActionResponse<{ items: TRow[]; page: { nextCursor: string | null } }>,
) {
  return toCursorKeysetPage(
    result.success
      ? {
          success: true as const,
          data: { rows: result.data.items, nextCursor: result.data.page.nextCursor },
        }
      : result,
  );
}

/**
 * One accumulating list of the caller's own lane rate cards.
 *
 * Forward-only: the backend returns no total and no previous cursor, so callers render a load-more
 * rather than pagination, and must not claim a count they were never given.
 *
 * NO `enabled` FLAG — `useKeysetList` has none. A viewer who is not an approved freight provider
 * gets a 403 from this read, which is an ANSWER and is what the page renders; there is nothing to
 * gate client-side, and nothing here may try to guess provider-ness before asking.
 */
export function useProviderFreightRateCardsList(filter: ListProviderFreightRateCardsFilter) {
  return useKeysetList<AdminFreightRateCard>({
    queryKey: providerFreightKeys.rateCards(filter),
    initialPage: null,
    fetchPage: (token: KeysetToken | null) =>
      listProviderFreightRateCards({
        ...filter,
        limit: PROVIDER_FREIGHT_PAGE_LIMIT,
        // `typeof` states which token kind this read uses rather than asserting it.
        ...(typeof token === "string" ? { cursor: token } : {}),
      }).then(toStoreCursorPage),
  });
}

/**
 * The supersede pre-flight: does this author ALREADY have a live card on the lane they are about
 * to publish?
 *
 * WHY IT SURVIVES THE PORT FROM THE STAFF CONSOLE. The create closes an incumbent inside its own
 * transaction and names it only in that one reply, so without this the author replaces their own
 * live price and is told afterwards. That it is now their OWN card rather than a stranger's makes
 * the warning more useful, not less — it is their price that stops applying.
 *
 * ⚠️ CURRENCY IS MATCHED CLIENT-SIDE because the list route has no currency filter, and currency is
 * part of lane identity: a USD card and a EUR card on one lane coexist by design.
 *
 * `retry: false` — a pre-flight that retries answers slowly at exactly the moment somebody is
 * waiting to submit, and a 403 here is an answer about the caller's workspace, not a flake.
 */
export function useProviderSupersedeCandidateQuery(
  candidate: {
    readonly originCountryCode: string;
    readonly destinationCountryCode: string;
    readonly mode: AdminFreightRateCard["mode"];
    readonly currency: string;
  },
  isEnabled: boolean,
) {
  return useQuery<AdminFreightRateCard | null>({
    queryKey: [
      ...providerFreightKeys.all,
      "supersede-check",
      candidate.originCountryCode,
      candidate.destinationCountryCode,
      candidate.mode,
      candidate.currency,
    ],
    queryFn: async () => {
      const result = await listProviderFreightRateCards({
        originCountryCode: candidate.originCountryCode,
        destinationCountryCode: candidate.destinationCountryCode,
        mode: candidate.mode,
        state: "active",
        limit: 25,
      });
      if (!result.success) return null;
      return result.data.items.find((card) => card.currency === candidate.currency) ?? null;
    },
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Create a card with its whole ladder.
 *
 * Invalidates EVERY provider freight list rather than one, because a create can close an incumbent
 * sitting in a differently-filtered list the author is also looking at.
 */
export function useCreateProviderFreightRateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      readonly input: CreateProviderFreightRateCardInput;
      readonly idempotencyKey: string;
    }) =>
      createProviderFreightRateCard(variables.input, {
        headers: { "Idempotency-Key": variables.idempotencyKey },
      }),
    onSuccess: (result) => {
      // A refusal is a RESOLVED mutation, not an error — do not invalidate on one.
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: providerFreightKeys.all });
    },
  });
}

/** Shorten a window, or withdraw. One hook, because both are the same narrowing PATCH. */
export function useUpdateProviderFreightRateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      readonly rateCardId: string;
      readonly input: UpdateProviderFreightRateCardInput;
      readonly idempotencyKey: string;
    }) =>
      updateProviderFreightRateCard(variables.rateCardId, variables.input, {
        headers: { "Idempotency-Key": variables.idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: providerFreightKeys.all });
    },
  });
}

/**
 * Append one band, or replace the whole ladder. Both are refused with a 409 once the card is in
 * force, which is what `bandsEditable` on the row reports ahead of time.
 */
export function useProviderFreightRateBreaksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      readonly action: "append" | "replace";
      readonly rateCardId: string;
      readonly band?: FreightRateBreakInput;
      readonly breaks?: readonly FreightRateBreakInput[];
      readonly idempotencyKey: string;
    }) => {
      const requestOptions = { headers: { "Idempotency-Key": variables.idempotencyKey } };
      if (variables.action === "append") {
        if (!variables.band) throw new Error("Missing band to append");
        return appendProviderFreightRateBreak(variables.rateCardId, variables.band, requestOptions);
      }
      if (!variables.breaks) throw new Error("Missing bands to replace with");
      return replaceProviderFreightRateBreaks(
        variables.rateCardId,
        variables.breaks,
        requestOptions,
      );
    },
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: providerFreightKeys.all });
    },
  });
}
