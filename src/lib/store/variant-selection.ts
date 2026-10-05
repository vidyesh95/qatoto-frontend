// The A26 axis picker's two decisions, kept pure so they read the same everywhere they are asked.
//
// ⚠️ A CLICK ALWAYS LANDS ON A REAL VARIANT. The page holds ONE selected variant, never a set of
// per-axis choices, so there is no state in which the buyer has picked "Blue" and "Large" and
// nothing exists for it. Choosing a value moves to the variant that has it and keeps as many of the
// buyer's other choices as it can — the way Amazon's and Shopify's pickers behave — rather than
// refusing the click.
import type { ProductVariant } from "@/lib/store/products.schemas";

function readOptionValue(variant: ProductVariant, axisIndex: number): string | undefined {
  return variant.options[axisIndex]?.value;
}

/** How many axes other than `axisIndex` this variant shares with the current one. */
function countSharedOtherAxes(
  candidate: ProductVariant,
  currentVariant: ProductVariant | null,
  axisIndex: number,
): number {
  if (currentVariant === null) return 0;
  return candidate.options.filter(
    (option, optionIndex) =>
      optionIndex !== axisIndex && option.value === readOptionValue(currentVariant, optionIndex),
  ).length;
}

/**
 * The variant a click on `value` of axis `axisIndex` selects: one that has the value, preferring
 * one the buyer can actually buy, then the most of their other choices, then the seller's order.
 */
export function findVariantForOptionValue(
  variants: readonly ProductVariant[],
  currentVariant: ProductVariant | null,
  axisIndex: number,
  value: string,
): ProductVariant | null {
  const candidates = variants.filter((variant) => readOptionValue(variant, axisIndex) === value);
  const ranked = candidates.toSorted((first, second) => {
    const firstIsBuyable = first.stockState !== "unavailable" ? 1 : 0;
    const secondIsBuyable = second.stockState !== "unavailable" ? 1 : 0;
    if (firstIsBuyable !== secondIsBuyable) return secondIsBuyable - firstIsBuyable;
    const sharedAxisDifference =
      countSharedOtherAxes(second, currentVariant, axisIndex) -
      countSharedOtherAxes(first, currentVariant, axisIndex);
    if (sharedAxisDifference !== 0) return sharedAxisDifference;
    return first.position - second.position;
  });
  return ranked[0] ?? null;
}

/**
 * Whether `value` can be bought WITHOUT changing the buyer's other choices. False is drawn as a
 * struck-through chip that stays clickable — clicking it moves the other axes instead.
 */
export function isOptionValueAvailableWithCurrentChoices(
  variants: readonly ProductVariant[],
  currentVariant: ProductVariant | null,
  axisIndex: number,
  value: string,
): boolean {
  return variants.some(
    (variant) =>
      variant.stockState !== "unavailable" &&
      readOptionValue(variant, axisIndex) === value &&
      variant.options.every(
        (option, optionIndex) =>
          optionIndex === axisIndex ||
          currentVariant === null ||
          option.value === readOptionValue(currentVariant, optionIndex),
      ),
  );
}
