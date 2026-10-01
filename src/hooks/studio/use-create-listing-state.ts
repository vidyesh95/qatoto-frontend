"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateListingMutation,
  useProductQuery,
  useUpdateListingMutation,
  type PendingProductDocument,
  type SaveProgress,
} from "@/hooks/products";
import { useStoreCategoryAttributesQuery } from "@/hooks/store/categories";
import {
  centsToDollarString,
  SLUG_TO_CONDITION_LABEL,
  type SellerProductDocument,
  type SellerProductRelation,
} from "@/lib/products/schemas";
import {
  collectAttributeValues,
  collectCustomizationSlots,
  collectHighlights,
  collectListingInput,
  collectVariants,
} from "@/lib/products/listing-editor-collectors";
import {
  describeProductPublishBlock,
  describeProductPublishRefusal,
} from "@/lib/products/publish-refusal";
import { formatByteSizeLabel } from "@/lib/store/format";
import type { ProductDocumentKind } from "@/lib/store/products.schemas";
import type { ProductSamplePolicy, ProductSellingState } from "@/lib/store/organizations.schemas";
import type { ListingCategoryChoice } from "@/components/studio/listing/listing-category-picker";
import {
  LISTING_STEPS,
  makeEmptyTierDraft,
  MAX_PRODUCT_IMAGES,
  PRODUCT_CONDITIONS,
  PRODUCT_MODEL_FILE_EXTENSION,
  PRODUCT_MODEL_MAX_BYTES,
  toProductModelChange,
  toSlotKey,
  toTierDraft,
  toVariantSlug,
  type CustomizationSlotDraft,
  type ExistingImage,
  type HighlightDraft,
  type ListingModelDraft,
  type PricingTierDraft,
  type RelationDraft,
  type SpecificationDraft,
  type VariantDraft,
} from "@/components/studio/listing/listing-editor-types";

type LoadedProductDetail = NonNullable<ReturnType<typeof useProductQuery>["data"]>;

interface ProductPrefillSetters {
  readonly setProductTitle: (value: string) => void;
  readonly setBrandName: (value: string) => void;
  readonly setCategoryChoice: (choice: ListingCategoryChoice | null) => void;
  readonly setSelectedCondition: (condition: string) => void;
  readonly setModelNumber: (modelNumber: string) => void;
  readonly setCountryOfOriginCode: (code: string) => void;
  readonly setUnitOfMeasure: (unit: string) => void;
  readonly setProductDescription: (description: string) => void;
  readonly setKeyFeatures: (features: string[]) => void;
  readonly setPriceInDollars: (price: string) => void;
  readonly setCompareAtPriceInDollars: (price: string) => void;
  readonly setStockQuantity: (quantity: string) => void;
  readonly setSkuCode: (sku: string) => void;
  readonly setSourcingQuoteProductLineId: (id: string | null) => void;
  readonly setSellingState: (state: ProductSellingState) => void;
  readonly setSamplePolicy: (policy: ProductSamplePolicy) => void;
  readonly setSamplePriceInDollars: (price: string) => void;
  readonly setMaximumSampleQuantity: (quantity: string) => void;
  readonly setPackageLengthMm: (length: string) => void;
  readonly setPackageWidthMm: (width: string) => void;
  readonly setPackageHeightMm: (height: string) => void;
  readonly setPackageGrossWeightGrams: (weight: string) => void;
  readonly setUnitsPerPackage: (units: string) => void;
  readonly setRelations: (relations: RelationDraft[]) => void;
  readonly setReadOnlyRelations: (relations: SellerProductRelation[]) => void;
  readonly setExistingImages: (images: ExistingImage[]) => void;
  readonly setExistingDocuments: (documents: readonly SellerProductDocument[]) => void;
  readonly setRemovedDocumentIds: (ids: string[]) => void;
  readonly setPendingDocuments: (documents: PendingProductDocument[]) => void;
  readonly setListingModelDraft: (draft: ListingModelDraft) => void;
  readonly setModelFileRejectionMessage: (msg: string | null) => void;
  readonly setPricingTiers: (tiers: PricingTierDraft[]) => void;
  readonly setVariants: (variants: VariantDraft[]) => void;
  readonly setRetiredVariantCount: (count: number) => void;
  readonly setCustomizationSlots: (slots: CustomizationSlotDraft[]) => void;
  readonly setRetiredCustomizationSlotCount: (count: number) => void;
  readonly setHighlights: (highlights: HighlightDraft[]) => void;
  readonly setAttributeAnswers: (answers: Record<string, string>) => void;
  readonly setSpecifications: (specifications: SpecificationDraft[]) => void;
}

function applyProductPrefill(loadedProduct: LoadedProductDetail, setters: ProductPrefillSetters) {
  setters.setProductTitle(loadedProduct.title);
  setters.setBrandName(loadedProduct.brand ?? "");
  setters.setCategoryChoice(
    loadedProduct.pendingCategoryRequestId === null
      ? {
          kind: "category",
          categoryId: loadedProduct.categoryId,
          displayLabel: "",
          categorySlug: null,
        }
      : {
          kind: "request",
          categoryRequestId: loadedProduct.pendingCategoryRequestId,
          displayLabel: "Awaiting review",
        },
  );
  setters.setSelectedCondition(
    SLUG_TO_CONDITION_LABEL[loadedProduct.condition] ?? PRODUCT_CONDITIONS[0],
  );
  setters.setModelNumber(loadedProduct.modelNumber ?? "");
  setters.setCountryOfOriginCode(loadedProduct.countryOfOriginCode ?? "");
  setters.setUnitOfMeasure(loadedProduct.unitOfMeasure ?? "");
  setters.setProductDescription(loadedProduct.description ?? "");
  setters.setKeyFeatures(loadedProduct.keyFeatures);
  setters.setPriceInDollars(centsToDollarString(loadedProduct.priceInCents));
  setters.setCompareAtPriceInDollars(
    loadedProduct.compareAtPriceInCents === null
      ? ""
      : centsToDollarString(loadedProduct.compareAtPriceInCents),
  );
  setters.setStockQuantity(String(loadedProduct.stockQuantity));
  setters.setSkuCode(loadedProduct.sku ?? "");
  setters.setSourcingQuoteProductLineId(loadedProduct.sourcingQuoteProductLineId);
  setters.setSellingState(loadedProduct.sellingState);
  setters.setSamplePolicy(loadedProduct.samplePolicy);
  setters.setSamplePriceInDollars(
    loadedProduct.samplePriceInCents === null
      ? ""
      : centsToDollarString(loadedProduct.samplePriceInCents),
  );
  setters.setMaximumSampleQuantity(String(loadedProduct.maximumSampleQuantity));
  setters.setPackageLengthMm(
    loadedProduct.packageLengthMm === null ? "" : String(loadedProduct.packageLengthMm),
  );
  setters.setPackageWidthMm(
    loadedProduct.packageWidthMm === null ? "" : String(loadedProduct.packageWidthMm),
  );
  setters.setPackageHeightMm(
    loadedProduct.packageHeightMm === null ? "" : String(loadedProduct.packageHeightMm),
  );
  setters.setPackageGrossWeightGrams(
    loadedProduct.packageGrossWeightGrams === null
      ? ""
      : String(loadedProduct.packageGrossWeightGrams),
  );
  setters.setUnitsPerPackage(
    loadedProduct.unitsPerPackage === null ? "" : String(loadedProduct.unitsPerPackage),
  );
  setters.setRelations(
    loadedProduct.relations
      .filter((relation) => relation.sourceKind === "seller_declared")
      .map((relation) => ({
        localKey: relation.id,
        toProductId: relation.toProductId,
        toProductTitle: relation.toProductTitle,
        relationKind: relation.relationKind,
      })),
  );
  setters.setReadOnlyRelations(
    loadedProduct.relations.filter((relation) => relation.sourceKind !== "seller_declared"),
  );
  setters.setExistingImages(
    loadedProduct.images
      .toSorted((first, second) => first.position - second.position)
      .map((image) => ({ id: image.id, url: image.url })),
  );
  setters.setExistingDocuments(
    loadedProduct.documents.toSorted((first, second) => first.position - second.position),
  );
  setters.setRemovedDocumentIds([]);
  setters.setPendingDocuments([]);
  setters.setListingModelDraft(
    loadedProduct.threeDimensionalModel === null
      ? { kind: "none" }
      : { kind: "existing", model: loadedProduct.threeDimensionalModel },
  );
  setters.setModelFileRejectionMessage(null);
  setters.setPricingTiers(
    loadedProduct.pricingTiers
      .toSorted((first, second) => first.position - second.position)
      .map((tier, tierIndex) => toTierDraft(tier, "hydrated-tier", tierIndex)),
  );
  setters.setVariants(
    loadedProduct.variants
      .filter((variant) => variant.state === "active")
      .toSorted((first, second) => first.position - second.position)
      .map((variant, variantIndex) => ({
        localId: `hydrated-variant-${String(variantIndex)}`,
        savedId: variant.id,
        name: variant.name,
        publicSlug: variant.publicSlug,
        isSlugEdited: true,
        sku: variant.sku ?? "",
        priceInDollars: centsToDollarString(variant.priceInCents),
        stockQuantity: String(variant.stockQuantity),
        minimumOrderQuantity:
          variant.minimumOrderQuantity === null ? "" : String(variant.minimumOrderQuantity),
        pricingTiers: variant.pricingTiers
          .toSorted((first, second) => first.position - second.position)
          .map((tier, tierIndex) =>
            toTierDraft(tier, `hydrated-variant-${String(variantIndex)}-tier`, tierIndex),
          ),
      })),
  );
  setters.setRetiredVariantCount(
    loadedProduct.variants.filter((variant) => variant.state === "retired").length,
  );
  setters.setCustomizationSlots(
    loadedProduct.customizationOptions
      .filter((option) => option.state === "active")
      .toSorted((first, second) => first.position - second.position)
      .map((option, optionIndex) => ({
        localId: `hydrated-slot-${String(optionIndex)}`,
        savedId: option.id,
        slotKey: option.slotKey,
        isSlotKeyEdited: true,
        label: option.label,
        customizationKind: option.customizationKind,
        acceptedMediaTypes: [...option.acceptedMediaTypes],
        choiceValues: [...option.choiceValues],
        minimumOrderQuantity:
          option.minimumOrderQuantity === 1 ? "" : String(option.minimumOrderQuantity),
      })),
  );
  setters.setRetiredCustomizationSlotCount(
    loadedProduct.customizationOptions.filter((option) => option.state === "retired").length,
  );
  setters.setHighlights(
    loadedProduct.highlights
      .toSorted((first, second) => first.position - second.position)
      .map((highlight, highlightIndex) => ({
        localId: `hydrated-highlight-${String(highlightIndex)}`,
        savedId: highlight.id,
        title: highlight.title,
        bodyText: highlight.bodyText,
        imageUrl: highlight.imageUrl,
        imageFile: null,
        imagePreviewUrl: null,
      })),
  );
  setters.setAttributeAnswers(
    Object.fromEntries(
      loadedProduct.attributeValues.map((attributeValue) => [
        attributeValue.attributeKey,
        attributeValue.choiceValue ??
          (attributeValue.numericValueScaled === null
            ? (attributeValue.textValue ?? "")
            : String(attributeValue.numericValueScaled / 10 ** (attributeValue.numericScale ?? 0))),
      ]),
    ),
  );
  setters.setSpecifications(
    loadedProduct.specifications
      .toSorted((first, second) => first.position - second.position)
      .map((specification, specificationIndex) => ({
        id: `hydrated-specification-${String(specificationIndex)}`,
        key: specification.key,
        value: specification.value,
        group: specification.group ?? "",
      })),
  );
}

export function useCreateListingState(productId?: string) {
  const router = useRouter();
  const specificationFieldIdPrefix = useId();
  const isEditMode = Boolean(productId);

  const productQuery = useProductQuery(productId);
  const createMutation = useCreateListingMutation();
  const updateMutation = useUpdateListingMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgress>({ phase: "idle" });
  const [localError, setLocalError] = useState<string | null>(null);

  // Step 1 — product identity
  const [productTitle, setProductTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [categoryChoice, setCategoryChoice] = useState<ListingCategoryChoice | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>(PRODUCT_CONDITIONS[0]);
  const [modelNumber, setModelNumber] = useState("");
  const [countryOfOriginCode, setCountryOfOriginCode] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");

  // Step 2 — images
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<{ file: File }[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const removedImageIdsRef = useRef<string[]>([]);
  const [relations, setRelations] = useState<RelationDraft[]>([]);
  const [readOnlyRelations, setReadOnlyRelations] = useState<SellerProductRelation[]>([]);
  const hasImageOrderChangedRef = useRef(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [listingModelDraft, setListingModelDraft] = useState<ListingModelDraft>({ kind: "none" });
  const [modelFileRejectionMessage, setModelFileRejectionMessage] = useState<string | null>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — description
  const [productDescription, setProductDescription] = useState("");
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [keyFeatureDraft, setKeyFeatureDraft] = useState("");

  // Step 4 — specifications
  const [specifications, setSpecifications] = useState<SpecificationDraft[]>([]);
  const [attributeAnswers, setAttributeAnswers] = useState<Record<string, string>>({});

  // Step 5 — highlights
  const [highlights, setHighlights] = useState<HighlightDraft[]>([]);

  // Step 6 — variants
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [retiredVariantCount, setRetiredVariantCount] = useState(0);

  // Step 7 — customization
  const [customizationSlots, setCustomizationSlots] = useState<CustomizationSlotDraft[]>([]);
  const [retiredCustomizationSlotCount, setRetiredCustomizationSlotCount] = useState(0);

  // Step 8 — documents
  const [existingDocuments, setExistingDocuments] = useState<readonly SellerProductDocument[]>([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingProductDocument[]>([]);
  const removedDocumentIdsSet = new Set(removedDocumentIds);
  const documentCount =
    existingDocuments.filter((document) => !removedDocumentIdsSet.has(document.id)).length +
    pendingDocuments.length;

  // Step 9 — pricing & inventory
  const [priceInDollars, setPriceInDollars] = useState("");
  const [compareAtPriceInDollars, setCompareAtPriceInDollars] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [sourcingQuoteProductLineId, setSourcingQuoteProductLineId] = useState<string | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTierDraft[]>([]);
  const [sellingState, setSellingState] = useState<ProductSellingState>("selling");
  const [samplePolicy, setSamplePolicy] = useState<ProductSamplePolicy>("unavailable");
  const [samplePriceInDollars, setSamplePriceInDollars] = useState("");
  const [maximumSampleQuantity, setMaximumSampleQuantity] = useState("1");
  const [packageLengthMm, setPackageLengthMm] = useState("");
  const [packageWidthMm, setPackageWidthMm] = useState("");
  const [packageHeightMm, setPackageHeightMm] = useState("");
  const [packageGrossWeightGrams, setPackageGrossWeightGrams] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");

  const [hasPrefilledFromProduct, setHasPrefilledFromProduct] = useState(false);

  const currentStep = LISTING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === LISTING_STEPS.length - 1;

  const selectedImageFiles = selectedImagePreviews.map((preview) => preview.file);
  const imageCount = existingImages.length + selectedImagePreviews.length;

  const selectedCategorySlug =
    categoryChoice?.kind === "category" ? categoryChoice.categorySlug : null;
  const attributesQuery = useStoreCategoryAttributesQuery(selectedCategorySlug);
  const categoryAttributes = attributesQuery.data ?? [];

  const filledHighlightCount = highlights.filter(
    (highlight) => highlight.title.trim().length > 0 && highlight.bodyText.trim().length > 0,
  ).length;

  const filledSpecificationCount = specifications.filter(
    (specification) => specification.key.trim().length > 0 && specification.value.trim().length > 0,
  ).length;

  const specificationGroupSuggestions = [
    ...new Set(
      specifications
        .map((specification) => specification.group.trim())
        .filter((groupName) => groupName.length > 0),
    ),
  ];

  const mutationError = createMutation.error ?? updateMutation.error;
  const publishRefusal =
    mutationError === null || mutationError === undefined
      ? null
      : describeProductPublishRefusal(mutationError);

  const publishBlockReason =
    productQuery.data === undefined ? null : describeProductPublishBlock(productQuery.data);

  // Prefill the form once from the loaded product (edit mode).
  const loadedProduct = productQuery.data;
  if (isEditMode && !hasPrefilledFromProduct && loadedProduct !== undefined) {
    setHasPrefilledFromProduct(true);
    applyProductPrefill(loadedProduct, {
      setProductTitle,
      setBrandName,
      setCategoryChoice,
      setSelectedCondition,
      setModelNumber,
      setCountryOfOriginCode,
      setUnitOfMeasure,
      setProductDescription,
      setKeyFeatures,
      setPriceInDollars,
      setCompareAtPriceInDollars,
      setStockQuantity,
      setSkuCode,
      setSourcingQuoteProductLineId,
      setSellingState,
      setSamplePolicy,
      setSamplePriceInDollars,
      setMaximumSampleQuantity,
      setPackageLengthMm,
      setPackageWidthMm,
      setPackageHeightMm,
      setPackageGrossWeightGrams,
      setUnitsPerPackage,
      setRelations,
      setReadOnlyRelations,
      setExistingImages,
      setExistingDocuments,
      setRemovedDocumentIds,
      setPendingDocuments,
      setListingModelDraft,
      setModelFileRejectionMessage,
      setPricingTiers,
      setVariants,
      setRetiredVariantCount,
      setCustomizationSlots,
      setRetiredCustomizationSlotCount,
      setHighlights,
      setAttributeAnswers,
      setSpecifications,
    });
  }

  function handleGoToStepClick(stepIndex: number) {
    if (stepIndex < currentStepIndex) setCurrentStepIndex(stepIndex);
  }

  function handleBackClick() {
    setCurrentStepIndex((previousStepIndex) => Math.max(0, previousStepIndex - 1));
  }

  function handleNextClick() {
    setCurrentStepIndex((previousStepIndex) =>
      Math.min(LISTING_STEPS.length - 1, previousStepIndex + 1),
    );
  }

  function addImageFiles(incomingFiles: FileList | null) {
    if (!incomingFiles) return;
    const imageFiles = Array.from(incomingFiles).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const remainingSlots = Math.max(
      0,
      MAX_PRODUCT_IMAGES - existingImages.length - selectedImagePreviews.length,
    );
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    if (filesToAdd.length === 0) return;
    const addedPreviews = filesToAdd.map((file) => ({
      file,
    }));
    setSelectedImagePreviews((previousPreviews) => [...previousPreviews, ...addedPreviews]);
  }

  function handleImageDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    addImageFiles(event.dataTransfer.files);
  }

  function handleImageDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleImageDragLeave(event: React.DragEvent<HTMLDivElement>) {
    const dragLeaveTarget = event.relatedTarget;
    if (dragLeaveTarget instanceof Node && event.currentTarget.contains(dragLeaveTarget)) return;
    setIsDraggingOver(false);
  }

  function handleSelectImagesClick() {
    imageInputRef.current?.click();
  }

  function handleImageInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    addImageFiles(event.target.files);
    event.target.value = "";
  }

  function handleSelectModelClick() {
    modelInputRef.current?.click();
  }

  function handleModelFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const pickedFile = event.target.files?.[0];
    event.target.value = "";
    if (!pickedFile) return;
    if (!pickedFile.name.toLowerCase().endsWith(PRODUCT_MODEL_FILE_EXTENSION)) {
      setModelFileRejectionMessage("The 3D model must be a binary glTF (.glb) file.");
      return;
    }
    if (pickedFile.size > PRODUCT_MODEL_MAX_BYTES) {
      setModelFileRejectionMessage(
        `That file is ${formatByteSizeLabel(pickedFile.size)}; the limit is 10 MB.`,
      );
      return;
    }
    setModelFileRejectionMessage(null);
    setListingModelDraft({ kind: "pending", modelFile: pickedFile });
  }

  function handleRemoveModelClick() {
    setModelFileRejectionMessage(null);
    setListingModelDraft((previousDraft) => {
      switch (previousDraft.kind) {
        case "existing":
          return { kind: "removing", model: previousDraft.model };
        case "pending": {
          const savedModel = loadedProduct?.threeDimensionalModel ?? null;
          return savedModel === null ? { kind: "none" } : { kind: "existing", model: savedModel };
        }
        case "none":
        case "removing":
          return previousDraft;
        default: {
          const exhaustiveCheck: never = previousDraft;
          return exhaustiveCheck;
        }
      }
    });
  }

  function handleUndoRemoveModelClick() {
    setListingModelDraft((previousDraft) =>
      previousDraft.kind === "removing"
        ? { kind: "existing", model: previousDraft.model }
        : previousDraft,
    );
  }

  function handleRemoveImageClick(imageIndexToRemove: number) {
    setSelectedImagePreviews((previousPreviews) =>
      previousPreviews.filter((_, imageIndex) => imageIndex !== imageIndexToRemove),
    );
  }

  function handleRemoveExistingImage(imageId: string) {
    setExistingImages((previousImages) => previousImages.filter((image) => image.id !== imageId));
    removedImageIdsRef.current.push(imageId);
  }

  function handleMoveExistingImage(imageIndex: number, direction: -1 | 1) {
    const targetIndex = imageIndex + direction;
    setExistingImages((previousImages) => {
      if (targetIndex < 0 || targetIndex >= previousImages.length) return previousImages;
      const reordered = [...previousImages];
      const moved = reordered[imageIndex];
      const displaced = reordered[targetIndex];
      if (moved === undefined || displaced === undefined) return previousImages;
      reordered[imageIndex] = displaced;
      reordered[targetIndex] = moved;
      return reordered;
    });
    if (targetIndex >= 0) hasImageOrderChangedRef.current = true;
  }

  function handleMakeMainImageClick(imageIndex: number) {
    if (imageIndex === 0) return;
    setExistingImages((previousImages) => {
      const promoted = previousImages[imageIndex];
      if (promoted === undefined) return previousImages;
      return [promoted, ...previousImages.filter((_, index) => index !== imageIndex)];
    });
    hasImageOrderChangedRef.current = true;
  }

  function handleMoveSelectedPreview(previewIndex: number, direction: -1 | 1) {
    const targetIndex = previewIndex + direction;
    setSelectedImagePreviews((previousPreviews) => {
      if (targetIndex < 0 || targetIndex >= previousPreviews.length) return previousPreviews;
      const reordered = [...previousPreviews];
      const moved = reordered[previewIndex];
      const displaced = reordered[targetIndex];
      if (moved === undefined || displaced === undefined) return previousPreviews;
      reordered[previewIndex] = displaced;
      reordered[targetIndex] = moved;
      return reordered;
    });
  }

  function handleAddKeyFeatureClick() {
    const trimmedFeature = keyFeatureDraft.trim();
    if (trimmedFeature.length === 0) return;
    setKeyFeatures((previousFeatures) => [...previousFeatures, trimmedFeature]);
    setKeyFeatureDraft("");
  }

  function handleRemoveKeyFeatureClick(featureIndexToRemove: number) {
    setKeyFeatures((previousFeatures) =>
      previousFeatures.filter((_, featureIndex) => featureIndex !== featureIndexToRemove),
    );
  }

  function handleAddTierClick() {
    setPricingTiers((previousTiers) => [...previousTiers, makeEmptyTierDraft()]);
  }

  function handleTierChange(
    tierIndex: number,
    field: "unitPriceInDollars" | "minimumOrderQuantity" | "leadTimeDays",
    value: string,
  ) {
    setPricingTiers((previousTiers) =>
      previousTiers.map((tier, index) =>
        index === tierIndex ? { ...tier, [field]: value } : tier,
      ),
    );
  }

  function handleRemoveTierClick(tierIndexToRemove: number) {
    setPricingTiers((previousTiers) =>
      previousTiers.filter((_, tierIndex) => tierIndex !== tierIndexToRemove),
    );
  }

  function handleAddVariantClick() {
    setVariants((previous) => [
      ...previous,
      {
        localId: crypto.randomUUID(),
        savedId: null,
        name: "",
        publicSlug: "",
        isSlugEdited: false,
        sku: "",
        priceInDollars: "",
        stockQuantity: "",
        minimumOrderQuantity: "",
        pricingTiers: [],
      },
    ]);
  }

  function handleVariantNameChange(variantIndex: number, value: string) {
    setVariants((previous) =>
      previous.map((variant, index) => {
        if (index !== variantIndex) return variant;
        const shouldFollowName = variant.savedId === null && !variant.isSlugEdited;
        return {
          ...variant,
          name: value,
          publicSlug: shouldFollowName ? toVariantSlug(value) : variant.publicSlug,
        };
      }),
    );
  }

  function handleVariantSlugChange(variantIndex: number, value: string) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? { ...variant, publicSlug: toVariantSlug(value), isSlugEdited: true }
          : variant,
      ),
    );
  }

  function handleVariantFieldChange(
    variantIndex: number,
    field: "sku" | "priceInDollars" | "stockQuantity" | "minimumOrderQuantity",
    value: string,
  ) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex ? { ...variant, [field]: value } : variant,
      ),
    );
  }

  function handleAddVariantTierClick(variantIndex: number) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? { ...variant, pricingTiers: [...variant.pricingTiers, makeEmptyTierDraft()] }
          : variant,
      ),
    );
  }

  function handleVariantTierChange(
    variantIndex: number,
    tierIndex: number,
    field: "unitPriceInDollars" | "minimumOrderQuantity" | "leadTimeDays",
    value: string,
  ) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              pricingTiers: variant.pricingTiers.map((tier, index2) =>
                index2 === tierIndex ? { ...tier, [field]: value } : tier,
              ),
            }
          : variant,
      ),
    );
  }

  function handleRemoveVariantTierClick(variantIndex: number, tierIndexToRemove: number) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              pricingTiers: variant.pricingTiers.filter(
                (_, tierIndex) => tierIndex !== tierIndexToRemove,
              ),
            }
          : variant,
      ),
    );
  }

  function handleRemoveVariantClick(variantIndexToRemove: number) {
    setVariants((previous) => previous.filter((_, index) => index !== variantIndexToRemove));
  }

  function handleAddHighlightClick() {
    setHighlights((previous) => [
      ...previous,
      {
        localId: crypto.randomUUID(),
        savedId: null,
        title: "",
        bodyText: "",
        imageUrl: null,
        imageFile: null,
        imagePreviewUrl: null,
      },
    ]);
  }

  function handleHighlightTextChange(
    highlightIndex: number,
    field: "title" | "bodyText",
    value: string,
  ) {
    setHighlights((previous) =>
      previous.map((highlight, index) =>
        index === highlightIndex ? { ...highlight, [field]: value } : highlight,
      ),
    );
  }

  function handleHighlightImageChange(highlightIndex: number, imageFile: File | null) {
    setHighlights((previous) =>
      previous.map((highlight, index) =>
        index === highlightIndex ? { ...highlight, imageFile, imagePreviewUrl: null } : highlight,
      ),
    );
  }

  function handleRemoveHighlightClick(highlightIndexToRemove: number) {
    setHighlights((previous) => previous.filter((_, index) => index !== highlightIndexToRemove));
  }

  function handleAddSpecificationClick() {
    setSpecifications((previousSpecifications) => [
      ...previousSpecifications,
      { id: crypto.randomUUID(), key: "", value: "", group: "" },
    ]);
  }

  function handleSpecificationChange(
    specificationIndex: number,
    field: keyof SpecificationDraft,
    value: string,
  ) {
    setSpecifications((previousSpecifications) =>
      previousSpecifications.map((specification, index) =>
        index === specificationIndex ? { ...specification, [field]: value } : specification,
      ),
    );
  }

  function handleRemoveSpecificationClick(specificationIndexToRemove: number) {
    setSpecifications((previousSpecifications) =>
      previousSpecifications.filter(
        (_, specificationIndex) => specificationIndex !== specificationIndexToRemove,
      ),
    );
  }

  function handleAddCustomizationSlotClick() {
    setCustomizationSlots((previous) => [
      ...previous,
      {
        localId: `slot-${String(Date.now())}-${String(previous.length)}`,
        savedId: null,
        slotKey: "",
        isSlotKeyEdited: false,
        label: "",
        customizationKind: "choice",
        acceptedMediaTypes: [],
        choiceValues: [],
        minimumOrderQuantity: "",
      },
    ]);
  }

  function handleRemoveCustomizationSlotClick(slotIndex: number) {
    setCustomizationSlots((previous) => previous.filter((_, index) => index !== slotIndex));
  }

  function updateCustomizationSlot(
    slotIndex: number,
    patch: Partial<CustomizationSlotDraft>,
  ): void {
    setCustomizationSlots((previous) =>
      previous.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)),
    );
  }

  function handleCustomizationLabelChange(slotIndex: number, label: string) {
    const slot = customizationSlots[slotIndex];
    if (slot === undefined) return;
    updateCustomizationSlot(slotIndex, {
      label,
      ...(slot.isSlotKeyEdited ? {} : { slotKey: toSlotKey(label) }),
    });
  }

  function handleRemoveExistingDocument(documentId: string) {
    setRemovedDocumentIds((previous) => [...previous, documentId]);
  }

  function handleRemovePendingDocument(indexToRemove: number) {
    setPendingDocuments((previous) =>
      previous.filter((_, entryIndex) => entryIndex !== indexToRemove),
    );
  }

  function handlePendingDocumentKindChange(index: number, nextKind: ProductDocumentKind) {
    setPendingDocuments((previous) =>
      previous.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, documentKind: nextKind } : entry,
      ),
    );
  }

  function handleAddPendingDocument(file: File) {
    setPendingDocuments((previous) => [...previous, { file, documentKind: "datasheet" }]);
  }

  function handleAttributeAnswerChange(attributeKey: string, value: string) {
    setAttributeAnswers((previous) => ({ ...previous, [attributeKey]: value }));
  }

  function handleSave(publish: boolean) {
    if (isSaving) return;
    const input = collectListingInput({
      productTitle,
      brandName,
      categoryChoice,
      selectedCondition,
      modelNumber,
      countryOfOriginCode,
      unitOfMeasure,
      productDescription,
      keyFeatures,
      priceInDollars,
      compareAtPriceInDollars,
      stockQuantity,
      skuCode,
      pricingTiers,
      sellingState,
      specifications,
      sourcingQuoteProductLineId,
      samplePolicy,
      samplePriceInDollars,
      maximumSampleQuantity,
      packageLengthMm,
      packageWidthMm,
      packageHeightMm,
      packageGrossWeightGrams,
      unitsPerPackage,
    });
    if ("error" in input) {
      setLocalError(input.error);
      return;
    }
    const collectedVariants = collectVariants(variants);
    if ("error" in collectedVariants) {
      setLocalError(collectedVariants.error);
      return;
    }
    const collectedCustomizationSlots = collectCustomizationSlots(customizationSlots);
    if ("error" in collectedCustomizationSlots) {
      setLocalError(collectedCustomizationSlots.error);
      return;
    }
    setLocalError(null);
    const collectedHighlights = collectHighlights(highlights);
    const collectedAttributeValues = collectAttributeValues(categoryAttributes, attributeAnswers);

    if (isEditMode && productId) {
      updateMutation.mutate(
        {
          productId,
          patch: input,
          newImageFiles: selectedImageFiles,
          removedImageIds: removedImageIdsRef.current,
          keptImageIdsInOrder: hasImageOrderChangedRef.current
            ? existingImages.map((image) => image.id)
            : [],
          relations: relations.map((relation) => ({
            toProductId: relation.toProductId,
            relationKind: relation.relationKind,
          })),
          highlights: collectedHighlights.plan,
          highlightImageFileByIndex: collectedHighlights.imageFileByIndex,
          attributeValues: collectedAttributeValues,
          newDocuments: pendingDocuments,
          removedDocumentIds,
          variants: collectedVariants.variants,
          customizationOptions: collectedCustomizationSlots.slots,
          modelChange: toProductModelChange(listingModelDraft),
          publish,
          onProgress: setSaveProgress,
        },
        { onSuccess: () => router.push("/studio/products") },
      );
      return;
    }

    createMutation.mutate(
      {
        input,
        imageFiles: selectedImageFiles,
        highlights: collectedHighlights.plan,
        highlightImageFileByIndex: collectedHighlights.imageFileByIndex,
        attributeValues: collectedAttributeValues,
        newDocuments: pendingDocuments,
        variants: collectedVariants.variants,
        customizationOptions: collectedCustomizationSlots.slots,
        modelFile: listingModelDraft.kind === "pending" ? listingModelDraft.modelFile : null,
        publish,
        onProgress: setSaveProgress,
      },
      {
        onSuccess: () => {
          if (publish) setIsPublished(true);
          else router.push("/studio/products");
        },
      },
    );
  }

  return {
    isEditMode,
    isSaving,
    isPublished,
    saveProgress,
    localError,
    publishRefusal,
    publishBlockReason,
    productQuery,
    currentStepIndex,
    setCurrentStepIndex,
    currentStep,
    isLastStep,
    handleGoToStepClick,
    handleBackClick,
    handleNextClick,
    handleSave,
    // Step 1
    productTitle,
    setProductTitle,
    brandName,
    setBrandName,
    categoryChoice,
    setCategoryChoice,
    selectedCondition,
    setSelectedCondition,
    modelNumber,
    setModelNumber,
    countryOfOriginCode,
    setCountryOfOriginCode,
    unitOfMeasure,
    setUnitOfMeasure,
    // Step 2
    selectedImagePreviews,
    existingImages,
    imageCount,
    isDraggingOver,
    imageInputRef,
    listingModelDraft,
    modelFileRejectionMessage,
    modelInputRef,
    handleImageDrop,
    handleImageDragOver,
    handleImageDragLeave,
    handleSelectImagesClick,
    handleImageInputChange,
    handleRemoveImageClick,
    handleRemoveExistingImage,
    handleMoveExistingImage,
    handleMakeMainImageClick,
    handleMoveSelectedPreview,
    handleSelectModelClick,
    handleModelFileChange,
    handleRemoveModelClick,
    handleUndoRemoveModelClick,
    // Step 3
    productDescription,
    setProductDescription,
    keyFeatures,
    keyFeatureDraft,
    setKeyFeatureDraft,
    handleAddKeyFeatureClick,
    handleRemoveKeyFeatureClick,
    // Step 4
    specificationFieldIdPrefix,
    specifications,
    attributeAnswers,
    categoryAttributes,
    selectedCategorySlug,
    isAttributesPending: attributesQuery.isPending,
    specificationGroupSuggestions,
    filledSpecificationCount,
    handleSpecificationChange,
    handleAddSpecificationClick,
    handleRemoveSpecificationClick,
    handleAttributeAnswerChange,
    // Step 5
    highlights,
    filledHighlightCount,
    handleAddHighlightClick,
    handleHighlightTextChange,
    handleHighlightImageChange,
    handleRemoveHighlightClick,
    // Step 6
    existingDocuments,
    removedDocumentIdsSet,
    pendingDocuments,
    documentCount,
    handleRemoveExistingDocument,
    handleRemovePendingDocument,
    handlePendingDocumentKindChange,
    handleAddPendingDocument,
    // Step 7
    priceInDollars,
    setPriceInDollars,
    compareAtPriceInDollars,
    setCompareAtPriceInDollars,
    stockQuantity,
    setStockQuantity,
    skuCode,
    setSkuCode,
    sourcingQuoteProductLineId,
    setSourcingQuoteProductLineId,
    sellingState,
    setSellingState,
    pricingTiers,
    handleAddTierClick,
    handleTierChange,
    handleRemoveTierClick,
    samplePolicy,
    setSamplePolicy,
    samplePriceInDollars,
    setSamplePriceInDollars,
    maximumSampleQuantity,
    setMaximumSampleQuantity,
    packageLengthMm,
    setPackageLengthMm,
    packageWidthMm,
    setPackageWidthMm,
    packageHeightMm,
    setPackageHeightMm,
    packageGrossWeightGrams,
    setPackageGrossWeightGrams,
    unitsPerPackage,
    setUnitsPerPackage,
    // Step 8
    variants,
    retiredVariantCount,
    handleAddVariantClick,
    handleVariantNameChange,
    handleVariantSlugChange,
    handleVariantFieldChange,
    handleAddVariantTierClick,
    handleVariantTierChange,
    handleRemoveVariantTierClick,
    handleRemoveVariantClick,
    // Step 9
    customizationSlots,
    retiredCustomizationSlotCount,
    handleAddCustomizationSlotClick,
    handleRemoveCustomizationSlotClick,
    handleCustomizationLabelChange,
    updateCustomizationSlot,
    // Step 10
    relations,
    setRelations,
    readOnlyRelations,
  };
}
