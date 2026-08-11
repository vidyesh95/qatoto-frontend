// TRANSPORT: props-only — writes the selection to shared client state, no network.
"use client";

// The variant strip in the buy column.
//
// A FLAT LIST, NOT ATTRIBUTE AXES, AND THAT IS DELIBERATE (backend A26). `commerce_product_variant`
// carries a `name`, not an `optionName`/`optionValue` pair, so "Sea blue × Large" is ONE opaque
// variant rather than two dimensions a buyer picks independently. Both reference markets are
// axis-based — Amazon's variation themes, Alibaba's multi-spec SKU grid — and the backend recorded
// this as deferred rather than missing: the flat list is the right shape until a category actually
// sells on two dimensions, and building axes early means migrating every row that has reached an
// order line snapshot. So this renders one strip, and it is not a bug.
//
// THE HEADING IS NOT "SELECT COLOR". It was, over a fixture whose variants happened to be colours.
// A variant is whatever the seller named it — a finish, a voltage, a pack size — and hardcoding one
// attribute makes every other category read as broken.

import Image from "next/image";

import { useProductSelection } from "@/components/home/store/sections/product-selection-context";
import { formatCentsLabel } from "@/lib/store/format";
import { STOCK_STATE_LABELS } from "@/lib/store/organizations.schemas";

export default function VariantPicker({ currency }: { readonly currency: string }) {
  const { variants, selectedVariantId, selectVariant } = useProductSelection();

  // A product with one variant offers no choice, and a picker with a single locked tile is noise.
  if (variants.length <= 1) return null;

  return (
    <div className="px-4 pt-2 lg:px-6">
      <p className="py-2 text-xs font-medium tracking-wide text-foreground">Select an option</p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          // The variant's own first image, not the product gallery's — the point of the tile is to
          // show what this option looks like.
          const tileImage = variant.images[0] ?? null;
          const isUnavailable = variant.stockState === "unavailable";

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => selectVariant(variant.id)}
              aria-pressed={isSelected}
              className="w-14 shrink-0 text-left disabled:opacity-40"
              disabled={isUnavailable}
              title={
                isUnavailable
                  ? `${variant.name} — ${STOCK_STATE_LABELS[variant.stockState]}`
                  : `${variant.name} — ${formatCentsLabel(variant.priceInCents, currency)}`
              }
            >
              <span
                className={`relative block aspect-square overflow-hidden rounded outline -outline-offset-1 ${
                  isSelected ? "outline-[#2A76FD]" : "outline-[#E0E3E3]"
                }`}
              >
                {tileImage === null ? (
                  <span className="grid size-full place-items-center bg-[#F2F4F4] text-[10px] font-medium text-[#6F7979]">
                    {variant.name.slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <Image
                    src={tileImage.url}
                    fill
                    sizes="56px"
                    alt={tileImage.altText ?? variant.name}
                    className="object-cover"
                  />
                )}
              </span>
              <span
                className={`mt-1 block truncate text-center text-xs font-medium tracking-wide ${
                  isSelected ? "text-[#2A76FD]" : "text-foreground"
                }`}
              >
                {variant.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
