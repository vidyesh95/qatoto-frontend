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

function CartLineBadgesAndStatus({ item }: { item: CommerceCartItem }) {
  return (
    <>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">{item.title}</p>
        {item.isSample && (
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs leading-4 font-medium text-primary-imprint">
            Sample
          </span>
        )}
        {item.isMadeToOrder === true && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs leading-4 font-medium text-outline-strong">
            Made to order
          </span>
        )}
      </div>

      {item.variantName !== null && (
        <p className="text-xs leading-4 text-outline-strong">{item.variantName}</p>
      )}

      {item.stockState !== undefined &&
        item.stockState !== "in_stock" &&
        item.stockState !== "made_to_order" && (
          <p className="text-xs leading-4 text-outline-strong">
            {STOCK_STATE_LABELS[item.stockState]}
          </p>
        )}

      {item.pricingError !== undefined && (
        <p className="mt-1 rounded bg-warning-container px-2 py-1 text-xs leading-4 text-warning-container-foreground">
          {pricingErrorLabel(item.pricingError)}
        </p>
      )}
    </>
  );
}

function CartLinePriceDisplay({ item }: { item: CommerceCartItem }) {
  const priceLabel =
    item.currency === null || item.unitPriceInCents === null
      ? null
      : formatCentsLabel(item.unitPriceInCents, item.currency);
  const lineTotalLabel =
    item.currency === null || item.lineTotalInCents === null
      ? null
      : formatCentsLabel(item.lineTotalInCents, item.currency);

  if (lineTotalLabel === null) {
    return (
      <div className="text-right">
        <p className="text-xs leading-4 text-outline-strong">Not priced</p>
      </div>
    );
  }

  return (
    <div className="text-right">
      <p className="text-sm leading-5 font-medium text-foreground">{lineTotalLabel}</p>
      {priceLabel !== null && (
        <p className="text-xs leading-4 text-outline-strong">{priceLabel} each</p>
      )}
    </div>
  );
}

interface CartLineQuantityStepperProps {
  item: CommerceCartItem;
  isMutating: boolean;
  minimumQuantity: number;
  maximumQuantity: number | null;
  isAtMaximumQuantity: boolean;
  onQuantitySubmit: (quantity: number) => void;
}

function CartLineQuantityStepper({
  item,
  isMutating,
  minimumQuantity,
  maximumQuantity,
  isAtMaximumQuantity,
  onQuantitySubmit,
}: CartLineQuantityStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onQuantitySubmit(item.quantity - 1)}
        disabled={isMutating || item.quantity <= minimumQuantity}
        aria-label={`Reduce quantity of ${item.title}`}
        className="grid size-8 cursor-pointer place-items-center rounded-full outline -outline-offset-1 outline-outline-strong disabled:opacity-40"
      >
        −
      </button>

      <span className="min-w-12 text-center text-sm font-medium text-foreground">
        {formatCountLabel(item.quantity)}
      </span>

      <button
        type="button"
        onClick={() => onQuantitySubmit(item.quantity + 1)}
        disabled={isMutating || isAtMaximumQuantity}
        aria-label={`Increase quantity of ${item.title}`}
        className="grid size-8 cursor-pointer place-items-center rounded-full outline -outline-offset-1 outline-outline-strong disabled:opacity-40"
      >
        +
      </button>

      {item.minimumOrderQuantity !== null && !item.isSample && (
        <span className="text-xs leading-4 text-outline-strong">
          min {formatCountLabel(item.minimumOrderQuantity)}
        </span>
      )}

      {item.isSample && maximumQuantity !== null && (
        <span className="text-xs leading-4 text-outline-strong">
          max {formatCountLabel(maximumQuantity)}
        </span>
      )}
    </div>
  );
}

export default function CartLineRow({ item }: { item: CommerceCartItem }) {
  const setCartItem = useSetCartItem();
  const removeCartItem = useRemoveCartItem();

  const isMutating = setCartItem.isPending || removeCartItem.isPending;
  const minimumQuantity = item.isSample ? 1 : (item.minimumOrderQuantity ?? 1);
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
        ...(item.variantId === null ? {} : { variantId: item.variantId }),
        isSample: item.isSample,
      },
    });
  };

  return (
    <div className="rounded-xl border border-outline-variant/60 px-4 py-3">
      <CartLineBadgesAndStatus item={item} />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <CartLineQuantityStepper
          item={item}
          isMutating={isMutating}
          minimumQuantity={minimumQuantity}
          maximumQuantity={maximumQuantity}
          isAtMaximumQuantity={isAtMaximumQuantity}
          onQuantitySubmit={submitQuantity}
        />

        <CartLinePriceDisplay item={item} />
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            removeCartItem.mutate({
              productId: item.productId,
              input: {
                ...(item.variantId === null ? {} : { variantId: item.variantId }),
                isSample: item.isSample,
              },
            })
          }
          disabled={isMutating}
          className="cursor-pointer text-xs font-medium text-primary-imprint disabled:opacity-40"
        >
          Remove
        </button>

        {isMutating && <span className="text-xs leading-4 text-outline-strong">Updating…</span>}
      </div>

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
