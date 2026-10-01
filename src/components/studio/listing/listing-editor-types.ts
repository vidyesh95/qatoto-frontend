import {
  centsToDollarString,
  dollarsToCents,
  CONDITION_LABELS,
  PACKAGE_DIMENSION_MM_MAX,
  PACKAGE_GROSS_WEIGHT_GRAMS_MAX,
  PRODUCT_HIGHLIGHT_BODY_MAX_LENGTH,
  PRODUCT_HIGHLIGHT_MAX_COUNT,
  PRODUCT_HIGHLIGHT_TITLE_MAX_LENGTH,
  PRODUCT_SPECIFICATION_GROUP_MAX_LENGTH,
  PRODUCT_SPECIFICATION_KEY_MAX_LENGTH,
  PRODUCT_SPECIFICATION_MAX_COUNT,
  PRODUCT_SPECIFICATION_VALUE_MAX_LENGTH,
  PRODUCT_CUSTOMIZATION_CHOICE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_MEDIA_TYPE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_SLOT_KEY_PATTERN,
  PRODUCT_CUSTOMIZATION_SLOT_MAX_COUNT,
  PRODUCT_VARIANT_MAX_COUNT,
  PRODUCT_VARIANT_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_SKU_MAX_LENGTH,
  PRODUCT_VARIANT_SLUG_MAX_LENGTH,
  UNITS_PER_PACKAGE_MAX,
  type ProductPricingTierInput,
} from "@/lib/products/schemas";

export {
  PRODUCT_HIGHLIGHT_BODY_MAX_LENGTH,
  PRODUCT_HIGHLIGHT_MAX_COUNT,
  PRODUCT_HIGHLIGHT_TITLE_MAX_LENGTH,
  PRODUCT_SPECIFICATION_GROUP_MAX_LENGTH,
  PRODUCT_SPECIFICATION_KEY_MAX_LENGTH,
  PRODUCT_SPECIFICATION_MAX_COUNT,
  PRODUCT_SPECIFICATION_VALUE_MAX_LENGTH,
  PRODUCT_CUSTOMIZATION_CHOICE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_MEDIA_TYPE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_SLOT_KEY_PATTERN,
  PRODUCT_CUSTOMIZATION_SLOT_MAX_COUNT,
  PRODUCT_VARIANT_MAX_COUNT,
  PRODUCT_VARIANT_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_SKU_MAX_LENGTH,
  PRODUCT_VARIANT_SLUG_MAX_LENGTH,
};
import { PRODUCT_RELATION_KINDS } from "@/lib/store/merchandising.schemas";
import type {
  ProductCustomizationKind,
  ProductThreeDimensionalModel,
} from "@/lib/store/products.schemas";
import type { ProductSellingState } from "@/lib/store/organizations.schemas";
import type { ProductModelChange, SaveProgress } from "@/hooks/products";

export const PRODUCT_DOCUMENT_MAX_COUNT = 5;

export const LISTING_STEPS = [
  { id: "identity", label: "Product Identity" },
  { id: "images", label: "Images & Media" },
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
  { id: "highlights", label: "Highlights" },
  { id: "documents", label: "Documents" },
  { id: "pricing", label: "Pricing & Inventory" },
  { id: "variants", label: "Variants" },
  { id: "customization", label: "Customization" },
  { id: "relations", label: "Related products" },
  { id: "review", label: "Review & Publish" },
] as const;

export type ListingStepId = (typeof LISTING_STEPS)[number]["id"];

export function stepIndexOf(stepId: ListingStepId): number {
  return LISTING_STEPS.findIndex((step) => step.id === stepId);
}

export const PRODUCT_CONDITIONS = CONDITION_LABELS;

export const PRODUCT_TITLE_MAX_LENGTH = 200;
export const MAX_PRODUCT_IMAGES = 9;

export const PRODUCT_MODEL_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCT_MODEL_FILE_EXTENSION = ".glb";

export const PRODUCT_MODEL_NUMBER_MAX_LENGTH = 120;
export const PRODUCT_UNIT_OF_MEASURE_MAX_LENGTH = 40;

export const SELLING_STATE_OPTION_LABELS: Record<ProductSellingState, string> = {
  selling: "Yes — available to order",
  paused: "Paused — temporarily not selling",
  discontinued: "Discontinued — not coming back",
};

export const SELLING_STATE_HELP_TEXT: Record<ProductSellingState, string> = {
  selling: "Buyers can order this as normal.",
  paused:
    "The page stays live and buyers can still find it, but nothing can be ordered until you switch this back.",
  discontinued:
    "The page stays live so existing links keep working, and it points buyers at any replacement you have listed. Nothing can be ordered.",
};

export const UNIT_OF_MEASURE_SUGGESTIONS = [
  "piece",
  "pair",
  "set",
  "pack",
  "box",
  "carton",
  "pallet",
  "roll",
  "metre",
  "square metre",
  "kilogram",
  "litre",
] as const;

export interface PricingTierDraft {
  id: string;
  unitPriceInDollars: string;
  minimumOrderQuantity: string;
  leadTimeDays: string;
}

export function makeEmptyTierDraft(): PricingTierDraft {
  return {
    id: crypto.randomUUID(),
    unitPriceInDollars: "",
    minimumOrderQuantity: "",
    leadTimeDays: "",
  };
}

export function toTierDraft(
  tier: { unitPriceInCents: number; minimumOrderQuantity: number; leadTimeDays: number | null },
  keyPrefix: string,
  tierIndex: number,
): PricingTierDraft {
  return {
    id: `${keyPrefix}-${String(tierIndex)}`,
    unitPriceInDollars: centsToDollarString(tier.unitPriceInCents),
    minimumOrderQuantity: String(tier.minimumOrderQuantity),
    leadTimeDays: tier.leadTimeDays === null ? "" : String(tier.leadTimeDays),
  };
}

export function collectTierDrafts(
  drafts: readonly PricingTierDraft[],
  label: string,
): { tiers: ProductPricingTierInput[] } | { error: string } {
  const tiers: ProductPricingTierInput[] = [];
  for (const tier of drafts) {
    const rawLeadTime = tier.leadTimeDays.trim();
    const isBlankRow =
      tier.unitPriceInDollars.trim().length === 0 &&
      tier.minimumOrderQuantity.trim().length === 0 &&
      rawLeadTime.length === 0;
    if (isBlankRow) continue;

    const unitPriceInCents = dollarsToCents(tier.unitPriceInDollars);
    const minimumOrderQuantity = Number.parseInt(tier.minimumOrderQuantity, 10);
    if (
      unitPriceInCents === null ||
      !Number.isFinite(minimumOrderQuantity) ||
      minimumOrderQuantity < 1
    ) {
      return {
        error: `Each pricing tier ${label} needs a valid unit price and a minimum quantity of at least 1.`,
      };
    }
    const leadTimeDays = Number.parseInt(rawLeadTime, 10);
    if (rawLeadTime.length > 0 && (!Number.isInteger(leadTimeDays) || leadTimeDays < 0)) {
      return { error: `A lead time ${label} must be a whole number of days, or blank.` };
    }
    tiers.push({
      unitPriceInCents,
      minimumOrderQuantity,
      ...(rawLeadTime.length === 0 ? {} : { leadTimeDays }),
    });
  }
  return { tiers };
}

export interface VariantDraft {
  localId: string;
  savedId: string | null;
  name: string;
  publicSlug: string;
  isSlugEdited: boolean;
  sku: string;
  priceInDollars: string;
  stockQuantity: string;
  minimumOrderQuantity: string;
  pricingTiers: PricingTierDraft[];
}

export interface CustomizationSlotDraft {
  localId: string;
  savedId: string | null;
  slotKey: string;
  isSlotKeyEdited: boolean;
  label: string;
  customizationKind: ProductCustomizationKind;
  acceptedMediaTypes: string[];
  choiceValues: string[];
  minimumOrderQuantity: string;
}

export function toSlotKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function toVariantSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRODUCT_VARIANT_SLUG_MAX_LENGTH);
}

export interface RelationDraft {
  readonly localKey: string;
  readonly toProductId: string;
  readonly toProductTitle: string;
  readonly relationKind: (typeof PRODUCT_RELATION_KINDS)[number];
}

export interface ExistingImage {
  id: string;
  url: string;
}

export type ListingModelDraft =
  | { readonly kind: "none" }
  | { readonly kind: "existing"; readonly model: ProductThreeDimensionalModel }
  | { readonly kind: "pending"; readonly modelFile: File }
  | { readonly kind: "removing"; readonly model: ProductThreeDimensionalModel };

export function toProductModelChange(draft: ListingModelDraft): ProductModelChange {
  switch (draft.kind) {
    case "pending":
      return { kind: "upload", modelFile: draft.modelFile };
    case "removing":
      return { kind: "remove" };
    case "none":
    case "existing":
      return { kind: "keep" };
    default: {
      const exhaustiveCheck: never = draft;
      return exhaustiveCheck;
    }
  }
}

export function describeListingModelDraft(draft: ListingModelDraft): string {
  switch (draft.kind) {
    case "none":
      return "";
    case "existing":
      return draft.model.fileName;
    case "pending":
      return `${draft.modelFile.name} (uploads when you save)`;
    case "removing":
      return `${draft.model.fileName} (removed when you save)`;
    default: {
      const exhaustiveCheck: never = draft;
      return exhaustiveCheck;
    }
  }
}

export interface HighlightDraft {
  readonly localId: string;
  savedId: string | null;
  title: string;
  bodyText: string;
  imageUrl: string | null;
  imageFile: File | null;
  imagePreviewUrl: string | null;
}

export interface SpecificationDraft {
  id: string;
  key: string;
  value: string;
  group: string;
}

export const PACKAGING_FIELDS = [
  { key: "packageLengthMm", label: "Length", unit: "mm", max: PACKAGE_DIMENSION_MM_MAX },
  { key: "packageWidthMm", label: "Width", unit: "mm", max: PACKAGE_DIMENSION_MM_MAX },
  { key: "packageHeightMm", label: "Height", unit: "mm", max: PACKAGE_DIMENSION_MM_MAX },
  {
    key: "packageGrossWeightGrams",
    label: "Gross weight",
    unit: "g",
    max: PACKAGE_GROSS_WEIGHT_GRAMS_MAX,
  },
  { key: "unitsPerPackage", label: "Units per package", unit: "", max: UNITS_PER_PACKAGE_MAX },
] as const;

export type PackagingFieldKey = (typeof PACKAGING_FIELDS)[number]["key"];

export type PackagingFacts = Partial<Record<PackagingFieldKey, number>>;

export function collectPackagingFacts(
  typedValues: Record<PackagingFieldKey, string>,
): { facts: PackagingFacts } | { error: string } {
  const facts: PackagingFacts = {};

  for (const field of PACKAGING_FIELDS) {
    const typedValue = typedValues[field.key].trim();
    if (typedValue.length === 0) continue;

    const parsed = Number.parseInt(typedValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > field.max) {
      return {
        error: `${field.label} must be a whole number between 1 and ${field.max.toLocaleString()}${
          field.unit === "" ? "" : ` ${field.unit}`
        }.`,
      };
    }
    facts[field.key] = parsed;
  }

  const declaredDimensionCount = [
    facts.packageLengthMm,
    facts.packageWidthMm,
    facts.packageHeightMm,
  ].filter((dimension) => dimension !== undefined).length;

  if (declaredDimensionCount !== 0 && declaredDimensionCount !== 3) {
    return {
      error: "Package length, width and height must be provided together, or all left blank.",
    };
  }

  return { facts };
}

export function describeProgress(progress: SaveProgress): string {
  switch (progress.phase) {
    case "creating":
      return "Saving listing…";
    case "uploading":
      return `Uploading image ${progress.current}/${progress.total}…`;
    case "highlights":
      return progress.total === 0
        ? "Saving highlights…"
        : `Uploading highlight image ${progress.current}/${progress.total}…`;
    case "documents":
      return `Uploading document ${String(progress.current)}/${String(progress.total)}…`;
    case "model":
      return "Saving 3D model…";
    case "publishing":
      return "Publishing…";
    case "idle":
    case "done":
      return "Working…";
    default: {
      const exhaustiveCheck: never = progress;
      return exhaustiveCheck;
    }
  }
}
