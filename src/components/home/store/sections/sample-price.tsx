// TRANSPORT: props-only — renders server-owned values, no network.
"use client";

// The sample row under the price chart. Lets a buyer order ONE unit at the sample rate before
// committing to a bulk order.
//
// THREE STATES, NOT ONE, AND `null` IS NOT FREE. `samplePolicy` says whether a sample can be had at
// all, and `samplePriceInCents` says what it costs — separately, because they answer different
// questions:
//
//   `unavailable`          -> the seller declined to offer samples. Render nothing; a disabled
//                             "Get sample" button invites a buyer to keep trying.
//   `paid`/`refundable` with a price   -> the price, plus whether it comes back on an order.
//   `paid`/`refundable` with `null`    -> samples ARE offered and the seller has not published a
//                             price. "Price on request", never "$0" and never "Free".
//
// The mock rendered one hardcoded string for all three, which is how an unstated price becomes a
// quoted one.
//
// A SAMPLE IS A CART LINE, NOT A SEPARATE FLOW. `isSample: true` on `PUT /commerce/cart/items/:id`
// is the whole mechanism — the server prices it from the sample rate and resolves the credit
// against the eventual order at confirm. So this reuses the cart mutation rather than inventing a
// parallel one.

import Link from "next/link";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { useProductSelection } from "@/components/home/store/sections/product-selection-context";
import { useCartQuery, useSetCartItem } from "@/hooks/store/cart";
import { useSession } from "@/lib/auth-client";
import { formatCentsLabel } from "@/lib/store/format";
import type { PRODUCT_SAMPLE_POLICIES } from "@/lib/store/organizations.schemas";

type SamplePolicy = (typeof PRODUCT_SAMPLE_POLICIES)[number];

export default function SamplePrice({
  productId,
  samplePolicy,
  samplePriceInCents,
  currency,
  hasVariants,
}: {
  readonly productId: string;
  readonly samplePolicy: SamplePolicy;
  readonly samplePriceInCents: number | null;
  readonly currency: string;
  readonly hasVariants: boolean;
}) {
  const { selectedVariantId } = useProductSelection();
  const { data: session, isPending: isSessionPending } = useSession();
  const isSignedIn = session !== null && session !== undefined;
  const cartQuery = useCartQuery({ isEnabled: isSignedIn });
  const setCartItem = useSetCartItem();

  // A stated refusal. Nothing to render — see the header comment.
  if (samplePolicy === "unavailable") return null;

  const cartResult = cartQuery.data;
  const cart = cartResult !== undefined && cartResult.success ? cartResult.data : null;
  const isVariantMissing = hasVariants && selectedVariantId === null;
  const canOrderSample =
    cart !== null && !setCartItem.isPending && !isVariantMissing && !isSessionPending;

  // A sample is ONE unit. Not the minimum order quantity — that is the bulk term, and a "sample"
  // of 50 sets is not a sample.
  const handleGetSampleClick = () => {
    if (cart === null) return;
    setCartItem.mutate({
      productId,
      input: {
        quantity: 1,
        ...(selectedVariantId === null ? {} : { variantId: selectedVariantId }),
        isSample: true,
      },
    });
  };

  return (
    <div className="px-4 py-2 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-[#191C1C]">
            Sample price:{" "}
            <span className="font-medium">
              {samplePriceInCents === null
                ? "Price on request"
                : formatCentsLabel(samplePriceInCents, currency)}
            </span>
          </p>
          {samplePolicy === "refundable" && (
            <p className="text-xs leading-4 text-[#6F7979]">
              Refunded against your order when you buy in bulk.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleGetSampleClick}
          disabled={!canOrderSample}
          className="shrink-0 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] disabled:opacity-40"
        >
          {setCartItem.isPending ? "Adding…" : "Get sample"}
        </button>
      </div>

      {!isSessionPending && !isSignedIn && (
        <p className="mt-1 text-xs leading-4 text-[#6F7979]">
          <Link href="/sign-in" className="font-medium text-[#00696E]">
            Sign in
          </Link>{" "}
          to order a sample.
        </p>
      )}

      <MutationNotice
        result={setCartItem.data}
        fallbackMessage="Couldn't add that sample to your cart."
        hasThrown={setCartItem.isError}
      />
    </div>
  );
}
