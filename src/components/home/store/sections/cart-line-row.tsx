// TRANSPORT: client-query — owns the quantity mutation for one line.
"use client";

// One cart line: what it is, what it costs, and a stepper that goes through the server.
//
// THE STEPPER IS NOT LOCAL STATE. It reads the quantity from the cart the server returned and sends a
// desired quantity on every press. There is no `useState` mirroring it, deliberately: a local number
// that drifts from the server's is how a buyer ends up looking at a quantity nobody has priced. The
// input is disabled while the mutation is in flight, which is the honest way to show that a number is
// not yet a fact.
//
// A LINE THAT COULD NOT BE PRICED SHOWS ITS REASON, NOT A ZERO. `currency`, `unitPriceInCents` and
// `lineTotalInCents` arrive null together and `pricingError` says why — and "only 3 left" is something
// the buyer can act on, whereas `$0.00` is a lie about the price of a thing they cannot have.

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { useRemoveCartItem, useSetCartItem } from "@/hooks/store/cart";
import type { CommerceCartItem } from "@/lib/store/cart.schemas";
import { formatCentsLabel, formatCountLabel } from "@/lib/store/format";
import { pricingErrorLabel } from "@/lib/store/merchandising.schemas";
import { STOCK_STATE_LABELS } from "@/lib/store/organizations.schemas";

export default function CartLineRow({ item }: { item: CommerceCartItem }) {
  const setCartItem = useSetCartItem();
  const removeCartItem = useRemoveCartItem();

  const isMutating = setCartItem.isPending || removeCartItem.isPending;

  // The MOQ floor for a bulk line, and 1 for a sample — a sample bypasses the minimum order quantity
  // because a minimum expresses bulk economics and a sample is the negation of bulk. The server
  // enforces this; the stepper only avoids sending a value it already knows will be refused.
  const minimumQuantity = item.isSample ? 1 : (item.minimumOrderQuantity ?? 1);

  // And the ceiling, which only a sample line has. A bulk line has a floor it may walk up from —
  // that is what a tier ladder is for — while a sample is bounded above because the bypass of the
  // ladder and the MOQ only holds while the line stays small.
  //
  // FAILS CLOSED ON NULL. A sample line that did not price reports no ceiling, and an unknown
  // ceiling is not an absent one: on a refundable listing the quantity is what sizes the credit,
  // so the stepper refuses to raise it rather than guessing the seller allows more.
  const maximumQuantity = item.isSample ? item.maximumSampleQuantity : null;
  const isAtMaximumQuantity =
    item.isSample && (maximumQuantity === null || item.quantity >= maximumQuantity);

  const submitQuantity = (quantity: number) => {
    if (quantity < minimumQuantity) return;
    if (maximumQuantity !== null && quantity > maximumQuantity) return;
    if (item.isSample && maximumQuantity === null && quantity > item.quantity) return;
    setCartItem.mutate({
      productId: item.productId,
      input: {
        quantity,
        // Both flags travel with every write: they are part of the line's identity, so omitting one
        // would edit — or create — a different line.
        ...(item.variantId === null ? {} : { variantId: item.variantId }),
        isSample: item.isSample,
      },
    });
  };

  const priceLabel =
    item.currency === null || item.unitPriceInCents === null
      ? null
      : formatCentsLabel(item.unitPriceInCents, item.currency);
  const lineTotalLabel =
    item.currency === null || item.lineTotalInCents === null
      ? null
      : formatCentsLabel(item.lineTotalInCents, item.currency);

  return (
    <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-[#191C1C]">{item.title}</p>

        {/* A sample and a bulk line of the same product are two entries, so the badge is what tells
            them apart at a glance. */}
        {item.isSample && (
          <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]">
            Sample
          </span>
        )}

        {item.isMadeToOrder === true && (
          <span className="rounded bg-[#F2F4F4] px-1.5 py-0.5 text-[11px] leading-4 font-medium text-[#6F7979]">
            Made to order
          </span>
        )}
      </div>

      {item.variantName !== null && (
        <p className="text-xs leading-4 text-[#6F7979]">{item.variantName}</p>
      )}

      {/* Only an unusual stock state earns a line. "In stock" on every row is noise, and `stockState`
          is optional on the wire so its absence is not a state to render either.

          `made_to_order` is ALSO excluded, because `isMadeToOrder` already put that badge above — the
          first version of this row rendered "Made to order" twice, once from each field. They are two
          spellings of one fact, and the badge is the better placement. */}
      {item.stockState !== undefined &&
        item.stockState !== "in_stock" &&
        item.stockState !== "made_to_order" && (
          <p className="text-xs leading-4 text-[#6F7979]">{STOCK_STATE_LABELS[item.stockState]}</p>
        )}

      {item.pricingError !== undefined && (
        <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs leading-4 text-amber-900">
          {pricingErrorLabel(item.pricingError)}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => submitQuantity(item.quantity - 1)}
            disabled={isMutating || item.quantity <= minimumQuantity}
            aria-label={`Reduce quantity of ${item.title}`}
            className="grid size-8 cursor-pointer place-items-center rounded-full outline -outline-offset-1 outline-[#6F7979] disabled:opacity-40"
          >
            −
          </button>

          {/* Rendered, not editable. A free-text quantity would need debouncing, and a debounced
              write to a stock reservation is a race the buyer loses silently. */}
          <span className="min-w-12 text-center text-sm font-medium text-[#191C1C]">
            {formatCountLabel(item.quantity)}
          </span>

          <button
            type="button"
            onClick={() => submitQuantity(item.quantity + 1)}
            disabled={isMutating || isAtMaximumQuantity}
            aria-label={`Increase quantity of ${item.title}`}
            className="grid size-8 cursor-pointer place-items-center rounded-full outline -outline-offset-1 outline-[#6F7979] disabled:opacity-40"
          >
            +
          </button>

          {item.minimumOrderQuantity !== null && !item.isSample && (
            <span className="text-[11px] leading-4 text-[#6F7979]">
              min {formatCountLabel(item.minimumOrderQuantity)}
            </span>
          )}

          {/* The sample line's mirror image of the `min` hint. Rendered only when the ceiling is
              known — a line that did not price has its stepper disabled and its reason above, and
              a `max` with no number beside it would read as a bug rather than as caution. */}
          {item.isSample && maximumQuantity !== null && (
            <span className="text-[11px] leading-4 text-[#6F7979]">
              max {formatCountLabel(maximumQuantity)}
            </span>
          )}
        </div>

        <div className="text-right">
          {lineTotalLabel === null ? (
            <p className="text-xs leading-4 text-[#6F7979]">Not priced</p>
          ) : (
            <>
              <p className="text-sm leading-5 font-medium text-[#191C1C]">{lineTotalLabel}</p>
              {priceLabel !== null && (
                <p className="text-[11px] leading-4 text-[#6F7979]">{priceLabel} each</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            removeCartItem.mutate({
              productId: item.productId,
              // BOTH halves of the line's identity, for the same reason the quantity write sends
              // both: variant alone does not name a line. A sample line and a bulk line of one
              // product share a product id and a variant id, so omitting `isSample` removed the
              // pair — which is exactly the pair samples exist to let a buyer hold.
              input: {
                ...(item.variantId === null ? {} : { variantId: item.variantId }),
                isSample: item.isSample,
              },
            })
          }
          disabled={isMutating}
          className="cursor-pointer text-xs font-medium text-[#00696E] disabled:opacity-40"
        >
          Remove
        </button>

        {isMutating && <span className="text-[11px] leading-4 text-[#6F7979]">Updating…</span>}
      </div>

      {/* Two notices, one per mutation — see `shared/mutation-notice.tsx` for why a refusal renders
          the server's own sentence rather than a house error string. */}
      <MutationNotice
        result={setCartItem.data}
        fallbackMessage="Couldn't update that line."
        hasThrown={setCartItem.isError}
      />
      <MutationNotice
        result={removeCartItem.data}
        fallbackMessage="Couldn't remove that line."
        hasThrown={removeCartItem.isError}
      />
    </div>
  );
}
