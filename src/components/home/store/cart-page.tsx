// TRANSPORT: client-query — reads and mutates the cart through React Query.
"use client";

// `/cart`. Replaces `<h1>Cart</h1>`.
//
// THREE THINGS THIS PAGE HAS TO GET RIGHT, all of them about not showing a number that is wrong.
//
//  1. A LINE THAT CANNOT BE PRICED STILL RENDERS, with its reason, and contributes NOTHING to the
//     totals. It does not contribute zero — a stale line silently valued at $0 would make the total
//     look like a bargain rather than a problem. And it does not fail the page: a cart never fails to
//     load because one line went stale.
//  2. THE TOTALS ARE PER CURRENCY AND ARE NEVER SUMMED. A basket spanning two sellers in two
//     currencies has two totals and no grand total; adding them would invent an FX rate.
//  3. NOTHING IS OPTIMISTIC. The stepper sends an intent and re-renders from whatever the server
//     returns — including a refusal. A quantity that appears to work and is then rejected is worse
//     than one that visibly waits.
//
// IT IS NOT GROUPED BY SELLER, AND IT SHOULD BE. STORE_STRUCTURE §11.1 asks for exactly that, and it
// is the right ask: checkout produces one order per counterparty, so the grouping a buyer sees here
// ought to be the grouping their orders will have.
//
// `CommerceCartItemProjection` carries no seller. It has `productId`, `variantId`, `title`, quantity
// and money — and nothing identifying who sells it. `CheckoutPrepareLineProjection` DOES carry
// `sellerOrganizationId`, so the split exists one step later, which is why this page can promise "one
// order per seller" in the totals copy while being unable to draw the boundary.
//
// The alternatives were both worse than waiting. Fetching each product to learn its seller is N
// requests to render a list. Guessing from the title is not a thing. So the page lists lines flat and
// says what it knows; `sellerOrganizationId` on the cart line is a one-field backend ask.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import CartLineRow from "@/components/home/store/sections/cart-line-row";
import { useCartQuery } from "@/hooks/store/cart";
import { formatCentsLabel } from "@/lib/store/format";
import type { CommerceCart } from "@/lib/store/cart.schemas";

type CartViewState =
  | { status: "loading" }
  | { status: "error"; message: string; isSignInRequired: boolean }
  | { status: "empty" }
  | { status: "ready"; cart: CommerceCart };

export default function CartPage() {
  const cartQuery = useCartQuery();

  const viewState = toCartViewState(cartQuery);

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">Cart</h1>
      </header>
      {renderCart(viewState)}
    </div>
  );
}

/**
 * Lifts the query into the union.
 *
 * `isPending` is the loading branch and NOT part of `ActionResponse`: a client island has a real
 * pending state, unlike a server component whose data is already awaited. That is why this union has
 * a `loading` member where the catalog pages' do not.
 */
function toCartViewState(cartQuery: ReturnType<typeof useCartQuery>): CartViewState {
  if (cartQuery.isPending) return { status: "loading" };

  // A thrown error rather than a tagged one — a transport that never resolved. Distinct from a
  // `success: false` payload, and rarer.
  if (cartQuery.isError) {
    return { status: "error", message: "Couldn't load your cart.", isSignInRequired: false };
  }

  const result = cartQuery.data;
  if (result === undefined) {
    return { status: "error", message: "Couldn't load your cart.", isSignInRequired: false };
  }
  if (!result.success) {
    return {
      status: "error",
      message: result.error.message,
      // 401 means "sign in". A 404 must NEVER become a sign-in prompt: the backend answers 404 for
      // "no access or no such thing" with one code so a stranger cannot probe which ids exist.
      isSignInRequired: result.error.code === "401",
    };
  }
  if (result.data.items.length === 0) return { status: "empty" };
  return { status: "ready", cart: result.data };
}

function renderCart(viewState: CartViewState) {
  switch (viewState.status) {
    case "loading":
      return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading your cart…</p>;
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StatusPanel
            message={viewState.message}
            className="border border-[#CAC4D0]/60 px-6 py-16"
            action={
              viewState.isSignInRequired ? (
                <Link
                  href="/sign-in"
                  className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
                >
                  Sign in
                </Link>
              ) : undefined
            }
          />
        </div>
      );
    case "empty":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StatusPanel
            message="Your cart is empty."
            className="border border-[#CAC4D0]/60 px-6 py-16"
            action={
              <Link
                href="/store"
                className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
              >
                Browse the store
              </Link>
            }
          />
        </div>
      );
    case "ready":
      return <CartBody cart={viewState.cart} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function CartBody({ cart }: { cart: CommerceCart }) {
  const unpriceableLineCount = cart.items.filter((item) => item.unitPriceInCents === null).length;

  return (
    <>
      {/* Stated ONCE at the top rather than only beside the offending line, because a buyer who
          scrolls straight to the total needs to know it does not cover everything in the list. */}
      {unpriceableLineCount > 0 && (
        <p className="mx-4 mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-4 text-amber-900 lg:mx-6">
          {unpriceableLineCount === 1
            ? "One item cannot be supplied as ordered and is not included in the totals below."
            : `${unpriceableLineCount} items cannot be supplied as ordered and are not included in the totals below.`}{" "}
          Fix or remove them to check out.
        </p>
      )}

      <ul className="mt-4 space-y-3 px-4 lg:px-6">
        {cart.items.map((item) => (
          // Product + variant + sample flag is the line's identity. Product alone would collide a
          // sample with its bulk line and make the stepper edit the wrong one.
          <li key={`${item.productId}-${item.variantId ?? "novariant"}-${String(item.isSample)}`}>
            <CartLineRow item={item} />
          </li>
        ))}
      </ul>

      <CartTotals cart={cart} canCheckOut={unpriceableLineCount === 0} />
    </>
  );
}

function CartTotals({ cart, canCheckOut }: { cart: CommerceCart; canCheckOut: boolean }) {
  return (
    <section aria-label="Cart totals" className="px-4 pt-6 lg:px-6">
      <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        {cart.currencyTotals.length === 0 ? (
          <p className="text-sm leading-5 text-[#6F7979]">
            Nothing in this cart can be priced right now.
          </p>
        ) : (
          <dl className="space-y-1">
            {cart.currencyTotals.map((total) => (
              <div key={total.currency} className="flex items-baseline justify-between gap-4">
                <dt className="text-xs leading-4 text-[#6F7979]">Subtotal, {total.currency}</dt>
                <dd className="text-sm leading-5 font-medium text-[#191C1C]">
                  {formatCentsLabel(total.totalInCents, total.currency)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {cart.currencyTotals.length > 1 && (
          <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
            Separate subtotals, not a sum — these sellers price in different currencies and Qatoto
            does not convert between them. You will get one order per seller.
          </p>
        )}

        {/* Said before checkout rather than after, because these are the costs that surprise people.
            Nothing is charged for freight at all today, which is why it is listed among the things
            that are not included rather than shown as a zero line. */}
        <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
          Taxes, duties, freight, insurance and any currency conversion are not included and are
          arranged separately.
        </p>

        <div className="mt-3 border-t border-[#CAC4D0]/60 pt-3">
          {canCheckOut ? (
            <Link
              href="/checkout"
              className="block rounded-full bg-[#00696E] px-5 py-2.5 text-center text-sm font-medium text-white"
            >
              Continue to checkout
            </Link>
          ) : (
            <>
              {/* Disabled rather than hidden, and it says why. Checkout preparation refuses a cart
                  with an unpriceable line outright — letting the buyer press this only to be refused
                  a screen later is a worse version of the same answer. */}
              <button
                type="button"
                disabled
                className="w-full rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                Continue to checkout
              </button>
              <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
                Every item has to be available before you can check out.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
