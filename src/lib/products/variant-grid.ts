// The A26 variant grid: option axes in, one variant row per combination of their values out.
//
// ⚠️ A ROW'S OPTION VALUES ARE ITS IDENTITY ACROSS AXIS EDITS. Adding "XL" to Size must not wipe
// the price a seller typed for "M / Red", so every reconcile matches the previous rows by the axes
// they share and carries a matching row through — its price, stock, ladder, saved id and, above all,
// its slug, which is what the backend upserts on. Only a combination nothing fits gets a fresh row.
//
// ⚠️ A COMBINATION THAT DISAPPEARS IS DROPPED, NOT KEPT SWITCHED OFF. Removing "XL" from Size means
// no XL variant exists; the save omits those rows and the backend retires any that were saved, which
// is the same retirement a flat-list row gets when it is removed.
import type {
  VariantAxisDraft,
  VariantDraft,
} from "@/components/studio/listing/listing-editor-types";
import { toVariantSlug } from "@/components/studio/listing/listing-editor-types";
import { PRODUCT_VARIANT_MAX_COUNT } from "@/lib/products/schemas";

/** The separator the generated variant name uses, and so what an order line will read. */
const VARIANT_NAME_VALUE_SEPARATOR = " / ";

/** Axes that have at least one value. An axis still being named contributes nothing yet. */
function listActiveAxes(axes: readonly VariantAxisDraft[]): VariantAxisDraft[] {
  return axes.filter((axis) => axis.values.length > 0);
}

/** How many rows these axes generate. */
export function countVariantCombinations(axes: readonly VariantAxisDraft[]): number {
  const activeAxes = listActiveAxes(axes);
  if (activeAxes.length === 0) return 0;
  return activeAxes.reduce((combinationCount, axis) => combinationCount * axis.values.length, 1);
}

/** True when these axes would generate more rows than a listing may hold. */
export function exceedsVariantCombinationLimit(axes: readonly VariantAxisDraft[]): boolean {
  return countVariantCombinations(axes) > PRODUCT_VARIANT_MAX_COUNT;
}

/** The generated name, which is also what `variant_name_snapshot` records on an order line. */
export function buildVariantNameFromValues(optionValues: readonly string[]): string {
  return optionValues.filter((value) => value.length > 0).join(VARIANT_NAME_VALUE_SEPARATOR);
}

/**
 * Every combination of the active axes' values, as one value per axis in `axes` order — `""` for an
 * axis with no values yet — with the first axis varying slowest.
 */
function listValueCombinations(axes: readonly VariantAxisDraft[]): string[][] {
  if (listActiveAxes(axes).length === 0) return [];
  return axes.reduce<string[][]>(
    (combinations, axis) =>
      axis.values.length === 0
        ? combinations.map((combination) => [...combination, ""])
        : combinations.flatMap((combination) =>
            axis.values.map((value) => [...combination, value]),
          ),
    [[]],
  );
}

/** One row's values keyed by axis id, skipping axes it has no value for. */
function mapValuesByAxisId(
  axes: readonly VariantAxisDraft[],
  optionValues: readonly string[],
): Map<string, string> {
  const valueByAxisId = new Map<string, string>();
  for (const [axisIndex, axis] of axes.entries()) {
    const value = optionValues[axisIndex];
    if (value !== undefined && value.length > 0) valueByAxisId.set(axis.localId, value);
  }
  return valueByAxisId;
}

/**
 * How many axes a previous row shares with a combination, or `-1` when they disagree on one.
 * Matching on SHARED axes, by axis id, is what lets the grid survive an axis being added or
 * removed: adding Colour carries "M" over to "M / Red", and removing it carries "M / Red" back to
 * "M", rather than either edit wiping every price the seller typed.
 */
function countSharedAxes(
  previousValues: ReadonlyMap<string, string>,
  nextValues: ReadonlyMap<string, string>,
): number {
  let sharedAxisCount = 0;
  for (const [axisId, nextValue] of nextValues) {
    const previousValue = previousValues.get(axisId);
    if (previousValue === undefined) continue;
    if (previousValue !== nextValue) return -1;
    sharedAxisCount += 1;
  }
  return sharedAxisCount;
}

/**
 * The grid for `nextAxes`, carrying through every previous row that still fits a combination.
 *
 * Each combination takes the unclaimed previous row sharing the most axes with it, and a row that
 * shares none is never carried: that is a different variant, not this one renamed. A carried row
 * keeps everything — price, stock, ladder, saved id, slug, offered — except its name, which is
 * regenerated from its values. Its slug does NOT follow: a saved slug is the backend's identity
 * for the variant, and the name is just what the order line will read.
 *
 * `isNewCombinationOffered` is true while a seller edits — a value they just added is one they mean
 * to sell — and false at hydration, where a combination with no saved variant is one the seller
 * switched off last time.
 */
export function reconcileVariantGrid(
  nextAxes: readonly VariantAxisDraft[],
  previousAxes: readonly VariantAxisDraft[],
  previousRows: readonly VariantDraft[],
  isNewCombinationOffered: boolean,
): VariantDraft[] {
  const unclaimedPreviousRows = previousRows.map((row) => ({
    row,
    valueByAxisId: mapValuesByAxisId(previousAxes, row.optionValues),
  }));
  return listValueCombinations(nextAxes).map((optionValues) => {
    const nextValueByAxisId = mapValuesByAxisId(nextAxes, optionValues);
    let bestMatchIndex = -1;
    let bestSharedAxisCount = 0;
    for (const [candidateIndex, candidate] of unclaimedPreviousRows.entries()) {
      const sharedAxisCount = countSharedAxes(candidate.valueByAxisId, nextValueByAxisId);
      if (sharedAxisCount > bestSharedAxisCount) {
        bestMatchIndex = candidateIndex;
        bestSharedAxisCount = sharedAxisCount;
      }
    }
    const name = buildVariantNameFromValues(optionValues);
    if (bestMatchIndex >= 0) {
      const [claimed] = unclaimedPreviousRows.splice(bestMatchIndex, 1);
      if (claimed !== undefined) {
        const shouldSlugFollowName = claimed.row.savedId === null && !claimed.row.isSlugEdited;
        return {
          ...claimed.row,
          name,
          publicSlug: shouldSlugFollowName ? toVariantSlug(name) : claimed.row.publicSlug,
          optionValues,
        };
      }
    }
    return {
      localId: crypto.randomUUID(),
      savedId: null,
      name,
      publicSlug: toVariantSlug(name),
      isSlugEdited: false,
      sku: "",
      priceInDollars: "",
      stockQuantity: "",
      minimumOrderQuantity: "",
      pricingTiers: [],
      optionValues,
      isOffered: isNewCombinationOffered,
    };
  });
}

/**
 * Rebuilds the axes from saved variants: names from the first variant (the write contract keeps
 * them identical on every one), values in first-appearance order across the variants as given —
 * the same order the backend's `variantAxes` uses, so the editor and the PDP agree.
 */
export function deriveVariantAxes(
  variants: readonly {
    readonly options: readonly { readonly name: string; readonly value: string }[];
  }[],
): VariantAxisDraft[] {
  const firstOptionedVariant = variants.find((variant) => variant.options.length > 0);
  if (firstOptionedVariant === undefined) return [];
  return firstOptionedVariant.options.map((axisOption, axisIndex) => {
    const valueSet = new Set<string>();
    for (const variant of variants) {
      const value = variant.options[axisIndex]?.value;
      if (value !== undefined) valueSet.add(value);
    }
    return {
      localId: `hydrated-axis-${String(axisIndex)}`,
      name: axisOption.name,
      values: Array.from(valueSet),
    };
  });
}
