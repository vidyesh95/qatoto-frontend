import {
  CONDITION_LABEL_TO_SLUG,
  dollarsToCents,
  PRODUCT_SPECIFICATION_MAX_COUNT,
  PRODUCT_VARIANT_AXIS_NAME_MAX_LENGTH,
  type CreateProductInput,
  type ProductAttributeValueInput,
  type ProductCustomizationOptionInput,
  type ProductHighlightInput,
  type ProductVariantInput,
} from "@/lib/products/schemas";
import type { CategoryAttribute } from "@/lib/store/catalog.schemas";
import { toOptionalCountryCode } from "@/components/commerce/composer/composer-input";
import type { ProductSamplePolicy, ProductSellingState } from "@/lib/store/organizations.schemas";
import type { QuoteIncoterm } from "@/lib/store/quotes.schemas";
import type { ListingCategoryChoice } from "@/components/studio/listing/listing-category-picker";
import {
  collectPackagingFacts,
  collectTierDrafts,
  PRODUCT_CUSTOMIZATION_SLOT_KEY_PATTERN,
  type CustomizationSlotDraft,
  type HighlightDraft,
  type PricingTierDraft,
  type SpecificationDraft,
  type VariantAxisDraft,
  type VariantDraft,
} from "@/components/studio/listing/listing-editor-types";

export interface CollectListingInputParams {
  readonly productTitle: string;
  readonly brandName: string;
  readonly categoryChoice: ListingCategoryChoice | null;
  readonly selectedCondition: string;
  readonly modelNumber: string;
  readonly countryOfOriginCode: string;
  readonly unitOfMeasure: string;
  readonly defaultIncoterm: QuoteIncoterm | "";
  readonly productDescription: string;
  readonly keyFeatures: readonly string[];
  readonly priceInDollars: string;
  readonly compareAtPriceInDollars: string;
  readonly stockQuantity: string;
  readonly skuCode: string;
  readonly pricingTiers: readonly PricingTierDraft[];
  readonly sellingState: ProductSellingState;
  readonly specifications: readonly SpecificationDraft[];
  readonly sourcingQuoteProductLineId: string | null;
  readonly samplePolicy: ProductSamplePolicy;
  readonly samplePriceInDollars: string;
  readonly maximumSampleQuantity: string;
  readonly packageLengthMm: string;
  readonly packageWidthMm: string;
  readonly packageHeightMm: string;
  readonly packageGrossWeightGrams: string;
  readonly unitsPerPackage: string;
}

export function collectListingInput(
  params: CollectListingInputParams,
): CreateProductInput | { error: string } {
  const title = params.productTitle.trim();
  if (title.length === 0) return { error: "Product title is required." };

  if (params.categoryChoice === null) {
    return { error: "Select a category, or request the one you need." };
  }

  const priceInCents = dollarsToCents(params.priceInDollars);
  if (priceInCents === null) return { error: "Enter a valid price." };

  const compareAtPriceInCents = dollarsToCents(params.compareAtPriceInDollars);
  const parsedStock = Number.parseInt(params.stockQuantity, 10);
  const resolvedStock = Number.isFinite(parsedStock) && parsedStock > 0 ? parsedStock : 0;

  const collectedTiers = collectTierDrafts(params.pricingTiers, "on this listing");
  if ("error" in collectedTiers) return { error: collectedTiers.error };
  const tiers = collectedTiers.tiers;

  const collectedSpecifications: { key: string; value: string; group?: string }[] = [];
  const seenSpecificationKeys = new Set<string>();
  for (const specification of params.specifications) {
    const key = specification.key.trim();
    const value = specification.value.trim();
    const group = specification.group.trim();
    if (key.length === 0 && value.length === 0 && group.length === 0) continue;
    if (key.length === 0 || value.length === 0) {
      return { error: "Every specification needs both a name and a value." };
    }
    const comparableKey = key.toLocaleLowerCase("en-US");
    if (seenSpecificationKeys.has(comparableKey)) {
      return { error: `"${key}" is listed twice. Each specification name may appear once.` };
    }
    seenSpecificationKeys.add(comparableKey);
    collectedSpecifications.push({ key, value, ...(group.length > 0 ? { group } : {}) });
  }
  if (collectedSpecifications.length > PRODUCT_SPECIFICATION_MAX_COUNT) {
    return {
      error: `A listing can hold up to ${String(PRODUCT_SPECIFICATION_MAX_COUNT)} specifications.`,
    };
  }

  const samplePriceInCents = dollarsToCents(params.samplePriceInDollars);
  if (params.samplePolicy !== "unavailable" && samplePriceInCents === null) {
    return { error: "A paid or refundable sample needs a sample price." };
  }
  const parsedMaximumSampleQuantity = Number.parseInt(params.maximumSampleQuantity, 10);
  if (
    params.samplePolicy !== "unavailable" &&
    (!Number.isFinite(parsedMaximumSampleQuantity) ||
      parsedMaximumSampleQuantity < 1 ||
      parsedMaximumSampleQuantity > 20)
  ) {
    return { error: "Samples per order must be a whole number between 1 and 20." };
  }
  const sampleFacts =
    params.samplePolicy === "unavailable"
      ? { samplePolicy: "unavailable" as const }
      : {
          samplePolicy: params.samplePolicy,
          samplePriceInCents: samplePriceInCents ?? undefined,
          maximumSampleQuantity: parsedMaximumSampleQuantity,
        };

  const packaging = collectPackagingFacts({
    packageLengthMm: params.packageLengthMm,
    packageWidthMm: params.packageWidthMm,
    packageHeightMm: params.packageHeightMm,
    packageGrossWeightGrams: params.packageGrossWeightGrams,
    unitsPerPackage: params.unitsPerPackage,
  });
  if ("error" in packaging) return packaging;

  return {
    title,
    brand: params.brandName.trim() || undefined,
    ...(params.categoryChoice.kind === "category"
      ? { categoryId: params.categoryChoice.categoryId }
      : { categoryRequestId: params.categoryChoice.categoryRequestId }),
    condition: CONDITION_LABEL_TO_SLUG[params.selectedCondition] ?? "new",
    modelNumber: params.modelNumber.trim() || undefined,
    countryOfOriginCode: toOptionalCountryCode(params.countryOfOriginCode),
    unitOfMeasure: params.unitOfMeasure.trim() || undefined,
    defaultIncoterm: params.defaultIncoterm === "" ? null : params.defaultIncoterm,
    description: params.productDescription.trim() || undefined,
    keyFeatures: [...params.keyFeatures],
    priceInCents,
    compareAtPriceInCents: compareAtPriceInCents ?? undefined,
    stockQuantity: resolvedStock,
    sku: params.skuCode.trim() || undefined,
    pricingTiers: tiers,
    sellingState: params.sellingState,
    specifications: collectedSpecifications,
    sourcingQuoteProductLineId: params.sourcingQuoteProductLineId,
    ...sampleFacts,
    ...packaging.facts,
  };
}

export function collectHighlights(highlights: readonly HighlightDraft[]): {
  plan: ProductHighlightInput[];
  imageFileByIndex: Map<number, File>;
} {
  const plan: ProductHighlightInput[] = [];
  const imageFileByIndex = new Map<number, File>();
  for (const highlight of highlights) {
    const title = highlight.title.trim();
    const bodyText = highlight.bodyText.trim();
    if (title.length === 0 || bodyText.length === 0) continue;
    if (highlight.imageFile !== null) imageFileByIndex.set(plan.length, highlight.imageFile);
    plan.push({
      ...(highlight.savedId === null ? {} : { id: highlight.savedId }),
      title,
      bodyText,
    });
  }
  return { plan, imageFileByIndex };
}

/**
 * A26. The axes, checked before any row: a row's options are only as good as the axes they name.
 * `null` when they are fine.
 */
function findVariantAxisError(axes: readonly VariantAxisDraft[]): string | null {
  const seenAxisNames = new Set<string>();
  for (const [axisIndex, axis] of axes.entries()) {
    const axisName = axis.name.trim();
    const axisLabel = axisName.length > 0 ? `"${axisName}"` : `option ${String(axisIndex + 1)}`;
    if (axisName.length === 0) return `Name ${axisLabel} — Size or Colour, for example.`;
    if (axisName.length > PRODUCT_VARIANT_AXIS_NAME_MAX_LENGTH) {
      return `Shorten the option name ${axisLabel} to ${String(PRODUCT_VARIANT_AXIS_NAME_MAX_LENGTH)} characters.`;
    }
    if (axis.values.length === 0) return `Add at least one value to ${axisLabel}, or remove it.`;
    const normalizedAxisName = axisName.toLowerCase();
    if (seenAxisNames.has(normalizedAxisName)) return `Two options are both called ${axisLabel}.`;
    seenAxisNames.add(normalizedAxisName);
  }
  return null;
}

/**
 * Turns the variant step into the `PUT /products/:id/variants` payload.
 *
 * WITH AXES (A26), only OFFERED rows are sent, each naming one value per axis. A combination the
 * seller switched off is simply left out, which retires it on the backend if it was saved — the
 * same retirement a removed flat-list row gets.
 */
export function collectVariants(
  variants: readonly VariantDraft[],
  variantAxes: readonly VariantAxisDraft[],
): { variants: ProductVariantInput[] } | { error: string } {
  const isGridMode = variantAxes.length > 0;
  if (isGridMode) {
    const axisError = findVariantAxisError(variantAxes);
    if (axisError !== null) return { error: axisError };
    if (!variants.some((variant) => variant.isOffered)) {
      return { error: "Offer at least one combination, or remove the options." };
    }
  }
  const collected: ProductVariantInput[] = [];
  for (const [variantIndex, variant] of variants.entries()) {
    if (!variant.isOffered) continue;
    const name = variant.name.trim();
    const publicSlug = variant.publicSlug.trim();
    const sku = variant.sku.trim();
    const rawStock = variant.stockQuantity.trim();
    const rawMinimum = variant.minimumOrderQuantity.trim();
    const isUntouchedNewRow =
      variant.savedId === null &&
      name.length === 0 &&
      publicSlug.length === 0 &&
      sku.length === 0 &&
      variant.priceInDollars.trim().length === 0 &&
      rawStock.length === 0 &&
      rawMinimum.length === 0 &&
      variant.pricingTiers.length === 0;
    // A grid row is never "untouched": it exists because the seller offered that combination, so
    // an empty price there is a question to answer, not a row to skip.
    if (isUntouchedNewRow && !isGridMode) continue;

    const label = name.length > 0 ? `"${name}"` : `variant ${String(variantIndex + 1)}`;
    if (name.length === 0) {
      return { error: `Give ${label} a name, or remove the row.` };
    }
    if (publicSlug.length === 0) {
      return { error: `${label} needs a URL slug.` };
    }
    const priceInCents = dollarsToCents(variant.priceInDollars);
    if (priceInCents === null) {
      return { error: `Enter a valid price for ${label}.` };
    }
    const variantStockQuantity = Number(rawStock);
    if (
      rawStock.length === 0 ||
      !Number.isInteger(variantStockQuantity) ||
      variantStockQuantity < 0
    ) {
      return { error: `Enter a whole stock quantity for ${label}.` };
    }
    const minimumOrderQuantity = Number(rawMinimum);
    if (
      rawMinimum.length > 0 &&
      (!Number.isInteger(minimumOrderQuantity) || minimumOrderQuantity < 1)
    ) {
      return {
        error: `The minimum order quantity for ${label} must be a whole number, 1 or more.`,
      };
    }

    const collectedVariantTiers = collectTierDrafts(variant.pricingTiers, `on ${label}`);
    if ("error" in collectedVariantTiers) return { error: collectedVariantTiers.error };

    collected.push({
      name,
      publicSlug,
      priceInCents,
      stockQuantity: variantStockQuantity,
      ...(sku.length === 0 ? {} : { sku }),
      ...(rawMinimum.length === 0 ? {} : { minimumOrderQuantity }),
      pricingTiers: collectedVariantTiers.tiers,
      options: isGridMode
        ? variantAxes.map((axis, axisIndex) => ({
            name: axis.name.trim(),
            value: variant.optionValues[axisIndex] ?? "",
          }))
        : [],
    });
  }

  if (new Set(collected.map((variant) => variant.publicSlug)).size !== collected.length) {
    return { error: "Two variants share a URL slug. Each one needs its own." };
  }
  const skus = collected.flatMap((variant) => (variant.sku === undefined ? [] : [variant.sku]));
  if (new Set(skus).size !== skus.length) {
    return { error: "Two variants share an SKU. Each one needs its own, or leave it blank." };
  }
  return { variants: collected };
}

export function collectAttributeValues(
  categoryAttributes: readonly CategoryAttribute[],
  attributeAnswers: Readonly<Record<string, string>>,
): ProductAttributeValueInput[] {
  const collected: ProductAttributeValueInput[] = [];
  for (const attribute of categoryAttributes) {
    const rawAnswer = (attributeAnswers[attribute.attributeKey] ?? "").trim();
    if (rawAnswer.length === 0) continue;

    switch (attribute.valueKind) {
      case "enum":
        collected.push({
          attributeKey: attribute.attributeKey,
          kind: "enum",
          choiceValue: rawAnswer,
        });
        break;
      case "number": {
        const parsed = Number(rawAnswer);
        if (!Number.isFinite(parsed)) continue;
        collected.push({
          attributeKey: attribute.attributeKey,
          kind: "number",
          numericValueScaled: Math.round(parsed * 10 ** (attribute.numericScale ?? 0)),
        });
        break;
      }
      case "text":
        collected.push({
          attributeKey: attribute.attributeKey,
          kind: "text",
          textValue: rawAnswer,
        });
        break;
      default: {
        const exhaustiveKind: never = attribute.valueKind;
        throw new Error(`Unhandled attribute kind: ${String(exhaustiveKind)}`);
      }
    }
  }
  return collected;
}

export function collectCustomizationSlots(
  customizationSlots: readonly CustomizationSlotDraft[],
): { slots: ProductCustomizationOptionInput[] } | { error: string } {
  const collected: ProductCustomizationOptionInput[] = [];
  for (const [slotIndex, slot] of customizationSlots.entries()) {
    const label = slot.label.trim();
    const slotKey = slot.slotKey.trim();
    const rawMinimum = slot.minimumOrderQuantity.trim();
    const isUntouchedNewRow =
      slot.savedId === null &&
      label.length === 0 &&
      slotKey.length === 0 &&
      rawMinimum.length === 0 &&
      slot.acceptedMediaTypes.length === 0 &&
      slot.choiceValues.length === 0;
    if (isUntouchedNewRow) continue;

    const slotLabel = label.length > 0 ? `"${label}"` : `slot ${String(slotIndex + 1)}`;
    if (label.length === 0) {
      return { error: `Give ${slotLabel} a label, or remove the row.` };
    }
    if (slotKey.length === 0) {
      return { error: `${slotLabel} needs a key.` };
    }
    if (!PRODUCT_CUSTOMIZATION_SLOT_KEY_PATTERN.test(slotKey)) {
      return {
        error: `The key for ${slotLabel} must be lower-case words joined by underscores, like "packaging_material".`,
      };
    }
    const minimumOrderQuantity = Number(rawMinimum);
    if (
      rawMinimum.length > 0 &&
      (!Number.isInteger(minimumOrderQuantity) || minimumOrderQuantity < 1)
    ) {
      return {
        error: `The minimum order quantity for ${slotLabel} must be a whole number, 1 or more.`,
      };
    }

    if (slot.customizationKind === "file_upload") {
      if (slot.acceptedMediaTypes.length === 0) {
        return {
          error: `${slotLabel} takes an upload, so it needs at least one accepted file type.`,
        };
      }
      collected.push({
        slotKey,
        label,
        customizationKind: "file_upload",
        acceptedMediaTypes: [...slot.acceptedMediaTypes],
        ...(rawMinimum.length === 0 ? {} : { minimumOrderQuantity }),
      });
      continue;
    }

    if (slot.choiceValues.length === 0) {
      return {
        error: `${slotLabel} is a choice, so it needs at least one option to choose from.`,
      };
    }
    collected.push({
      slotKey,
      label,
      customizationKind: "choice",
      choiceValues: [...slot.choiceValues],
      ...(rawMinimum.length === 0 ? {} : { minimumOrderQuantity }),
    });
  }

  if (new Set(collected.map((slot) => slot.slotKey)).size !== collected.length) {
    return { error: "Two slots share a key. Each one needs its own." };
  }
  return { slots: collected };
}
