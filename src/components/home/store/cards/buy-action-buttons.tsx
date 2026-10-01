// TRANSPORT: client-query — "Add to cart" and "Buy now" both write through React Query; "Request a
// quote" is a real link to the RFQ composer. All three controls are live.
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
import { useRouter } from "next/navigation";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { useProductSelection } from "@/components/home/store/sections/product-selection-context";
import { useCartQuery, useSetCartItem } from "@/hooks/store/cart";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import type { CommerceCart } from "@/lib/store/cart.schemas";
import { formatCountLabel } from "@/lib/store/format";
import { SELLING_STATE_LABELS, type ProductSellingState } from "@/lib/store/organizations.schemas";

interface BuyActionButtonsProps {
  readonly productId: string;
  /**
   * The product's public slug, carried to the RFQ composer so it can look this listing up and seed
   * the first request line from it.
   *
   * THE SLUG RATHER THAN THE ID, because `GET /store/products/:productSlug` is the read the
   * composer's route has — the id would need a second lookup nothing offers publicly.
   */
  readonly productSlug: string;
  /** What the SERVER saw. Seeds the first render so it matches the HTML — see `useViewerSignedIn`. */
  readonly isViewerSignedIn: boolean;
  /**
   * Whether this product requires a variant before it can be added.
   *
   * Straight off `product.hasVariants`. When it is true and nothing is selected the server answers
   * `VARIANT_REQUIRED`, so the button is disabled with a reason rather than firing a refusal.
   */
  readonly hasVariants: boolean;
  /**
   * §21.2. Whether the seller still sells this. `paused` and `discontinued` both suppress the buy
   * controls; the difference is the sentence underneath.
   */
  readonly sellingState: ProductSellingState;
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

interface NotSellingPanelProps {
  sellingState: Exclude<ProductSellingState, "selling">;
  requestQuoteHref: string;
}

function NotSellingPanel({ sellingState, requestQuoteHref }: NotSellingPanelProps) {
  return (
    <div className="w-full">
      <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-4 text-destructive">
        <span className="font-medium">{SELLING_STATE_LABELS[sellingState]}.</span>{" "}
        {sellingState === "discontinued"
          ? "This listing is no longer sold. Any replacements the seller has listed are shown below."
          : "The seller has paused this listing, so it cannot be ordered right now."}
      </p>
      <Link
        href={requestQuoteHref}
        className="flex w-full items-center justify-center rounded-full bg-background px-4 py-1.5 text-xs font-medium text-primary-imprint outline -outline-offset-1 outline-outline-strong"
      >
        Request a quote
      </Link>
    </div>
  );
}

interface BuyActionControlsProps {
  requestQuoteHref: string;
  onAddToCart: () => void;
  onBuyNow: () => void;
  canAddToCart: boolean;
  isPending: boolean;
}

function BuyActionControls({
  requestQuoteHref,
  onAddToCart,
  onBuyNow,
  canAddToCart,
  isPending,
}: BuyActionControlsProps) {
  return (
    <div className="flex gap-2">
      <Link
        href={requestQuoteHref}
        className="flex flex-1 items-center justify-center rounded-full bg-background px-4 py-1.5 text-xs font-medium text-primary-imprint outline -outline-offset-1 outline-outline-strong"
      >
        Request a quote
      </Link>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={!canAddToCart}
        className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-primary-imprint outline -outline-offset-1 outline-outline-strong disabled:opacity-40"
      >
        {isPending ? "Adding…" : "Add to cart"}
      </button>
      <button
        type="button"
        onClick={onBuyNow}
        disabled={!canAddToCart}
        className="flex-1 rounded-full bg-primary-imprint px-4 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-40"
      >
        {isPending ? "Starting…" : "Buy now"}
      </button>
    </div>
  );
}

interface BuyActionFeedbackProps {
  isVariantMissing: boolean;
  cart: CommerceCart | null;
  isCartLoading: boolean;
  isSignInRequired: boolean;
  confirmedLine: ReturnType<typeof findBulkCartLine>;
}

function BuyActionFeedback({
  isVariantMissing,
  cart,
  isCartLoading,
  isSignInRequired,
  confirmedLine,
}: BuyActionFeedbackProps) {
  return (
    <>
      {isVariantMissing && (
        <p className="mt-1 text-xs leading-4 text-outline-strong">Choose an option to continue.</p>
      )}

      {cart === null && !isCartLoading && (
        <p className="mt-1 text-xs leading-4 text-outline-strong">
          {isSignInRequired ? (
            <>
              <Link href="/sign-in" className="font-medium text-primary-imprint">
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
        <p className="mt-1 text-xs leading-4 text-outline-strong">
          {formatCountLabel(confirmedLine.quantity)} in your cart.{" "}
          <Link href="/cart" className="font-medium text-primary-imprint">
            View cart
          </Link>
        </p>
      )}
    </>
  );
}

export default function BuyActionButtons({
  productId,
  productSlug,
  hasVariants,
  sellingState,
  isViewerSignedIn,
}: BuyActionButtonsProps) {
  const requestQuoteHref = `/store/rfqs/new?productSlug=${encodeURIComponent(productSlug)}`;
  const { quantity, selectedVariantId } = useProductSelection();
  const variantId = selectedVariantId;
  const isVariantMissing = hasVariants && variantId === null;
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);

  const router = useRouter();
  const cartQuery = useCartQuery({ isEnabled: isSignedIn });
  const setCartItem = useSetCartItem();

  const cartResult = cartQuery.data;
  const cart = cartResult !== undefined && cartResult.success ? cartResult.data : null;

  const isSignInRequired =
    !isSignedIn ||
    (cartResult !== undefined && !cartResult.success && cartResult.error.code === "401");

  const isCartLoading = isSignedIn && cartQuery.isPending;
  const canAddToCart = cart !== null && !setCartItem.isPending && !isVariantMissing;

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

  const handleBuyNowClick = () => {
    if (cart === null) return;
    const existingQuantity = findBulkCartLine(cart, productId, variantId)?.quantity ?? 0;
    setCartItem.mutate(
      {
        productId,
        input: {
          quantity: existingQuantity + quantity,
          ...(variantId === null ? {} : { variantId }),
          isSample: false,
        },
      },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          const parameters = new URLSearchParams({ buyNow: productId });
          if (variantId !== null) parameters.set("variantId", variantId);
          router.push(`/checkout?${parameters.toString()}`);
        },
      },
    );
  };

  const addResult = setCartItem.data;
  const confirmedLine =
    addResult !== undefined && addResult.success
      ? findBulkCartLine(addResult.data, productId, variantId)
      : null;

  if (sellingState !== "selling") {
    return <NotSellingPanel sellingState={sellingState} requestQuoteHref={requestQuoteHref} />;
  }

  return (
    <div className="w-full">
      <BuyActionControls
        requestQuoteHref={requestQuoteHref}
        onAddToCart={handleAddToCartClick}
        onBuyNow={handleBuyNowClick}
        canAddToCart={canAddToCart}
        isPending={setCartItem.isPending}
      />

      <BuyActionFeedback
        isVariantMissing={isVariantMissing}
        cart={cart}
        isCartLoading={isCartLoading}
        isSignInRequired={isSignInRequired}
        confirmedLine={confirmedLine}
      />

      <MutationNotice
        result={setCartItem.data}
        fallbackMessage="Couldn't add that to your cart."
        hasThrown={setCartItem.isError}
      />
    </div>
  );
}
