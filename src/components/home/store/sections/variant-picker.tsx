// TRANSPORT: props-only — writes the selection to shared client state, no network.
"use client";

// The variant picker in the buy column, in one of two shapes (backend A26).
//
// FLAT LIST: a listing whose variants carry no options renders one strip of tiles, one per variant,
// exactly as before axes existed. Most listings are this, and nothing about them changed.
//
// OPTION AXES: a listing sold on Size × Colour renders one row of chips per axis, grouped by the
// server (`variantAxes`) so every client draws one order. The buyer still selects ONE variant — the
// unit the cart, the reservation and the order line record — and the chips are read off its
// options. A value that cannot be bought with the buyer's other choices is struck through, never
// signalled by colour alone, and stays clickable: clicking it moves the other axes to a combination
// that exists (`variant-selection.ts`). No swatch images yet; values are text.
//
// THE HEADING IS NOT "SELECT COLOR". It was, over a fixture whose variants happened to be colours.
// A variant is whatever the seller named it — a finish, a voltage, a pack size — and hardcoding one
// attribute makes every other category read as broken.

import Image from "next/image";

import { useProductSelection } from "@/components/home/store/sections/product-selection-context";
import { formatCentsLabel } from "@/lib/store/format";
import { STOCK_STATE_LABELS } from "@/lib/store/organizations.schemas";
import {
  findVariantForOptionValue,
  isOptionValueAvailableWithCurrentChoices,
} from "@/lib/store/variant-selection";

export default function VariantPicker({ currency }: { readonly currency: string }) {
  const { variants, variantAxes } = useProductSelection();

  // A product with one variant offers no choice, and a picker with a single locked tile is noise.
  if (variants.length <= 1) return null;
  if (variantAxes.length > 0) return <VariantAxisPicker />;
  return <VariantTileStrip currency={currency} />;
}

/** A26. One chip row per option axis. */
function VariantAxisPicker() {
  const { variants, variantAxes, selectedVariant, selectVariant } = useProductSelection();
  const selectedImage = selectedVariant?.images[0] ?? null;

  return (
    <div className="flex flex-col gap-3 px-4 pt-2 pb-2 lg:px-6">
      {variantAxes.map((axis, axisIndex) => {
        const selectedValue = selectedVariant?.options[axisIndex]?.value ?? null;
        return (
          <fieldset key={axis.name} className="flex flex-col gap-2">
            <legend className="pb-2 text-xs font-medium tracking-wide text-foreground">
              {axis.name}
              {selectedValue !== null && (
                <span className="text-muted-foreground">: {selectedValue}</span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {axis.values.map((value) => {
                const isSelected = value === selectedValue;
                const isAvailable =
                  isSelected ||
                  isOptionValueAvailableWithCurrentChoices(
                    variants,
                    selectedVariant,
                    axisIndex,
                    value,
                  );
                const otherChoicesLabel = (selectedVariant?.options ?? [])
                  .filter((_, optionIndex) => optionIndex !== axisIndex)
                  .map((option) => option.value)
                  .join(" / ");
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isSelected}
                    title={
                      isAvailable || otherChoicesLabel.length === 0
                        ? undefined
                        : `Not available with ${otherChoicesLabel}`
                    }
                    onClick={() => {
                      const nextVariant = findVariantForOptionValue(
                        variants,
                        selectedVariant,
                        axisIndex,
                        value,
                      );
                      if (nextVariant !== null) selectVariant(nextVariant.id);
                    }}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-transparent bg-primary-imprint text-primary-imprint-foreground"
                        : isAvailable
                          ? "border-border bg-background/70 text-foreground hover:bg-secondary/50"
                          : "border-border bg-background/70 text-muted-foreground line-through hover:bg-secondary/50"
                    }`}
                  >
                    {value}
                    {!isAvailable && (
                      <span className="sr-only"> (not available with your other choices)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* The selected variant's own picture, because the gallery is the product's and the chips
          are text: without this a variant's images would show nowhere once a listing has axes. */}
      {selectedVariant !== null && selectedImage !== null && (
        <div className="flex items-center gap-3">
          <span className="relative block size-14 shrink-0 overflow-hidden rounded outline -outline-offset-1 outline-border">
            <Image
              src={selectedImage.url}
              fill
              sizes="56px"
              alt={selectedImage.altText ?? selectedVariant.name}
              className="object-cover"
            />
          </span>
          <span className="text-xs font-medium text-foreground">{selectedVariant.name}</span>
        </div>
      )}
    </div>
  );
}

/** The flat-list strip: one tile per variant. */
function VariantTileStrip({ currency }: { readonly currency: string }) {
  const { variants, selectedVariantId, selectVariant } = useProductSelection();

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
                  isSelected ? "outline-primary-imprint" : "outline-border"
                }`}
              >
                {tileImage === null ? (
                  <span className="grid size-full place-items-center bg-muted text-xs font-medium text-outline-strong">
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
                  isSelected ? "text-primary-imprint" : "text-foreground"
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
