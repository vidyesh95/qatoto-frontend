"use client";

// TRANSPORT: client-query — React Query hooks over the cart and checkout.
//
// FOUR RULES, and every one of them is about not lying to the buyer about money.
//
//  1. NOTHING IS OPTIMISTIC. No `onMutate`, no `setQueryData` patch, no local quantity that renders
//     before the server agrees. Each mutation returns the AUTHORITATIVE cart and the hook writes that
//     whole object into the cache. A cart line is a price and a stock reservation; an optimistic
//     quantity that the server then refuses shows a total nobody will be charged.
//  2. THE SERVER'S RESPONSE IS THE CACHE. `setQueryData` with the returned cart rather than
//     `invalidateQueries` + refetch, because the mutation response already IS the authoritative
//     cart — a second round trip to fetch what you were just handed is latency for nothing. The
//     invalidation is still there as a belt: see `useSetCartItem`.
//  3. AN IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT, IN COMPONENT STATE. Not in the hook, not in the
//     api module — both would produce a fresh key per call, and a fresh key per retry is not
//     idempotency, it is a second order. `useConfirmCheckout` therefore TAKES the key.
//  4. A FAILURE IS A VALUE. The hooks return `ActionResponse` unchanged rather than throwing, so a
//     component branches on `success` and cannot accidentally swallow a `409`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { ActionResponse } from "@/lib/http";
import {
  confirmCheckout,
  getCart,
  prepareCheckout,
  removeCartItem,
  setCartItem,
} from "@/lib/store/cart.api";
import type {
  CheckoutPrepare,
  CommerceCart,
  ConfirmCheckout,
  RemoveCartItemInput,
  SetCartItemInput,
} from "@/lib/store/cart.schemas";
import { storeKeys } from "@/hooks/store/keys";
import type { FreightMode } from "@/lib/store/freight.schemas";

/**
 * What a component may know about the cart read.
 *
 * Narrower than React Query's result on purpose — every member has to survive the hydration mask
 * below, and a field that is passed through unmasked is a field that can disagree with the HTML.
 */
export interface CartQueryView {
  readonly data: ActionResponse<CommerceCart> | undefined;
  readonly isPending: boolean;
  readonly isError: boolean;
}

/**
 * THE CART AS THE SERVER RENDERED IT, UNTIL HYDRATION IS DONE.
 *
 * `storeKeys.cart()` is SHARED WITH THE NAVBAR BADGE, and the navbar hydrates first: its Suspense
 * boundary awaits a cookie read while a product page awaits five backend round trips. So the badge
 * has already fired `GET /commerce/cart` and often has the answer by the time a page island
 * hydrates — an island that read it live would render a cart the streamed HTML does not contain,
 * and React would throw away the subtree. Same failure as the session atom in
 * `use-viewer-signed-in.ts`, arriving through the query cache instead.
 *
 * ALL THREE FIELDS MOVE TOGETHER. Masking `data` alone leaves `isPending: false` beside an absent
 * cart, which is the "couldn't reach your cart" branch — the mismatch moved one line down rather
 * than fixed. `{ isPending: true }` is precisely what the server rendered.
 */
function useHydrationStableCart(
  cartQuery: UseQueryResult<ActionResponse<CommerceCart>>,
): CartQueryView {
  const isHydrated = useIsHydrated();

  if (!isHydrated) return { data: undefined, isPending: true, isError: false };

  return { data: cartQuery.data, isPending: cartQuery.isPending, isError: cartQuery.isError };
}

/**
 * The cart.
 *
 * `staleTime: 0` on purpose. Prices and stock shown during checkout must always be fresh regardless
 * of any browse cache — a cached cart is a cached price, and this is the one surface where showing a
 * stale one has a consequence.
 */
export function useCartQuery({ isEnabled = true }: { isEnabled?: boolean } = {}): CartQueryView {
  const cartQuery = useQuery({
    queryKey: storeKeys.cart(),
    queryFn: () => getCart(),
    staleTime: 0,
    // `isEnabled` exists for the PRODUCT PAGE, which is public: without it, every anonymous visitor
    // to a product would fire a cart read that can only ever come back 401. The cart page does not
    // pass it — that route is already behind a session and the 401 there is the signal it renders.
    enabled: isEnabled,
  });

  return useHydrationStableCart(cartQuery);
}

/**
 * The same cart, for the navbar badge, at a badge's freshness.
 *
 * SAME `storeKeys.cart()` KEY, longer `staleTime`, and sharing the key is the entire point: every
 * mutation writes the authoritative cart into that key through `useCartWriter`, so the badge follows
 * an add or a stepper press with NO request of its own.
 *
 * The `staleTime` differs because the two observers want different things. The cart page shows PRICES
 * and must refetch on mount; a count in a navbar mounted on every page of the `(home)` group does not
 * justify a request per navigation. React Query resolves `staleTime` per observer, so landing on
 * `/cart` still forces the fresh read that `useCartQuery` asks for — this hook cannot make that page
 * stale.
 *
 * Masked by `useHydrationStableCart` as well. It costs nothing here — the badge is absent while the
 * query is pending either way — and it stops a future reshuffle of what hydrates first from
 * reintroducing the mismatch through this hook instead.
 */
export function useCartBadgeQuery(): CartQueryView {
  const cartQuery = useQuery({
    queryKey: storeKeys.cart(),
    queryFn: () => getCart(),
    staleTime: 60_000,
  });

  return useHydrationStableCart(cartQuery);
}

/** Writes an authoritative cart into the cache, replacing whatever was there. */
function useCartWriter() {
  const queryClient = useQueryClient();
  return (result: ActionResponse<CommerceCart>) => {
    if (!result.success) return;
    queryClient.setQueryData(storeKeys.cart(), result);
  };
}

/**
 * Sets the desired quantity for a line — NOT an increment.
 *
 * The variables carry `variantId` and `isSample` because those three together are a line's identity:
 * one product can sit in a cart as a sample AND as a bulk line, which is the whole pattern samples
 * exist for.
 */
export function useSetCartItem(): UseMutationResult<
  ActionResponse<CommerceCart>,
  Error,
  { readonly productId: string; readonly input: SetCartItemInput }
> {
  const writeCart = useCartWriter();

  return useMutation({
    mutationFn: ({ productId, input }) => setCartItem(productId, input),
    // NO `onMutate`. See rule 1 — there is deliberately no optimistic branch to get wrong.
    onSuccess: writeCart,
  });
}

export function useRemoveCartItem(): UseMutationResult<
  ActionResponse<CommerceCart>,
  Error,
  { readonly productId: string; readonly input?: RemoveCartItemInput }
> {
  const writeCart = useCartWriter();

  return useMutation({
    mutationFn: ({ productId, input }) => removeCartItem(productId, input),
    onSuccess: writeCart,
  });
}

/**
 * Validates the cart and RESERVES STOCK.
 *
 * Not a preview: the reservation is real and expires, so this must be triggered by an explicit buyer
 * action and never on mount or a timer. Re-preparing in a loop would hold stock against other buyers
 * for as long as the tab is open.
 *
 * `idempotencyKey` IS A PARAMETER HERE TOO, for the same reason it is on confirm and for a reason
 * that is easier to miss: prepare RESERVES, so a retry without a key takes the stock twice and the
 * second hold expires on its own schedule with nobody watching it. The route carries
 * `idempotency({ required: true })`, so a call without the header is a **400** before any cart is
 * read — which is not a field error and must not be rendered as one.
 */
export function usePrepareCheckout(): UseMutationResult<
  ActionResponse<CheckoutPrepare>,
  Error,
  {
    readonly idempotencyKey: string;
    readonly deliveryAddressId?: string;
    readonly requestedFreightMode?: FreightMode;
  }
> {
  return useMutation({
    // A45. RE-PREPARING WITH A DIFFERENT MODE IS A DIFFERENT REQUEST, and the caller mints a fresh
    // idempotency key for it — replaying the first key would return the first prepare's body and
    // the buyer's new choice would silently vanish.
    mutationFn: ({ idempotencyKey, deliveryAddressId, requestedFreightMode }) =>
      prepareCheckout(
        {
          ...(deliveryAddressId === undefined ? {} : { deliveryAddressId }),
          ...(requestedFreightMode === undefined ? {} : { requestedFreightMode }),
        },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
  });
}

/**
 * Confirms a prepare into one order per counterparty.
 *
 * `idempotencyKey` IS A PARAMETER, not something this hook mints. It must be created once per attempt
 * in the component's state and reused across retries of that attempt — see `checkout-page.tsx`. If
 * this hook generated it, every retry would carry a new key and a network timeout followed by a retry
 * would produce two sets of orders.
 *
 * On success the cart is emptied SERVER-SIDE in the same transaction, so the cached cart is
 * invalidated rather than patched — the client does not know what an emptied cart's `updatedAt` is,
 * and guessing would be a fabricated value.
 */
export function useConfirmCheckout(): UseMutationResult<
  ActionResponse<ConfirmCheckout>,
  Error,
  {
    readonly prepare: CheckoutPrepare;
    readonly idempotencyKey: string;
    readonly deliveryAddressId?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prepare, idempotencyKey, deliveryAddressId }) =>
      confirmCheckout(
        {
          prepareId: prepare.prepareId,
          ...(deliveryAddressId === undefined ? {} : { deliveryAddressId }),
          // `settlementAgreements` omitted, which lands the orders on `direct_processor` — the
          // processor settles buyer straight to seller and nobody holds the funds in between.
          // Naming an agreement is an explicit act both parties negotiated first, and this surface
          // does not have one to name.
        },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.cart() });
    },
  });
}
