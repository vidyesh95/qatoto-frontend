// TRANSPORT: client-query — "Add to cart" writes through React Query; the other two are still inert.
"use client";

// The three buy CTAs — rendered twice on the PDP: in the mobile/tablet fixed bottom bar and inline at
// the end of the desktop buy column. Keep the button classes identical between the two render sites.
//
// THE ADD IS ADDITIVE, AND IT IS COMPUTED FROM THE AUTHORITATIVE CART. `PUT /commerce/cart/items/:id`
// SETS a desired quantity — it does not increment — so a button that posted the chosen quantity flat
// would silently knock a line a colleague had built up to 120 back down to 50. The cart belongs to a
// buyer ORGANIZATION, so that colleague is not hypothetical. This therefore reads the cart, finds the
// matching line, and sends `existing + chosen`.
//
// That read-modify-write can lose a race, and it is the same one the cart page's stepper already
// takes (`sections/cart-line-row.tsx` sends `item.quantity + 1` against this endpoint). The server
// stays the authority: it re-prices, it can refuse, and its response replaces the cached cart whole.
//
// WITHOUT AN AUTHORITATIVE CART, THE BUTTON IS DISABLED RATHER THAN OPTIMISTIC. If the read is
// pending or refused there is no `existing` to add to, and guessing zero is exactly the overwrite the
// paragraph above exists to prevent.
//
// NOTHING HERE IS OPTIMISTIC, and the confirmation is read back off the cart the server returned
// rather than off the quantity that was requested — those differ the moment the server clamps,
// refuses or prices differently than expected.

import Link from "next/link";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { useProductQuantity } from "@/components/home/store/sections/product-quantity-context";
import { useCartQuery, useSetCartItem } from "@/hooks/store/cart";
import { useSession } from "@/lib/auth-client";
import type { CommerceCart } from "@/lib/store/cart.schemas";
import { formatCountLabel } from "@/lib/store/format";

interface BuyActionButtonsProps {
  readonly productId: string;
  /** Null only for a product with no active variants; `prd_folding_chair` refuses that. */
  readonly variantId: string | null;
}

/**
 * The BULK line for this product and variant — never the sample.
 *
 * Product + variant + `isSample` is a line's identity, the same three parts the cart page keys its
 * rows on. Matching on the product alone would find a sample line and grow it by the bulk minimum,
 * which is the negation of what a sample is for.
 */
function findBulkCartLine(cart: CommerceCart, productId: string, variantId: string | null) {
  return (
    cart.items.find(
      (item) => item.productId === productId && item.variantId === variantId && !item.isSample,
    ) ?? null
  );
}

export default function BuyActionButtons({ productId, variantId }: BuyActionButtonsProps) {
  // The quantity the buyer set on the price chart's stepper, not a constant — the field is visible on
  // the page and an add that ignored it would put a different number in the cart than the one the
  // buyer is looking at.
  const { quantity } = useProductQuantity();

  // THE PRODUCT PAGE IS PUBLIC, so the cart read is gated on the session. Without the gate every
  // anonymous visitor to a product fires a read that can only come back 401.
  const { data: session, isPending: isSessionPending } = useSession();
  const isSignedIn = session !== null && session !== undefined;

  // `useCartQuery`, not the navbar's badge hook: this one refetches on mount, and a stale quantity is
  // what the addition would be computed from.
  const cartQuery = useCartQuery({ isEnabled: isSignedIn });
  const setCartItem = useSetCartItem();

  const cartResult = cartQuery.data;
  const cart = cartResult !== undefined && cartResult.success ? cartResult.data : null;

  // Two ways to land here: the session says signed out, or the cart read itself answered 401.
  const isSignInRequired =
    !isSessionPending &&
    (!isSignedIn ||
      (cartResult !== undefined && !cartResult.success && cartResult.error.code === "401"));

  // A DISABLED QUERY STAYS `isPending` FOREVER, so "still loading" cannot be read off the query alone
  // — a signed-out visitor would sit at a permanent pending state and never be told why the button is
  // dead. Loading means the session is resolving, or a query that actually ran has not answered yet.
  const isCartLoading = isSessionPending || (isSignedIn && cartQuery.isPending);

  const canAddToCart = cart !== null && !setCartItem.isPending;

  const handleAddToCartClick = () => {
    if (cart === null) return;
    const existingQuantity = findBulkCartLine(cart, productId, variantId)?.quantity ?? 0;
    setCartItem.mutate({
      productId,
      input: {
        quantity: existingQuantity + quantity,
        ...(variantId === null ? {} : { variantId }),
        isSample: false,
      },
    });
  };

  const addResult = setCartItem.data;
  const confirmedLine =
    addResult !== undefined && addResult.success
      ? findBulkCartLine(addResult.data, productId, variantId)
      : null;

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* INERT, DELIBERATELY. An inquiry is the RFQ path — `POST /commerce/products/:productId/
            inquiries`, promotable into `POST /commerce/rfqs` — which is its own surface with its own
            draft, invitations and quote thread. It is not a variation on adding to a cart. */}
        <button
          type="button"
          className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          Send inquiry
        </button>
        <button
          type="button"
          onClick={handleAddToCartClick}
          disabled={!canAddToCart}
          className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] disabled:opacity-40"
        >
          {setCartItem.isPending ? "Adding…" : "Add to cart"}
        </button>
        {/* INERT, DELIBERATELY, AND THIS ONE IS ABOUT MONEY. "Buy now" would have to add the line and
            send the buyer to `/checkout` — and checkout prepares the ENTIRE cart: it reserves stock
            against every other seller's lines and confirms into one order per counterparty. A button
            labelled as buying this chair that reserves stock across three sellers is a false
            statement about what the buyer just committed to. It stays inert until there is a
            single-line checkout to send it to. */}
        <button
          type="button"
          className="flex-1 rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white"
        >
          Buy now
        </button>
      </div>

      {/* Why the button is disabled, when it is disabled for a reason the buyer can act on. A
          disabled control with no explanation reads as a broken page. */}
      {cart === null && !isCartLoading && (
        <p className="mt-1 text-xs leading-4 text-[#6F7979]">
          {isSignInRequired ? (
            <>
              <Link href="/sign-in" className="font-medium text-[#00696E]">
                Sign in
              </Link>{" "}
              to add this to your cart.
            </>
          ) : (
            "Couldn't reach your cart, so this can't be added right now."
          )}
        </p>
      )}

      {confirmedLine !== null && (
        <p className="mt-1 text-xs leading-4 text-[#6F7979]">
          {formatCountLabel(confirmedLine.quantity)} in your cart.{" "}
          <Link href="/cart" className="font-medium text-[#00696E]">
            View cart
          </Link>
        </p>
      )}

      <MutationNotice
        result={setCartItem.data}
        fallbackMessage="Couldn't add that to your cart."
        hasThrown={setCartItem.isError}
      />
    </div>
  );
}
