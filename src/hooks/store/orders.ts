"use client";

// TRANSPORT: client-query — React Query hooks over orders, fulfillment and engagements.
//
// THE VIEWER'S ORGANIZATIONS ARE A QUERY, NOT A PROP. `GET /commerce/orders/:orderId` returns the same
// projection to buyer and counterparty, so the relation has to be derived — and the ids it is derived
// from come from the server. Every order page therefore runs two queries, and the detail is not
// rendered until both have answered: showing an order before knowing who is reading it means rendering
// the wrong actions for a moment, and on this surface an action is a cancellation.
//
// THE PII READ IS NOT A QUERY. `useRevealDeliveryAddress` is a MUTATION even though it is a GET, because
// every call writes an audit entry to the buyer's stream. A `useQuery` would refetch it on window focus
// and on remount, logging PII accesses the seller never asked for. See its own note.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import { storeKeys } from "@/hooks/store/keys";
import type { FreightMode } from "@/lib/store/freight.schemas";
import type {
  ServiceEngagement,
  TransitionServiceEngagementInput,
} from "@/lib/store/fulfillment.schemas";
import {
  cancelOrder,
  getOrder,
  getOrderArrivalWindow,
  getOrderDeliveryAddress,
  getOrderFulfillment,
  getServiceEngagement,
  listBuyerOrders,
  listProviderOrders,
  listServiceEngagements,
  transitionServiceEngagement,
} from "@/lib/store/orders.api";
import { listMyCommerceOrganizations } from "@/lib/store/organizations.api";
import type { MyCommerceOrganizationMembership } from "@/lib/store/organizations.schemas";
import type {
  ListOrdersFilter,
  OrderDeliveryAddress,
  OrderDetail,
} from "@/lib/store/orders.schemas";

/**
 * Narrows the membership list to the ids the order pages compare against.
 *
 * MODULE-LEVEL, not an inline arrow, so its identity is stable and React Query can memoise the
 * projection instead of recomputing it on every render.
 *
 * It returns an `ActionResponse` rather than a bare array so a failed read stays legible to the
 * caller. Collapsing a failure to `[]` here would tell an order page the caller belongs to no
 * organization — which renders as `neither`, and a buyer would be shown their own order as somebody
 * else's. That is the exact failure A35 recorded when this route's schema was wrong.
 */
function selectViewerOrganizationIds(
  result: ActionResponse<MyCommerceOrganizationMembership[]>,
): ActionResponse<readonly string[]> {
  if (!result.success) return result;
  return { success: true, data: result.data.map((row) => row.organization.id) };
}

/**
 * Which organizations the caller belongs to, as ids.
 *
 * SHARES ITS CACHE ENTRY with `useMyCommerceOrganizationsQuery` and
 * `useBuyerWorkspaceReadinessQuery` in `./organizations` — one route, one `queryFn`, one key, three
 * `select`s. They must keep the same `queryFn` and `staleTime`: two hooks writing different shapes
 * under `storeKeys.viewerOrganizations()` would each read the other's value as its own.
 *
 * Cached for five minutes because membership changes are rare and a staff decision; refetching on
 * every order page would be a request per navigation for data that does not move.
 */
export function useViewerOrganizationsQuery() {
  return useQuery({
    queryKey: storeKeys.viewerOrganizations(),
    queryFn: () => listMyCommerceOrganizations(),
    select: selectViewerOrganizationIds,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * `which` picks the ENDPOINT, not a filter — see `orders.api.ts` for why they are two reads.
 *
 * `filter.state` IS A SERVER-SIDE NARROWING and is part of the key, because it changes the answer.
 * Two calls with different states are two different lists and must not share a cache entry — the
 * dispatch queue on `/sales` asks for `confirmed` while the full list beside it asks for
 * everything, and one entry would let each overwrite the other.
 */
export function useOrderListQuery(which: "buyer" | "provider", filter: ListOrdersFilter = {}) {
  return useQuery({
    queryKey: storeKeys.orderList(which, filter.state),
    queryFn: () => (which === "buyer" ? listBuyerOrders(filter) : listProviderOrders(filter)),
  });
}

export function useOrderQuery(orderId: string) {
  return useQuery({
    queryKey: storeKeys.order(orderId),
    queryFn: () => getOrder(orderId),
  });
}

/**
 * Derived fulfillment progress.
 *
 * Separate from the order query on purpose: it is a heavier read that recomputes progress, and an order
 * page that shows commercial terms should not wait on shipment legs to render them.
 */
export function useOrderFulfillmentQuery(orderId: string) {
  return useQuery({
    queryKey: storeKeys.orderFulfillment(orderId),
    queryFn: () => getOrderFulfillment(orderId),
  });
}

/**
 * When this order should arrive, for the mode the buyer has chosen — or for none yet.
 *
 * `mode: null` IS A REAL REQUEST, NOT A DISABLED ONE. With no mode the server answers
 * `freight: unknown / mode_not_selected` and lists the modes it does cover, which is exactly the
 * choice the panel renders. Gating the query on a mode would leave the buyer looking at a spinner
 * instead of the picker that clears it.
 *
 * `retry: false` because this route carries `requireActiveCommerceOrganization` on top of `requireAuth`
 * — a signed-in buyer with no active organization gets a 403 here, and a 403 is an answer.
 */
export function useOrderArrivalWindowQuery(orderId: string, mode: FreightMode | null) {
  return useQuery({
    queryKey: storeKeys.orderArrivalWindow(orderId, mode),
    queryFn: () => getOrderArrivalWindow(orderId, mode === null ? {} : { mode }),
    enabled: orderId.length > 0,
    retry: false,
  });
}

export function useServiceEngagementListQuery() {
  return useQuery({
    queryKey: storeKeys.engagementList(),
    queryFn: () => listServiceEngagements(),
  });
}

export function useServiceEngagementQuery(engagementId: string) {
  return useQuery({
    queryKey: storeKeys.engagement(engagementId),
    queryFn: () => getServiceEngagement(engagementId),
  });
}

/**
 * Reveals the buyer's decrypted delivery address to a counterparty.
 *
 * A MUTATION DESPITE BEING A GET, and that is the whole point. Every call writes an audit entry to the
 * BUYER's stream, and if the audit cannot be written the read rolls back — it is the only route in this
 * backend that hands one organization another's PII. As a `useQuery` it would refetch on window focus
 * and on remount, so a seller who left the tab open would generate PII-access records they never asked
 * for, against a buyer who would see them in their audit trail.
 *
 * The result is deliberately NOT cached under a query key either: caching PII keyed by order id is how
 * it ends up in a devtools panel and a persisted cache.
 */
export function useRevealDeliveryAddress(): UseMutationResult<
  ActionResponse<OrderDeliveryAddress>,
  Error,
  { readonly orderId: string }
> {
  return useMutation({
    mutationFn: ({ orderId }) => getOrderDeliveryAddress(orderId),
  });
}

/**
 * Cancels an order.
 *
 * Invalidates the order, the fulfillment read and BOTH list endpoints: a cancellation changes what the
 * buyer queue and the provider queue each show, and the caller may legitimately appear in both.
 */
export function useCancelOrder(): UseMutationResult<
  ActionResponse<OrderDetail>,
  Error,
  { readonly orderId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, idempotencyKey }) =>
      // THE KEY IS REQUIRED BY THE ROUTE — `idempotency({ required: true })` sits in front of it, so a call
      // without the header is refused before the service is reached. It is minted once per attempt in the
      // component, not here.
      cancelOrder(orderId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, { orderId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.order(orderId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderFulfillment(orderId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderList("buyer") });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderList("provider") });
    },
  });
}

/**
 * Moves an engagement.
 *
 * Also invalidates the parent order's fulfillment read, because `overallState` and `attentionItems` are
 * DERIVED from every engagement on the order — moving one changes the coordinator's view of the whole.
 * It does NOT invalidate sibling engagements: completion of one never marks another complete, and
 * refetching them would imply otherwise.
 */
export function useTransitionServiceEngagement(): UseMutationResult<
  ActionResponse<ServiceEngagement>,
  Error,
  {
    readonly engagementId: string;
    readonly orderId: string;
    readonly input: TransitionServiceEngagementInput;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ engagementId, input }) => transitionServiceEngagement(engagementId, input),
    onSuccess: (result, { engagementId, orderId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.engagement(engagementId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.engagementList() });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderFulfillment(orderId) });
    },
  });
}
