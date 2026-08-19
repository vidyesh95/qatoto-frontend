"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/store/admin-freight.api`, all called
// from the freight console island.
//
// NOTHING HERE IS OPTIMISTIC. Two of these writes have an irreversible side effect on a row the
// caller did not name — creating a card supersedes an incumbent, creating a dwell estimate closes
// an open one — and both report it only in their own response. Painting a result before the server
// answered would show an operator a lane state that may not exist.
//
// EVERY WRITE TAKES ITS IDEMPOTENCY KEY AS AN ARGUMENT and sets it as an HTTP header. The key is
// minted and rotated by the component, because only the component knows when one ATTEMPT ends: a
// retry after a network failure must carry the key of the attempt it is retrying, or one operator
// click records two rate cards.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toCursorKeysetPage, useKeysetList, type KeysetToken } from "@/hooks/keyset-list";
import { type ActionResponse } from "@/lib/http";
import {
  appendFreightRateBreak,
  createCustomsDwellEstimate,
  createFreightRateCard,
  listCustomsDwellEstimates,
  listFreightRateCards,
  replaceFreightRateBreaks,
  retireCustomsDwellEstimate,
  updateFreightRateCard,
} from "@/lib/store/admin-freight.api";
import {
  type AdminCustomsDwellEstimate,
  type AdminFreightRateCard,
  type CreateCustomsDwellEstimateInput,
  type CreateFreightRateCardInput,
  type FreightRateBreakInput,
  type ListCustomsDwellEstimatesFilter,
  type ListFreightRateCardsFilter,
  type UpdateFreightRateCardInput,
} from "@/lib/store/admin-freight.schemas";

/**
 * Keys live here rather than in `storeKeys`, following `admin-site-audits.ts`: this is a staff
 * surface nothing on the buyer side reads, so sharing a namespace would only create the chance of
 * a buyer read invalidating an operator's console.
 *
 * The filter is part of the list key — it changes list IDENTITY. The CURSOR is not: keyset pages
 * accumulate under one key, which is the whole reason `useKeysetList` can hold them.
 */
export const freightAdminKeys = {
  all: ["store", "admin", "freight"] as const,
  rateCards: (filter: ListFreightRateCardsFilter) =>
    [
      "store",
      "admin",
      "freight",
      "cards",
      filter.originCountryCode,
      filter.destinationCountryCode,
      filter.mode,
      filter.providerOrganizationId,
      filter.state,
    ] as const,
  dwellEstimates: (filter: ListCustomsDwellEstimatesFilter) =>
    [
      "store",
      "admin",
      "freight",
      "dwell",
      filter.destinationCountryCode,
      filter.originCountryCode,
      filter.commodityScopeCategoryId,
      filter.openOnly,
    ] as const,
};

/** How many rows a page asks for. The backend caps this at 50. */
const FREIGHT_PAGE_LIMIT = 25;

/**
 * Bridges the store's `{ items, page: { nextCursor } }` envelope to the token-agnostic page
 * `useKeysetList` accumulates.
 *
 * The R&D reads answer `{ rows, nextCursor }` directly, so `toCursorKeysetPage` takes that shape;
 * the store's cursor envelope names the same two things `items` and `page.nextCursor`. Renaming
 * happens here, once, rather than in the api module — the api module keeps the wire's own words so
 * a reader can tell which envelope a route actually answers with.
 */
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

// --- Reads ---------------------------------------------------------------------

/**
 * One accumulating list of lane rate cards.
 *
 * `initialPage: null` because there is NO server-rendered first page here — this console is a
 * client island end to end, so the hook fetches page one itself on mount.
 *
 * Forward-only: the backend returns no total and no previous cursor, so callers render a load-more
 * rather than pagination, and must not claim a count they were never given.
 *
 * NO `enabled` FLAG, DELIBERATELY. `useKeysetList` has none, and this surface does not need one:
 * `moderate_commerce` gates the READS here too, not just the writes, so a viewer without it has
 * nothing to show. The console renders the capability banner INSTEAD OF the panel rather than
 * rendering a disabled panel, so an ungated viewer never mounts this hook and never fires a
 * request that would only 403.
 */
export function useFreightRateCardsList(filter: ListFreightRateCardsFilter) {
  return useKeysetList<AdminFreightRateCard>({
    queryKey: freightAdminKeys.rateCards(filter),
    initialPage: null,
    fetchPage: (token: KeysetToken | null) =>
      listFreightRateCards({
        ...filter,
        limit: FREIGHT_PAGE_LIMIT,
        // `typeof` states which token kind this read uses rather than asserting it: the cursor
        // adapter only ever produces a string, so a number cannot arrive here.
        ...(typeof token === "string" ? { cursor: token } : {}),
      }).then(toStoreCursorPage),
  });
}

export function useCustomsDwellEstimatesList(filter: ListCustomsDwellEstimatesFilter) {
  return useKeysetList<AdminCustomsDwellEstimate>({
    queryKey: freightAdminKeys.dwellEstimates(filter),
    initialPage: null,
    fetchPage: (token: KeysetToken | null) =>
      listCustomsDwellEstimates({
        ...filter,
        limit: FREIGHT_PAGE_LIMIT,
        ...(typeof token === "string" ? { cursor: token } : {}),
      }).then(toStoreCursorPage),
  });
}

/**
 * The supersede pre-flight: is there already an active card on this exact lane five-tuple?
 *
 * WHY THIS EXISTS AT ALL. Creating a card silently retires the incumbent on the same
 * `(provider, origin, destination, mode, currency)`, and the only report is a field on the create
 * response — after the fact. There is no "dry run" and no `supersedesRateCardId` to opt out with,
 * so looking first is the only way an operator can know what a submit is about to close.
 *
 * `currency` IS MATCHED CLIENT-SIDE because the list has no currency filter, and this is one of
 * the few places where filtering in the browser is correct rather than lazy: the four server
 * filters already narrow to one lane and one provider, so the residue is a handful of rows, not a
 * page of them. USD and EUR cards coexist on a lane and do NOT supersede each other.
 */
export function useSupersedeCandidateQuery(
  candidate: {
    readonly providerOrganizationId: string;
    readonly originCountryCode: string;
    readonly destinationCountryCode: string;
    readonly mode: ListFreightRateCardsFilter["mode"];
    readonly currency: string;
  },
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...freightAdminKeys.all,
      "supersede-check",
      candidate.providerOrganizationId,
      candidate.originCountryCode,
      candidate.destinationCountryCode,
      candidate.mode,
      candidate.currency,
    ] as const,
    queryFn: async (): Promise<AdminFreightRateCard | null> => {
      const result = await listFreightRateCards({
        providerOrganizationId: candidate.providerOrganizationId,
        originCountryCode: candidate.originCountryCode,
        destinationCountryCode: candidate.destinationCountryCode,
        ...(candidate.mode ? { mode: candidate.mode } : {}),
        state: "active",
        limit: FREIGHT_PAGE_LIMIT,
      });
      if (!result.success) return null;
      return result.data.items.find((card) => card.currency === candidate.currency) ?? null;
    },
    enabled: isEnabled,
    // A pre-flight that retries is a pre-flight that answers slowly at the exact moment an
    // operator is waiting to press submit.
    retry: false,
  });
}

// --- Rate card writes ------------------------------------------------------------

/**
 * Create a card and its whole ladder.
 *
 * Invalidates every freight list rather than one: a create can close an incumbent that is sitting
 * in a differently-filtered list, so narrowing the invalidation would leave a superseded card
 * rendering as active on another tab of the same console.
 */
export function useCreateFreightRateCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      readonly input: CreateFreightRateCardInput;
      readonly idempotencyKey: string;
    }) =>
      createFreightRateCard(variables.input, {
        headers: { "Idempotency-Key": variables.idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: freightAdminKeys.all });
    },
  });
}

/**
 * Shorten a card's window, or withdraw it — ONE HOOK, because both act on the same card, both
 * invalidate the same lists, and which of them is legal depends on state the server owns.
 */
export function useUpdateFreightRateCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      readonly rateCardId: string;
      readonly input: UpdateFreightRateCardInput;
      readonly idempotencyKey: string;
    }) =>
      updateFreightRateCard(variables.rateCardId, variables.input, {
        headers: { "Idempotency-Key": variables.idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: freightAdminKeys.all });
    },
  });
}

/**
 * Append one band, or replace the whole ladder.
 *
 * `replace` sends every band being KEPT — there is no delete route, so removal is expressed by
 * omission from a full set, and the set can never be empty.
 */
export function useFreightRateBreaksMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      readonly action: "append" | "replace";
      readonly rateCardId: string;
      readonly band?: FreightRateBreakInput;
      readonly breaks?: readonly FreightRateBreakInput[];
      readonly idempotencyKey: string;
    }) => {
      const requestOptions = { headers: { "Idempotency-Key": variables.idempotencyKey } };
      if (variables.action === "append") {
        if (!variables.band) throw new Error("Missing band to append");
        return appendFreightRateBreak(variables.rateCardId, variables.band, requestOptions);
      }
      if (!variables.breaks) throw new Error("Missing bands to replace with");
      return replaceFreightRateBreaks(variables.rateCardId, variables.breaks, requestOptions);
    },
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: freightAdminKeys.all });
    },
  });
}

// --- Customs dwell writes -----------------------------------------------------------

export function useCreateCustomsDwellEstimateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      readonly input: CreateCustomsDwellEstimateInput;
      readonly idempotencyKey: string;
    }) =>
      createCustomsDwellEstimate(variables.input, {
        headers: { "Idempotency-Key": variables.idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: freightAdminKeys.all });
    },
  });
}

/** Retire one estimate by closing its window. One-way: a closed row can never be reopened. */
export function useRetireCustomsDwellEstimateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      readonly dwellEstimateId: string;
      readonly validUntil: string;
      readonly idempotencyKey: string;
    }) =>
      retireCustomsDwellEstimate(variables.dwellEstimateId, variables.validUntil, {
        headers: { "Idempotency-Key": variables.idempotencyKey },
      }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: freightAdminKeys.all });
    },
  });
}
