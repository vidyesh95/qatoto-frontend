"use client";

import type { ListingCategoryChoice } from "@/components/studio/listing/listing-category-picker";
import type { ListingCompleteness } from "@/lib/products/schemas";
import { SAMPLE_POLICY_LABELS, type ProductSamplePolicy } from "@/lib/store/organizations.schemas";
import { countryLabelFromCode } from "@/lib/store/format";
import {
  describeListingModelDraft,
  stepIndexOf,
  type ListingModelDraft,
} from "../listing-editor-types";
import {
  ListingCompletenessChecklist,
  ReviewSection,
  StepCard,
} from "../listing-editor-subcomponents";

export interface ReviewStepProps {
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
  readonly productTitle: string;
  readonly brandName: string;
  readonly categoryChoice: ListingCategoryChoice | null;
  readonly selectedCondition: string;
  readonly modelNumber: string;
  readonly countryOfOriginCode: string;
  readonly unitOfMeasure: string;
  readonly imageCount: number;
  readonly listingModelDraft: ListingModelDraft;
  readonly productDescription: string;
  readonly keyFeatures: readonly string[];
  readonly filledSpecificationCount: number;
  readonly filledHighlightCount: number;
  readonly variantsCount: number;
  readonly customizationSlotsCount: number;
  readonly priceInDollars: string;
  readonly compareAtPriceInDollars: string;
  readonly stockQuantity: string;
  readonly skuCode: string;
  readonly pricingTiersCount: number;
  readonly samplePolicy: ProductSamplePolicy;
  readonly samplePriceInDollars: string;
  readonly maximumSampleQuantity: string;
  readonly packageLengthMm: string;
  readonly packageWidthMm: string;
  readonly packageHeightMm: string;
  readonly packageGrossWeightGrams: string;
  readonly unitsPerPackage: string;
  readonly listingCompleteness: ListingCompleteness | undefined;
}

function IdentityReviewSection({
  productTitle,
  brandName,
  categoryChoice,
  selectedCondition,
  modelNumber,
  countryOfOriginCode,
  unitOfMeasure,
  onNavigateToStepIndex,
}: {
  readonly productTitle: string;
  readonly brandName: string;
  readonly categoryChoice: ListingCategoryChoice | null;
  readonly selectedCondition: string;
  readonly modelNumber: string;
  readonly countryOfOriginCode: string;
  readonly unitOfMeasure: string;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const countryValue = countryOfOriginCode === "" ? "" : countryLabelFromCode(countryOfOriginCode);
  return (
    <ReviewSection
      title="Product Identity"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("identity"))}
      rows={[
        { label: "Title", value: productTitle },
        { label: "Brand", value: brandName },
        { label: "Category", value: categoryChoice?.displayLabel ?? "" },
        { label: "Condition", value: selectedCondition },
        { label: "Model number", value: modelNumber },
        { label: "Country of origin", value: countryValue },
        { label: "Unit of measure", value: unitOfMeasure },
      ]}
    />
  );
}

function MediaReviewSection({
  imageCount,
  listingModelDraft,
  onNavigateToStepIndex,
}: {
  readonly imageCount: number;
  readonly listingModelDraft: ListingModelDraft;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const imagesValue =
    imageCount > 0 ? `${imageCount} image${imageCount === 1 ? "" : "s"} added` : "";
  return (
    <ReviewSection
      title="Images & Media"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("images"))}
      rows={[
        { label: "Images", value: imagesValue },
        { label: "3D model", value: describeListingModelDraft(listingModelDraft) },
      ]}
    />
  );
}

function DescriptionReviewSection({
  productDescription,
  keyFeatures,
  onNavigateToStepIndex,
}: {
  readonly productDescription: string;
  readonly keyFeatures: readonly string[];
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  return (
    <ReviewSection
      title="Description"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("description"))}
      rows={[
        { label: "Description", value: productDescription },
        {
          label: "Key features",
          value: keyFeatures.length > 0 ? keyFeatures.join(" · ") : "",
        },
      ]}
    />
  );
}

function SpecificationsReviewSection({
  filledSpecificationCount,
  onNavigateToStepIndex,
}: {
  readonly filledSpecificationCount: number;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const specValue =
    filledSpecificationCount > 0
      ? `${String(filledSpecificationCount)} specification${
          filledSpecificationCount === 1 ? "" : "s"
        }`
      : "";
  return (
    <ReviewSection
      title="Specifications"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("specifications"))}
      rows={[{ label: "Specification sheet", value: specValue }]}
    />
  );
}

function HighlightsReviewSection({
  filledHighlightCount,
  onNavigateToStepIndex,
}: {
  readonly filledHighlightCount: number;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const highlightValue =
    filledHighlightCount > 0
      ? `${String(filledHighlightCount)} block${filledHighlightCount === 1 ? "" : "s"}`
      : "";
  return (
    <ReviewSection
      title="Highlights"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("highlights"))}
      rows={[{ label: "Detail blocks", value: highlightValue }]}
    />
  );
}

function VariantsReviewSection({
  variantsCount,
  onNavigateToStepIndex,
}: {
  readonly variantsCount: number;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const variantValue =
    variantsCount > 0 ? `${String(variantsCount)} variant${variantsCount === 1 ? "" : "s"}` : "";
  return (
    <ReviewSection
      title="Variants"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("variants"))}
      rows={[{ label: "Variations", value: variantValue }]}
    />
  );
}

function CustomizationReviewSection({
  customizationSlotsCount,
  onNavigateToStepIndex,
}: {
  readonly customizationSlotsCount: number;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const slotValue =
    customizationSlotsCount > 0
      ? `${String(customizationSlotsCount)} slot${customizationSlotsCount === 1 ? "" : "s"}`
      : "";
  return (
    <ReviewSection
      title="Customization"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("customization"))}
      rows={[{ label: "Slots", value: slotValue }]}
    />
  );
}

function PricingReviewSection({
  priceInDollars,
  compareAtPriceInDollars,
  stockQuantity,
  skuCode,
  pricingTiersCount,
  samplePolicy,
  samplePriceInDollars,
  maximumSampleQuantity,
  onNavigateToStepIndex,
}: {
  readonly priceInDollars: string;
  readonly compareAtPriceInDollars: string;
  readonly stockQuantity: string;
  readonly skuCode: string;
  readonly pricingTiersCount: number;
  readonly samplePolicy: ProductSamplePolicy;
  readonly samplePriceInDollars: string;
  readonly maximumSampleQuantity: string;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const sampleValue =
    samplePolicy === "unavailable"
      ? SAMPLE_POLICY_LABELS.unavailable
      : `${SAMPLE_POLICY_LABELS[samplePolicy]}${
          samplePriceInDollars ? ` · $${samplePriceInDollars} each` : ""
        } · max ${maximumSampleQuantity || "1"} per order`;
  const tiersValue =
    pricingTiersCount > 0 ? `${pricingTiersCount} tier${pricingTiersCount === 1 ? "" : "s"}` : "";

  return (
    <ReviewSection
      title="Pricing & Inventory"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("pricing"))}
      rows={[
        { label: "Price", value: priceInDollars ? `$${priceInDollars}` : "" },
        {
          label: "Compare-at price",
          value: compareAtPriceInDollars ? `$${compareAtPriceInDollars}` : "",
        },
        { label: "Quantity", value: stockQuantity },
        { label: "SKU", value: skuCode },
        { label: "Bulk tiers", value: tiersValue },
        { label: "Samples", value: sampleValue },
      ]}
    />
  );
}

function PackagingReviewSection({
  packageLengthMm,
  packageWidthMm,
  packageHeightMm,
  packageGrossWeightGrams,
  unitsPerPackage,
  onNavigateToStepIndex,
}: {
  readonly packageLengthMm: string;
  readonly packageWidthMm: string;
  readonly packageHeightMm: string;
  readonly packageGrossWeightGrams: string;
  readonly unitsPerPackage: string;
  readonly onNavigateToStepIndex: (stepIndex: number) => void;
}) {
  const sizeValue =
    packageLengthMm && packageWidthMm && packageHeightMm
      ? `${packageLengthMm} × ${packageWidthMm} × ${packageHeightMm} mm`
      : "";
  const weightValue = packageGrossWeightGrams ? `${packageGrossWeightGrams} g` : "";

  return (
    <ReviewSection
      title="Packaging & Shipping"
      onEditClick={() => onNavigateToStepIndex(stepIndexOf("pricing"))}
      rows={[
        { label: "Package size", value: sizeValue },
        { label: "Gross weight", value: weightValue },
        { label: "Units per package", value: unitsPerPackage },
      ]}
    />
  );
}

export function ReviewStep(props: ReviewStepProps) {
  const { onNavigateToStepIndex, listingCompleteness } = props;
  return (
    <StepCard
      title="Review & Publish"
      subtitle="Check everything looks right before your listing goes live."
    >
      <IdentityReviewSection {...props} />
      <MediaReviewSection {...props} />
      <DescriptionReviewSection {...props} />
      <SpecificationsReviewSection {...props} />
      <HighlightsReviewSection {...props} />
      <VariantsReviewSection {...props} />
      <CustomizationReviewSection {...props} />
      <PricingReviewSection {...props} />
      <PackagingReviewSection {...props} />
      {listingCompleteness !== undefined && (
        <ListingCompletenessChecklist
          completeness={listingCompleteness}
          onEditClick={onNavigateToStepIndex}
        />
      )}
    </StepCard>
  );
}
