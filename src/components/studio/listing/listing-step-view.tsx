"use client";

import type { useCreateListingState } from "@/hooks/studio/use-create-listing-state";
import type { ListingStepId } from "./listing-editor-types";
import { IdentityStep } from "./steps/identity-step";
import { ImagesStep } from "./steps/images-step";
import { DescriptionStep } from "./steps/description-step";
import { SpecificationsStep } from "./steps/specifications-step";
import { HighlightsStep } from "./steps/highlights-step";
import { DocumentsStep } from "./steps/documents-step";
import { PricingStep } from "./steps/pricing-step";
import { VariantsStep } from "./steps/variants-step";
import { CustomizationStep } from "./steps/customization-step";
import { RelationsStep } from "./steps/relations-step";
import { ReviewStep } from "./steps/review-step";

export interface ListingStepViewProps {
  readonly stepId: ListingStepId;
  readonly state: ReturnType<typeof useCreateListingState>;
}

export function ListingStepView({ stepId, state }: ListingStepViewProps) {
  switch (stepId) {
    case "identity":
      return (
        <IdentityStep
          productTitle={state.productTitle}
          onProductTitleChange={state.setProductTitle}
          brandName={state.brandName}
          onBrandNameChange={state.setBrandName}
          categoryChoice={state.categoryChoice}
          onCategoryChoiceChange={state.setCategoryChoice}
          isSaving={state.isSaving}
          modelNumber={state.modelNumber}
          onModelNumberChange={state.setModelNumber}
          unitOfMeasure={state.unitOfMeasure}
          onUnitOfMeasureChange={state.setUnitOfMeasure}
          countryOfOriginCode={state.countryOfOriginCode}
          onCountryOfOriginCodeChange={state.setCountryOfOriginCode}
          selectedCondition={state.selectedCondition}
          onSelectedConditionChange={state.setSelectedCondition}
        />
      );

    case "images":
      return (
        <ImagesStep
          existingImages={state.existingImages}
          selectedImagePreviews={state.selectedImagePreviews}
          imageCount={state.imageCount}
          isDraggingOver={state.isDraggingOver}
          imageInputRef={state.imageInputRef}
          listingModelDraft={state.listingModelDraft}
          modelFileRejectionMessage={state.modelFileRejectionMessage}
          modelInputRef={state.modelInputRef}
          onImageDrop={state.handleImageDrop}
          onImageDragOver={state.handleImageDragOver}
          onImageDragLeave={state.handleImageDragLeave}
          onSelectImagesClick={state.handleSelectImagesClick}
          onImageInputChange={state.handleImageInputChange}
          onRemoveImageClick={state.handleRemoveImageClick}
          onRemoveExistingImage={state.handleRemoveExistingImage}
          onMoveExistingImage={state.handleMoveExistingImage}
          onMakeMainImageClick={state.handleMakeMainImageClick}
          onMoveSelectedPreview={state.handleMoveSelectedPreview}
          onSelectModelClick={state.handleSelectModelClick}
          onModelFileChange={state.handleModelFileChange}
          onRemoveModelClick={state.handleRemoveModelClick}
          onUndoRemoveModelClick={state.handleUndoRemoveModelClick}
        />
      );

    case "description":
      return (
        <DescriptionStep
          productDescription={state.productDescription}
          onProductDescriptionChange={state.setProductDescription}
          keyFeatures={state.keyFeatures}
          keyFeatureDraft={state.keyFeatureDraft}
          onKeyFeatureDraftChange={state.setKeyFeatureDraft}
          onAddKeyFeature={state.handleAddKeyFeatureClick}
          onRemoveKeyFeature={state.handleRemoveKeyFeatureClick}
        />
      );

    case "specifications":
      return (
        <SpecificationsStep
          isEditMode={state.isEditMode}
          selectedCategorySlug={state.selectedCategorySlug}
          isAttributesLoading={state.isAttributesPending}
          categoryDisplayLabel={state.categoryChoice?.displayLabel ?? null}
          specificationFieldIdPrefix={state.specificationFieldIdPrefix}
          categoryAttributes={state.categoryAttributes}
          attributeAnswers={state.attributeAnswers}
          onAttributeAnswerChange={state.handleAttributeAnswerChange}
          specifications={state.specifications}
          specificationGroupSuggestions={state.specificationGroupSuggestions}
          onAddSpecification={state.handleAddSpecificationClick}
          onSpecificationChange={state.handleSpecificationChange}
          onRemoveSpecification={state.handleRemoveSpecificationClick}
        />
      );

    case "highlights":
      return (
        <HighlightsStep
          highlights={state.highlights}
          onAddHighlight={state.handleAddHighlightClick}
          onRemoveHighlight={state.handleRemoveHighlightClick}
          onHighlightTextChange={state.handleHighlightTextChange}
          onHighlightImageChange={state.handleHighlightImageChange}
        />
      );

    case "documents":
      return (
        <DocumentsStep
          existingDocuments={state.existingDocuments}
          removedDocumentIdsSet={state.removedDocumentIdsSet}
          pendingDocuments={state.pendingDocuments}
          documentCount={state.documentCount}
          onRemoveExistingDocument={state.handleRemoveExistingDocument}
          onRemovePendingDocument={state.handleRemovePendingDocument}
          onPendingDocumentKindChange={state.handlePendingDocumentKindChange}
          onAddPendingDocument={state.handleAddPendingDocument}
        />
      );

    case "pricing":
      return (
        <PricingStep
          priceInDollars={state.priceInDollars}
          onPriceInDollarsChange={state.setPriceInDollars}
          compareAtPriceInDollars={state.compareAtPriceInDollars}
          onCompareAtPriceInDollarsChange={state.setCompareAtPriceInDollars}
          stockQuantity={state.stockQuantity}
          onStockQuantityChange={state.setStockQuantity}
          skuCode={state.skuCode}
          onSkuCodeChange={state.setSkuCode}
          sourcingQuoteProductLineId={state.sourcingQuoteProductLineId}
          onSourcingQuoteProductLineIdSelect={state.setSourcingQuoteProductLineId}
          sellingState={state.sellingState}
          onSellingStateChange={state.setSellingState}
          pricingTiers={state.pricingTiers}
          onAddTier={state.handleAddTierClick}
          onTierChange={state.handleTierChange}
          onRemoveTier={state.handleRemoveTierClick}
          samplePolicy={state.samplePolicy}
          onSamplePolicyChange={state.setSamplePolicy}
          samplePriceInDollars={state.samplePriceInDollars}
          onSamplePriceInDollarsChange={state.setSamplePriceInDollars}
          maximumSampleQuantity={state.maximumSampleQuantity}
          onMaximumSampleQuantityChange={state.setMaximumSampleQuantity}
          packageLengthMm={state.packageLengthMm}
          onPackageLengthMmChange={state.setPackageLengthMm}
          packageWidthMm={state.packageWidthMm}
          onPackageWidthMmChange={state.setPackageWidthMm}
          packageHeightMm={state.packageHeightMm}
          onPackageHeightMmChange={state.setPackageHeightMm}
          packageGrossWeightGrams={state.packageGrossWeightGrams}
          onPackageGrossWeightGramsChange={state.setPackageGrossWeightGrams}
          unitsPerPackage={state.unitsPerPackage}
          onUnitsPerPackageChange={state.setUnitsPerPackage}
        />
      );

    case "variants":
      return (
        <VariantsStep
          variants={state.variants}
          retiredVariantCount={state.retiredVariantCount}
          onAddVariant={state.handleAddVariantClick}
          onRemoveVariant={state.handleRemoveVariantClick}
          onVariantNameChange={state.handleVariantNameChange}
          onVariantSlugChange={state.handleVariantSlugChange}
          onVariantFieldChange={state.handleVariantFieldChange}
          onAddVariantTier={state.handleAddVariantTierClick}
          onRemoveVariantTier={state.handleRemoveVariantTierClick}
          onVariantTierChange={state.handleVariantTierChange}
        />
      );

    case "customization":
      return (
        <CustomizationStep
          customizationSlots={state.customizationSlots}
          retiredCustomizationSlotCount={state.retiredCustomizationSlotCount}
          onAddCustomizationSlot={state.handleAddCustomizationSlotClick}
          onRemoveCustomizationSlot={state.handleRemoveCustomizationSlotClick}
          onCustomizationLabelChange={state.handleCustomizationLabelChange}
          onUpdateCustomizationSlot={state.updateCustomizationSlot}
        />
      );

    case "relations":
      return (
        <RelationsStep
          relations={state.relations}
          readOnlyRelations={state.readOnlyRelations}
          onRelationsChange={state.setRelations}
        />
      );

    case "review":
      return (
        <ReviewStep
          onNavigateToStepIndex={state.setCurrentStepIndex}
          productTitle={state.productTitle}
          brandName={state.brandName}
          categoryChoice={state.categoryChoice}
          selectedCondition={state.selectedCondition}
          modelNumber={state.modelNumber}
          countryOfOriginCode={state.countryOfOriginCode}
          unitOfMeasure={state.unitOfMeasure}
          imageCount={state.imageCount}
          listingModelDraft={state.listingModelDraft}
          productDescription={state.productDescription}
          keyFeatures={state.keyFeatures}
          filledSpecificationCount={state.filledSpecificationCount}
          filledHighlightCount={state.filledHighlightCount}
          variantsCount={state.variants.length}
          customizationSlotsCount={state.customizationSlots.length}
          priceInDollars={state.priceInDollars}
          compareAtPriceInDollars={state.compareAtPriceInDollars}
          stockQuantity={state.stockQuantity}
          skuCode={state.skuCode}
          pricingTiersCount={state.pricingTiers.length}
          samplePolicy={state.samplePolicy}
          samplePriceInDollars={state.samplePriceInDollars}
          maximumSampleQuantity={state.maximumSampleQuantity}
          packageLengthMm={state.packageLengthMm}
          packageWidthMm={state.packageWidthMm}
          packageHeightMm={state.packageHeightMm}
          packageGrossWeightGrams={state.packageGrossWeightGrams}
          unitsPerPackage={state.unitsPerPackage}
          listingCompleteness={state.productQuery.data?.listingCompleteness}
        />
      );

    default: {
      const exhaustiveCheck: never = stepId;
      return exhaustiveCheck;
    }
  }
}
