"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  useCreateListingMutation,
  useProductQuery,
  useUpdateListingMutation,
  type SaveProgress,
} from "@/hooks/products";
import {
  ListingCategoryPicker,
  type ListingCategoryChoice,
} from "@/components/studio/listing/listing-category-picker";
import {
  centsToDollarString,
  CONDITION_LABEL_TO_SLUG,
  CONDITION_LABELS,
  dollarsToCents,
  PACKAGE_DIMENSION_MM_MAX,
  PACKAGE_GROSS_WEIGHT_GRAMS_MAX,
  SLUG_TO_CONDITION_LABEL,
  UNITS_PER_PACKAGE_MAX,
  type CreateProductInput,
  type ListingCompleteness,
} from "@/lib/products/schemas";
import {
  PRODUCT_SAMPLE_POLICIES,
  ProductSamplePolicySchema,
  SAMPLE_POLICY_LABELS,
  type ProductSamplePolicy,
} from "@/lib/store/organizations.schemas";
import {
  describeProductPublishBlock,
  describeProductPublishRefusal,
  LISTING_REQUIREMENT_LABELS,
  type ProductPublishRefusal,
} from "@/lib/products/publish-refusal";

const LISTING_STEPS = [
  { id: "identity", label: "Product Identity" },
  { id: "images", label: "Images & Media" },
  { id: "description", label: "Description" },
  { id: "pricing", label: "Pricing & Inventory" },
  { id: "review", label: "Review & Publish" },
] as const;

type ListingStepId = (typeof LISTING_STEPS)[number]["id"];

const PRODUCT_CONDITIONS = CONDITION_LABELS;

const PRODUCT_TITLE_MAX_LENGTH = 200;
const MAX_PRODUCT_IMAGES = 9;

/** A pricing tier as typed in the form (dollar/quantity strings). */
interface PricingTierDraft {
  /** Stable per-row key for the React list; generated on create/hydrate, never sent to the backend. */
  id: string;
  unitPriceInDollars: string;
  minimumOrderQuantity: string;
}

/** An image already stored on the backend (edit mode). */
interface ExistingImage {
  id: string;
  url: string;
}

// Multi-step wizard for creating (or, with `productId`, editing) a store listing.
// Submits through the /products API: create draft -> upload each image -> publish.
export default function CreateListingPage({ productId }: { productId?: string }) {
  const router = useRouter();
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
  /**
   * Either a chosen category or a pending request for one. Null until the seller picks.
   *
   * The old `selectedCategory` held a DISPLAY LABEL and was mapped back to a hardcoded slug
   * at submit time. That taxonomy no longer exists; a listing now carries a `categoryId`
   * read from the store's own tree, or a `categoryRequestId` while it waits in Misc.
   */
  const [categoryChoice, setCategoryChoice] = useState<ListingCategoryChoice | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>(PRODUCT_CONDITIONS[0]);

  // Step 2 — images. Preview URLs are created in the pick/drop handlers and revoked on
  // remove or unmount — never from an effect that then setState, which the compiler rejects.
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<
    { file: File; previewUrl: string }[]
  >([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectedImagePreviewUrlsRef = useRef<string[]>([]);

  // Step 3 — description
  const [productDescription, setProductDescription] = useState("");
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [keyFeatureDraft, setKeyFeatureDraft] = useState("");

  // Step 4 — pricing & inventory
  const [priceInDollars, setPriceInDollars] = useState("");
  const [compareAtPriceInDollars, setCompareAtPriceInDollars] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [pricingTiers, setPricingTiers] = useState<PricingTierDraft[]>([]);

  // Step 4 — the three sample facts (A17). Three controls because they answer three questions:
  // whether a sample can be had, what it costs, and how many one order may hold. The cap is not
  // decoration — a sample skips the tier ladder and the minimum order quantity, so an uncapped
  // "sample" line is a bulk order at sample pricing, and on a refundable listing it mints a credit
  // the size of the whole line.
  const [samplePolicy, setSamplePolicy] = useState<ProductSamplePolicy>("unavailable");
  const [samplePriceInDollars, setSamplePriceInDollars] = useState("");
  const [maximumSampleQuantity, setMaximumSampleQuantity] = useState("1");

  // Step 4 — the five shipping facts (§19.9a). HELD AS TYPED STRINGS IN THEIR OWN UNIT, never as a
  // formatted "52 × 46 × 12 cm" this file would then have to parse back. The unit is in the label
  // and in the field name, and the conversion to an integer happens once, in `collectListingInput`.
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

  // THE REFUSAL IS CLASSIFIED, NOT FLATTENED TO ITS FIRST SENTENCE. `readMutationError` used to read
  // `apiError.message` alone, which discarded `errors.missing` — the only thing on the wire that
  // says WHICH field is empty — and turned a five-field refusal into "This listing is not complete
  // enough to publish." with no destination.
  const mutationError = createMutation.error ?? updateMutation.error;
  const publishRefusal =
    mutationError === null || mutationError === undefined
      ? null
      : describeProductPublishRefusal(mutationError);

  /**
   * Why publish is refused BEFORE the request, read off the server's own projection.
   *
   * ONLY IN EDIT MODE, because `listingCompleteness` is a property of a row that exists. A listing
   * being created has no server-side verdict yet, so the button stays live and the 422 — which now
   * names its fields — is what teaches. Guessing a verdict here would be the second opinion
   * `describeProductPublishBlock` exists to avoid.
   */
  const publishBlockReason =
    productQuery.data === undefined ? null : describeProductPublishBlock(productQuery.data);

  // Prefill the form once from the loaded product (edit mode).
  const loadedProduct = productQuery.data;
  if (isEditMode && !hasPrefilledFromProduct && loadedProduct !== undefined) {
    setHasPrefilledFromProduct(true);
    setProductTitle(loadedProduct.title);
    setBrandName(loadedProduct.brand ?? "");
    // A listing still awaiting a verdict hydrates as its REQUEST, not as Misc: Misc is where
    // it is parked, never a category its owner chose, and showing it as chosen would invite
    // the seller to "confirm" a placement that was never theirs.
    setCategoryChoice(
      loadedProduct.pendingCategoryRequestId === null
        ? // The label is left empty rather than guessed: the read returns the category ID,
          // not its name, and inventing one here would put a wrong word in the review step.
          // The picker fills it in as soon as the seller touches the control.
          { kind: "category", categoryId: loadedProduct.categoryId, displayLabel: "" }
        : {
            kind: "request",
            categoryRequestId: loadedProduct.pendingCategoryRequestId,
            displayLabel: "Awaiting review",
          },
    );
    setSelectedCondition(SLUG_TO_CONDITION_LABEL[loadedProduct.condition] ?? PRODUCT_CONDITIONS[0]);
    setProductDescription(loadedProduct.description ?? "");
    setKeyFeatures(loadedProduct.keyFeatures);
    setPriceInDollars(centsToDollarString(loadedProduct.priceInCents));
    setCompareAtPriceInDollars(
      loadedProduct.compareAtPriceInCents === null
        ? ""
        : centsToDollarString(loadedProduct.compareAtPriceInCents),
    );
    setStockQuantity(String(loadedProduct.stockQuantity));
    setSkuCode(loadedProduct.sku ?? "");
    setSamplePolicy(loadedProduct.samplePolicy);
    // NULL IS UNSTATED, NOT FREE — it hydrates as an empty control, the same rule the shipping
    // facts follow below. A zero here would be a declared price of nothing.
    setSamplePriceInDollars(
      loadedProduct.samplePriceInCents === null
        ? ""
        : centsToDollarString(loadedProduct.samplePriceInCents),
    );
    setMaximumSampleQuantity(String(loadedProduct.maximumSampleQuantity));
    // `null` means NEVER MEASURED, and hydrates as an empty control rather than a zero. A zero here
    // would be a declared measurement of nothing, which is the one answer no seller meant to give.
    setPackageLengthMm(
      loadedProduct.packageLengthMm === null ? "" : String(loadedProduct.packageLengthMm),
    );
    setPackageWidthMm(
      loadedProduct.packageWidthMm === null ? "" : String(loadedProduct.packageWidthMm),
    );
    setPackageHeightMm(
      loadedProduct.packageHeightMm === null ? "" : String(loadedProduct.packageHeightMm),
    );
    setPackageGrossWeightGrams(
      loadedProduct.packageGrossWeightGrams === null
        ? ""
        : String(loadedProduct.packageGrossWeightGrams),
    );
    setUnitsPerPackage(
      loadedProduct.unitsPerPackage === null ? "" : String(loadedProduct.unitsPerPackage),
    );
    setExistingImages(
      loadedProduct.images
        .toSorted((first, second) => first.position - second.position)
        .map((image) => ({ id: image.id, url: image.url })),
    );
    setPricingTiers(
      loadedProduct.pricingTiers
        .toSorted((first, second) => first.position - second.position)
        .map((tier, tierIndex) => ({
          id: `hydrated-tier-${String(tierIndex)}`,
          unitPriceInDollars: centsToDollarString(tier.unitPriceInCents),
          minimumOrderQuantity: String(tier.minimumOrderQuantity),
        })),
    );
  }

  useEffect(() => {
    selectedImagePreviewUrlsRef.current = selectedImagePreviews.map(
      (preview) => preview.previewUrl,
    );
  }, [selectedImagePreviews]);

  useEffect(() => {
    return () => {
      selectedImagePreviewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

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
    setSelectedImagePreviews((previousPreviews) => [
      ...previousPreviews,
      ...filesToAdd.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
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
    // Ignore drag-leave events fired when moving over child elements.
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

  function handleRemoveImageClick(imageIndexToRemove: number) {
    setSelectedImagePreviews((previousPreviews) => {
      const previewToRemove = previousPreviews[imageIndexToRemove];
      if (previewToRemove) URL.revokeObjectURL(previewToRemove.previewUrl);
      return previousPreviews.filter((_, imageIndex) => imageIndex !== imageIndexToRemove);
    });
  }

  function handleRemoveExistingImage(imageId: string) {
    setExistingImages((previousImages) => previousImages.filter((image) => image.id !== imageId));
    setRemovedImageIds((previousIds) => [...previousIds, imageId]);
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
    setPricingTiers((previousTiers) => [
      ...previousTiers,
      { id: crypto.randomUUID(), unitPriceInDollars: "", minimumOrderQuantity: "" },
    ]);
  }

  function handleTierChange(tierIndex: number, field: keyof PricingTierDraft, value: string) {
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

  /** Build the request DTO from form state, or return a client-side error. */
  function collectListingInput(): CreateProductInput | { error: string } {
    const title = productTitle.trim();
    if (title.length === 0) return { error: "Product title is required." };

    if (categoryChoice === null) {
      return { error: "Select a category, or request the one you need." };
    }

    const priceInCents = dollarsToCents(priceInDollars);
    if (priceInCents === null) return { error: "Enter a valid price." };

    const compareAtPriceInCents = dollarsToCents(compareAtPriceInDollars);
    const parsedStock = Number.parseInt(stockQuantity, 10);
    const resolvedStock = Number.isFinite(parsedStock) && parsedStock > 0 ? parsedStock : 0;

    const tiers: { unitPriceInCents: number; minimumOrderQuantity: number }[] = [];
    for (const tier of pricingTiers) {
      const isBlankRow =
        tier.unitPriceInDollars.trim().length === 0 &&
        tier.minimumOrderQuantity.trim().length === 0;
      if (isBlankRow) continue;
      const unitPriceInCents = dollarsToCents(tier.unitPriceInDollars);
      const minimumOrderQuantity = Number.parseInt(tier.minimumOrderQuantity, 10);
      if (
        unitPriceInCents === null ||
        !Number.isFinite(minimumOrderQuantity) ||
        minimumOrderQuantity < 1
      ) {
        return {
          error: "Each pricing tier needs a valid unit price and a minimum quantity of at least 1.",
        };
      }
      tiers.push({ unitPriceInCents, minimumOrderQuantity });
    }

    /**
     * A17. The three sample facts, collected as ONE arm per policy rather than three independent
     * fields, because the backend refuses the halfway states: `paid`/`refundable` without a price,
     * and `unavailable` WITH one. Sending a leftover price beside `unavailable` is the mistake that
     * looks harmless in the form and 422s at save.
     */
    const samplePriceInCents = dollarsToCents(samplePriceInDollars);
    if (samplePolicy !== "unavailable" && samplePriceInCents === null) {
      return { error: "A paid or refundable sample needs a sample price." };
    }
    const parsedMaximumSampleQuantity = Number.parseInt(maximumSampleQuantity, 10);
    if (
      samplePolicy !== "unavailable" &&
      (!Number.isFinite(parsedMaximumSampleQuantity) ||
        parsedMaximumSampleQuantity < 1 ||
        parsedMaximumSampleQuantity > 20)
    ) {
      return { error: "Samples per order must be a whole number between 1 and 20." };
    }
    const sampleFacts =
      samplePolicy === "unavailable"
        ? { samplePolicy: "unavailable" as const }
        : {
            samplePolicy,
            samplePriceInCents: samplePriceInCents ?? undefined,
            maximumSampleQuantity: parsedMaximumSampleQuantity,
          };

    const packaging = collectPackagingFacts({
      packageLengthMm,
      packageWidthMm,
      packageHeightMm,
      packageGrossWeightGrams,
      unitsPerPackage,
    });
    if ("error" in packaging) return packaging;

    return {
      title,
      brand: brandName.trim() || undefined,
      // EXACTLY ONE of the two. The backend's create schema refuses both together rather
      // than picking which the seller meant, so spreading the chosen arm is what keeps the
      // two spellings from ever travelling in the same body.
      ...(categoryChoice.kind === "category"
        ? { categoryId: categoryChoice.categoryId }
        : { categoryRequestId: categoryChoice.categoryRequestId }),
      condition: CONDITION_LABEL_TO_SLUG[selectedCondition] ?? "new",
      description: productDescription.trim() || undefined,
      keyFeatures,
      priceInCents,
      compareAtPriceInCents: compareAtPriceInCents ?? undefined,
      stockQuantity: resolvedStock,
      sku: skuCode.trim() || undefined,
      pricingTiers: tiers,
      ...sampleFacts,
      ...packaging.facts,
    };
  }

  function handleSave(publish: boolean) {
    if (isSaving) return;
    const input = collectListingInput();
    if ("error" in input) {
      setLocalError(input.error);
      return;
    }
    setLocalError(null);

    if (isEditMode && productId) {
      updateMutation.mutate(
        {
          productId,
          patch: input,
          newImageFiles: selectedImageFiles,
          removedImageIds,
          publish,
          onProgress: setSaveProgress,
        },
        { onSuccess: () => router.push("/studio/products") },
      );
      return;
    }

    createMutation.mutate(
      { input, imageFiles: selectedImageFiles, publish, onProgress: setSaveProgress },
      {
        onSuccess: () => {
          if (publish) setIsPublished(true);
          else router.push("/studio/products");
        },
      },
    );
  }

  if (isPublished) {
    return (
      <div className="p-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-2xl border border-border py-24">
          <span className="flex size-32 items-center justify-center rounded-full bg-secondary">
            <Image
              src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={48}
              height={48}
            />
          </span>
          <p className="text-lg font-medium text-foreground">Your listing has been published</p>
          <p className="text-sm text-muted-foreground">
            {productTitle.trim() || "Your product"} is now live on the Qatoto Store.
          </p>
          <Link
            href="/studio/products"
            className="mt-2 flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Image
              src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
            Back to My Products
          </Link>
        </div>
      </div>
    );
  }

  // Edit mode: block the form until the listing loads (or show a load error).
  if (isEditMode && productQuery.isPending) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-24">
          <p className="text-sm text-muted-foreground">Loading listing…</p>
        </div>
      </div>
    );
  }
  if (isEditMode && productQuery.isError) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-24">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load this listing.</p>
          <Link
            href="/studio/products"
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            Back to My Products
          </Link>
        </div>
      </div>
    );
  }

  function renderCurrentStep(stepId: ListingStepId) {
    switch (stepId) {
      case "identity":
        return (
          <StepCard
            title="Product Identity"
            subtitle="Tell buyers what your product is and where it belongs."
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-title" className="text-sm font-medium text-foreground">
                Product title
              </label>
              <input
                id="product-title"
                type="text"
                value={productTitle}
                maxLength={PRODUCT_TITLE_MAX_LENGTH}
                onChange={(event) => setProductTitle(event.target.value)}
                placeholder="e.g. Wireless Noise-Cancelling Headphones, Black"
                className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
              />
              <p className="text-xs text-muted-foreground">
                {productTitle.length}/{PRODUCT_TITLE_MAX_LENGTH} characters
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="brand-name" className="text-sm font-medium text-foreground">
                  Brand
                </label>
                <input
                  id="brand-name"
                  type="text"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder="e.g. Qatoto Originals"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
              </div>

              {/* The picker owns its own reads — it walks the real category tree a level at
                  a time, because the backend accepts only an ACTIVE LEAF. It also carries
                  the "my category isn't listed" path, which is a request rather than a
                  blocker: the listing publishes into Misc and moves when it is approved. */}
              <ListingCategoryPicker
                value={categoryChoice}
                isDisabled={isSaving}
                onChange={setCategoryChoice}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Condition</span>
              <div className="flex gap-2">
                {PRODUCT_CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => setSelectedCondition(condition)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      selectedCondition === condition
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
          </StepCard>
        );

      case "images":
        return (
          <StepCard
            title="Images & Media"
            subtitle={`Add up to ${MAX_PRODUCT_IMAGES} images. The first image becomes your main listing photo.`}
          >
            <div
              onDrop={handleImageDrop}
              onDragOver={handleImageDragOver}
              onDragLeave={handleImageDragLeave}
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border py-16 transition-colors ${
                isDraggingOver ? "border-[#1DBDC5] bg-secondary/50" : "border-border"
              }`}
            >
              <span className="flex size-24 items-center justify-center rounded-full bg-secondary">
                <Image
                  src="/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={40}
                  height={40}
                />
              </span>
              <p className="text-base font-medium text-foreground">
                {isDraggingOver ? "Drop images to add" : "Drag and drop product images"}
              </p>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleSelectImagesClick}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              >
                <Image
                  src="/icons/add_photo_alternate_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={20}
                  height={20}
                />
                Select images
              </button>
            </div>

            {imageCount > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {existingImages.map((image, imageIndex) => (
                  <div
                    key={image.id}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30"
                  >
                    {imageIndex === 0 && (
                      <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Main image
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(image.id)}
                      aria-label="Remove image"
                      className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background transition-opacity hover:opacity-80"
                    >
                      <Image
                        src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={14}
                        height={14}
                      />
                    </button>
                    {/* Remote Cloudinary asset; plain <img> avoids next/image domain config. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="size-full object-cover" />
                  </div>
                ))}
                {selectedImagePreviews.map((imagePreview, imageIndex) => (
                  <div
                    key={`${imagePreview.file.name}-${imagePreview.file.size}-${imageIndex}`}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30"
                  >
                    {existingImages.length === 0 && imageIndex === 0 && (
                      <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Main image
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImageClick(imageIndex)}
                      aria-label={`Remove ${imagePreview.file.name}`}
                      className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background transition-opacity hover:opacity-80"
                    >
                      <Image
                        src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={14}
                        height={14}
                      />
                    </button>
                    {/* Object URL created when the file was picked; plain <img> for blob: URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview.previewUrl}
                      alt={imagePreview.file.name}
                      className="size-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {imageCount}/{MAX_PRODUCT_IMAGES} images added
            </p>
          </StepCard>
        );

      case "description":
        return (
          <StepCard
            title="Description"
            subtitle="Describe your product and highlight what makes it worth buying."
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-description" className="text-sm font-medium text-foreground">
                Product description
              </label>
              <textarea
                id="product-description"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Describe materials, dimensions, use cases, and anything a buyer should know."
                rows={6}
                className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="key-feature" className="text-sm font-medium text-foreground">
                Key features
              </label>
              <div className="flex gap-2">
                <input
                  id="key-feature"
                  type="text"
                  value={keyFeatureDraft}
                  onChange={(event) => setKeyFeatureDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddKeyFeatureClick();
                    }
                  }}
                  placeholder="e.g. 30-hour battery life"
                  className="h-12 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                <button
                  type="button"
                  onClick={handleAddKeyFeatureClick}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium transition-opacity hover:opacity-90"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                  Add
                </button>
              </div>
            </div>

            {keyFeatures.length > 0 && (
              <ul className="flex flex-col gap-2">
                {keyFeatures.map((feature, featureIndex) => (
                  <li
                    key={`${feature}-${featureIndex}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <p className="min-w-0 truncate text-sm text-foreground">{feature}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyFeatureClick(featureIndex)}
                      aria-label={`Remove feature: ${feature}`}
                      className="cursor-pointer transition-opacity hover:opacity-70"
                    >
                      <Image
                        src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={20}
                        height={20}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </StepCard>
        );

      case "pricing":
        return (
          <StepCard
            title="Pricing & Inventory"
            subtitle="Set your price and let buyers know how many are available."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="product-price" className="text-sm font-medium text-foreground">
                  Price
                </label>
                <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
                  <span className="mr-2 text-sm text-muted-foreground">$</span>
                  <input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceInDollars}
                    onChange={(event) => setPriceInDollars(event.target.value)}
                    placeholder="0.00"
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="compare-at-price" className="text-sm font-medium text-foreground">
                  Compare-at price
                </label>
                <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
                  <span className="mr-2 text-sm text-muted-foreground">$</span>
                  <input
                    id="compare-at-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={compareAtPriceInDollars}
                    onChange={(event) => setCompareAtPriceInDollars(event.target.value)}
                    placeholder="0.00"
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Shown crossed out next to your price to highlight a deal.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="stock-quantity" className="text-sm font-medium text-foreground">
                  Quantity
                </label>
                <input
                  id="stock-quantity"
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  placeholder="0"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="sku-code" className="text-sm font-medium text-foreground">
                  SKU
                </label>
                <input
                  id="sku-code"
                  type="text"
                  value={skuCode}
                  onChange={(event) => setSkuCode(event.target.value)}
                  placeholder="e.g. QT-AUDIO-001"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                <p className="text-xs text-muted-foreground">
                  Your internal identifier for tracking this product.
                </p>
              </div>
            </div>

            {/* B2B volume pricing tiers (optional). */}
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Bulk pricing tiers</h3>
                  <p className="text-xs text-muted-foreground">
                    Offer a lower unit price for larger B2B orders. Optional.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTierClick}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Add tier
                </button>
              </div>

              {pricingTiers.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {pricingTiers.map((tier, tierIndex) => (
                    <li
                      key={tier.id}
                      className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Unit price
                        </span>
                        <div className="flex h-11 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
                          <span className="mr-2 text-sm text-muted-foreground">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.unitPriceInDollars}
                            onChange={(event) =>
                              handleTierChange(tierIndex, "unitPriceInDollars", event.target.value)
                            }
                            placeholder="0.00"
                            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Min. quantity
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={tier.minimumOrderQuantity}
                          onChange={(event) =>
                            handleTierChange(tierIndex, "minimumOrderQuantity", event.target.value)
                          }
                          placeholder="e.g. 10"
                          className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTierClick(tierIndex)}
                        aria-label="Remove tier"
                        className="flex h-11 cursor-pointer items-center transition-opacity hover:opacity-70"
                      >
                        <Image
                          src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                          alt=""
                          width={20}
                          height={20}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/*
              SAMPLES (A17). Beside the price rather than in a step of their own, because a sample
              price is a price — and because `samplePrice` is one of the listing-completeness
              requirements this step already owns, which until now no control on this form could
              satisfy.

              THREE FIELDS, NOT ONE. The policy says whether a sample can be had and whether its
              price comes back against a later bulk order; the price says what it costs; the cap
              says how many one order may hold. The cap is the load-bearing one: a sample skips the
              tier ladder AND the minimum order quantity, so without a ceiling a large "sample"
              line is a bulk order at sample pricing — and on a refundable listing it mints a
              credit worth the whole line, spendable against the next order.
            */}
            <fieldset className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-medium text-foreground">Samples</legend>
              <p className="text-xs leading-4 text-muted-foreground">
                Buyers often order one unit to check quality before committing to a bulk order.
                Refundable means the sample price comes back as credit against their first bulk
                order with you.
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="sample-policy" className="text-sm font-medium text-foreground">
                  Sample policy
                </label>
                <select
                  id="sample-policy"
                  value={samplePolicy}
                  onChange={(event) => {
                    // Parsed, not asserted, the same way the category admin narrows its state
                    // select. The three options are all this control renders, but proving it here
                    // is what keeps a future fourth `<option>` from shipping a 422 instead of a
                    // compile error.
                    const parsedPolicy = ProductSamplePolicySchema.safeParse(event.target.value);
                    if (!parsedPolicy.success) return;
                    setSamplePolicy(parsedPolicy.data);
                  }}
                  className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
                >
                  {PRODUCT_SAMPLE_POLICIES.map((policy) => (
                    <option key={policy} value={policy}>
                      {SAMPLE_POLICY_LABELS[policy]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden rather than disabled when no sample is offered: `unavailable` with a price
                  beside it is a shape the backend refuses, so the form must not present it as a
                  combination the seller could fill in. */}
              {samplePolicy !== "unavailable" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sample-price" className="text-sm font-medium text-foreground">
                      Sample price
                    </label>
                    <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
                      <span className="mr-2 text-sm text-muted-foreground">$</span>
                      <input
                        id="sample-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={samplePriceInDollars}
                        onChange={(event) => setSamplePriceInDollars(event.target.value)}
                        placeholder="0.00"
                        className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per unit, and usually above your bulk price — one piece costs you more to make
                      and ship than five hundred.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="maximum-sample-quantity"
                      className="text-sm font-medium text-foreground"
                    >
                      Samples per order
                    </label>
                    <input
                      id="maximum-sample-quantity"
                      type="number"
                      min="1"
                      max="20"
                      value={maximumSampleQuantity}
                      onChange={(event) => setMaximumSampleQuantity(event.target.value)}
                      placeholder="1"
                      className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                    />
                    <p className="text-xs text-muted-foreground">
                      The most a buyer can take at the sample price in one order. 1 to 20 — leave it
                      at 1 unless you ship a sample pack.
                    </p>
                  </div>
                </div>
              )}
            </fieldset>

            {/*
              THE FIVE SHIPPING FACTS. Required to publish, not to draft — so they sit beside the
              price rather than behind a gate, and a seller can save and come back with a tape
              measure.

              WHY ALL FIVE AND NOT JUST THE BOX. Freight bills on chargeable weight, which is
              `max(actual, volumetric)`, and volumetric is L x W x H multiplied by the PACKAGE COUNT.
              Without `unitsPerPackage` the rater skips the line; without a gross weight it
              contributes no weight at all. Three fields would look like enough and would price
              nothing.
            */}
            <fieldset className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-medium text-foreground">
                Packaging & shipping
              </legend>
              <p className="text-xs leading-4 text-muted-foreground">
                Required before this listing can be published — freight is rated on the size and
                weight of the shipped package, not the product. Enter the dimensions of one package
                and how many units it holds.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <PackagingInput
                  fieldKey="packageLengthMm"
                  value={packageLengthMm}
                  onValueChange={setPackageLengthMm}
                />
                <PackagingInput
                  fieldKey="packageWidthMm"
                  value={packageWidthMm}
                  onValueChange={setPackageWidthMm}
                />
                <PackagingInput
                  fieldKey="packageHeightMm"
                  value={packageHeightMm}
                  onValueChange={setPackageHeightMm}
                />
              </div>
              <p className="text-xs leading-4 text-muted-foreground">
                Length, width and height go in together or not at all — a half-measured box has no
                volume anyone can rate.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PackagingInput
                  fieldKey="packageGrossWeightGrams"
                  value={packageGrossWeightGrams}
                  onValueChange={setPackageGrossWeightGrams}
                />
                <PackagingInput
                  fieldKey="unitsPerPackage"
                  value={unitsPerPackage}
                  onValueChange={setUnitsPerPackage}
                />
              </div>
            </fieldset>
          </StepCard>
        );

      case "review":
        return (
          <StepCard
            title="Review & Publish"
            subtitle="Check everything looks right before your listing goes live."
          >
            <ReviewSection
              title="Product Identity"
              onEditClick={() => setCurrentStepIndex(0)}
              rows={[
                { label: "Title", value: productTitle },
                { label: "Brand", value: brandName },
                { label: "Category", value: categoryChoice?.displayLabel ?? "" },
                { label: "Condition", value: selectedCondition },
              ]}
            />
            <ReviewSection
              title="Images & Media"
              onEditClick={() => setCurrentStepIndex(1)}
              rows={[
                {
                  label: "Images",
                  value:
                    imageCount > 0 ? `${imageCount} image${imageCount === 1 ? "" : "s"} added` : "",
                },
              ]}
            />
            <ReviewSection
              title="Description"
              onEditClick={() => setCurrentStepIndex(2)}
              rows={[
                { label: "Description", value: productDescription },
                {
                  label: "Key features",
                  value: keyFeatures.length > 0 ? keyFeatures.join(" · ") : "",
                },
              ]}
            />
            <ReviewSection
              title="Pricing & Inventory"
              onEditClick={() => setCurrentStepIndex(3)}
              rows={[
                { label: "Price", value: priceInDollars ? `$${priceInDollars}` : "" },
                {
                  label: "Compare-at price",
                  value: compareAtPriceInDollars ? `$${compareAtPriceInDollars}` : "",
                },
                { label: "Quantity", value: stockQuantity },
                { label: "SKU", value: skuCode },
                {
                  label: "Bulk tiers",
                  value:
                    pricingTiers.length > 0
                      ? `${pricingTiers.length} tier${pricingTiers.length === 1 ? "" : "s"}`
                      : "",
                },
                {
                  label: "Samples",
                  // One row rather than three: the price and the cap only mean anything once a
                  // policy offers a sample at all, so an `unavailable` listing reads as the single
                  // fact it is instead of two blanks the seller would take for missing input.
                  value:
                    samplePolicy === "unavailable"
                      ? SAMPLE_POLICY_LABELS.unavailable
                      : `${SAMPLE_POLICY_LABELS[samplePolicy]}${
                          samplePriceInDollars ? ` · $${samplePriceInDollars} each` : ""
                        } · max ${maximumSampleQuantity || "1"} per order`,
                },
              ]}
            />
            <ReviewSection
              title="Packaging & Shipping"
              onEditClick={() => setCurrentStepIndex(3)}
              rows={[
                {
                  label: "Package size",
                  // Blank when incomplete, NEVER a partial "300 × — × 120". `ReviewSection` renders
                  // an empty value as the missing thing it is.
                  value:
                    packageLengthMm && packageWidthMm && packageHeightMm
                      ? `${packageLengthMm} × ${packageWidthMm} × ${packageHeightMm} mm`
                      : "",
                },
                {
                  label: "Gross weight",
                  value: packageGrossWeightGrams ? `${packageGrossWeightGrams} g` : "",
                },
                { label: "Units per package", value: unitsPerPackage },
              ]}
            />
            {productQuery.data !== undefined && (
              <ListingCompletenessChecklist
                completeness={productQuery.data.listingCompleteness}
                onEditClick={setCurrentStepIndex}
              />
            )}
          </StepCard>
        );

      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="p-6">
      <Link
        href="/studio/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Image
          src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={18}
          height={18}
        />
        Back to products
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        {isEditMode ? "Edit Store Listing" : "Create Store Listing"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        List your product on the Qatoto Store to reach buyers, partners, and B2B customers.
      </p>

      {/* Step tabs */}
      <ol className="mt-8 flex items-center">
        {LISTING_STEPS.map((step, stepIndex) => {
          const isCompletedStep = stepIndex < currentStepIndex;
          const isCurrentStep = stepIndex === currentStepIndex;
          return (
            <li key={step.id} className={`flex items-center ${stepIndex > 0 ? "flex-1" : ""}`}>
              {stepIndex > 0 && (
                <span
                  className={`mx-2 h-0.5 flex-1 rounded-full ${
                    isCompletedStep || isCurrentStep ? "bg-[#1DBDC5]" : "bg-border"
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => handleGoToStepClick(stepIndex)}
                disabled={stepIndex >= currentStepIndex}
                className={`flex shrink-0 items-center gap-2 ${
                  isCompletedStep ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
                    isCurrentStep
                      ? "bg-primary text-primary-foreground ring-2 ring-[#1DBDC5]"
                      : isCompletedStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompletedStep ? (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={16}
                      height={16}
                    />
                  ) : (
                    stepIndex + 1
                  )}
                </span>
                <span
                  className={`hidden text-sm md:block ${
                    isCurrentStep ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">{renderCurrentStep(currentStep.id)}</div>

      {isLastStep && localError !== null && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {localError}
        </p>
      )}
      {isLastStep && localError === null && publishRefusal !== null && (
        <PublishRefusalNotice refusal={publishRefusal} />
      )}
      {isSaving && (
        <p className="mt-4 text-sm text-muted-foreground">{describeProgress(saveProgress)}</p>
      )}

      {/* Footer navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackClick}
          className={`cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 ${
            currentStepIndex === 0 ? "invisible" : ""
          }`}
        >
          Back
        </button>

        {isLastStep ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEditMode ? "Save Changes" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving || publishBlockReason !== null}
              title={publishBlockReason ?? undefined}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Image
                src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              {isSaving ? "Publishing…" : "Publish Listing"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleNextClick}
            className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Next: {LISTING_STEPS[currentStepIndex + 1].label}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A refused publish, rendered as what it is.
 *
 * THREE VARIANTS BECAUSE THEY NEED THREE DIFFERENT THINGS FROM THE SELLER: `incomplete` names empty
 * fields to go and fill, `invalid` carries per-field schema complaints whose generic headline says
 * nothing on its own, and `failed` is a sentence to read. Collapsing them into one paragraph is what
 * this file did before, and it is why publishing looked broken rather than incomplete.
 */
function PublishRefusalNotice({ refusal }: { refusal: ProductPublishRefusal }) {
  const containerClassName =
    "mt-4 space-y-1 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500";

  switch (refusal.kind) {
    case "incomplete":
      return (
        <p role="alert" className={containerClassName}>
          {refusal.message}
        </p>
      );
    case "invalid":
      return (
        <div role="alert" className={containerClassName}>
          <p>{refusal.message}</p>
          <ul className="space-y-0.5 text-xs">
            {refusal.fieldMessages.map((fieldMessage) => (
              <li key={fieldMessage.field}>
                {/* `form` is the reserved key an object-level `.strict()` refusal arrives under —
                    it is not a field, so it is not labelled as one. */}
                {fieldMessage.field !== "form" && (
                  <span className="font-medium">{fieldMessage.field}: </span>
                )}
                {fieldMessage.messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      );
    case "failed":
      return (
        <p role="alert" className={containerClassName}>
          {refusal.message}
        </p>
      );
    default: {
      const exhaustiveCheck: never = refusal;
      return exhaustiveCheck;
    }
  }
}

/**
 * The server's own publish checklist, shown on the review step.
 *
 * READ, NEVER RECOMPUTED. `projectListingCompleteness` produces this and the 422 behind the button
 * from one call, so what is ticked here is exactly what the backend will accept. A locally derived
 * checklist is how a form ends up disagreeing with its own submit.
 *
 * Edit mode only — a listing being created has no row to project from yet.
 */
function ListingCompletenessChecklist({
  completeness,
  onEditClick,
}: {
  completeness: ListingCompleteness;
  onEditClick: (stepIndex: number) => void;
}) {
  /** Which wizard step fixes each requirement. */
  const stepIndexByRequirementKey: Record<string, number> = {
    title: 0,
    images: 1,
    price: 3,
    samplePrice: 3,
    shippingFacts: 3,
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Ready to publish</h3>
        <span className="text-xs text-muted-foreground">
          {completeness.satisfiedRequirementCount} of {completeness.applicableRequirementCount} done
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {completeness.requirements.map((requirement) => {
          // `not_applicable` is NOT a synonym for satisfied and is not shown as a tick: sample price
          // does not apply unless samples are sold, and ticking it claims the seller answered a
          // question that was never put to them.
          if (requirement.state === "not_applicable") return null;
          const isSatisfied = requirement.state === "satisfied";
          return (
            <li key={requirement.key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isSatisfied ? "bg-primary text-background" : "border border-red-500/60"
                }`}
              >
                {isSatisfied ? "✓" : ""}
              </span>
              <span className={isSatisfied ? "text-muted-foreground" : "text-foreground"}>
                {LISTING_REQUIREMENT_LABELS[requirement.key]}
              </span>
              {!isSatisfied && (
                <button
                  type="button"
                  onClick={() => onEditClick(stepIndexByRequirementKey[requirement.key] ?? 0)}
                  className="cursor-pointer text-xs text-[#1DBDC5] underline-offset-2 hover:underline"
                >
                  Add
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One typed packaging control: its label, its unit, and the bound the backend enforces. */
const PACKAGING_FIELDS = [
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

type PackagingFieldKey = (typeof PACKAGING_FIELDS)[number]["key"];

type PackagingFacts = Partial<Record<PackagingFieldKey, number>>;

/**
 * Parse the five shipping facts, or refuse.
 *
 * BLANK IS OMITTED, NOT ZERO. All five are optional on the wire so drafting stays free, and the
 * difference between "not measured" and "measured as zero" is the whole point of §19.6's refusal to
 * default anything.
 *
 * THE THREE DIMENSIONS ARE ALL-OR-NOTHING, mirroring the backend's `packageDimensionsComplete`
 * refinement. Mirrored rather than left to the 422 because the seller is looking at the three boxes
 * as they type: catching it here points at the empty one, while the round trip returns a refusal
 * whose path is `packageLengthMm` even when width is the one they skipped.
 */
function collectPackagingFacts(
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

/**
 * One packaging number, with its unit in the label rather than baked into the value.
 *
 * `type="number"` with `step="1"` because every one of these is an integer on the wire — millimetres
 * and grams, not centimetres and kilograms. Offering a decimal control for a field the backend
 * parses with `z.number().int()` invites a 422 for a perfectly reasonable "1.5".
 */
function PackagingInput({
  fieldKey,
  value,
  onValueChange,
}: {
  fieldKey: PackagingFieldKey;
  value: string;
  onValueChange: (nextValue: string) => void;
}) {
  const field =
    PACKAGING_FIELDS.find((candidate) => candidate.key === fieldKey) ?? PACKAGING_FIELDS[0];
  const inputId = `listing-${field.key}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {field.label}
        {field.unit !== "" && <span className="text-muted-foreground"> ({field.unit})</span>}
      </label>
      <input
        id={inputId}
        type="number"
        min="1"
        step="1"
        max={field.max}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={field.key === "unitsPerPackage" ? "e.g. 24" : "0"}
        className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
      />
    </div>
  );
}

/** One-line progress label for the multi-step save. */
function describeProgress(progress: SaveProgress): string {
  switch (progress.phase) {
    case "creating":
      return "Saving listing…";
    case "uploading":
      return `Uploading image ${progress.current}/${progress.total}…`;
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

// Shared card wrapper for each wizard step.
function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border p-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

// Read-only summary block on the review step; empty values show a muted
// "Not provided" placeholder.
function ReviewSection({
  title,
  onEditClick,
  rows,
}: {
  title: string;
  onEditClick: () => void;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEditClick}
          className="cursor-pointer text-sm text-[#1DBDC5] hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[10rem_1fr] gap-2">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 text-sm wrap-break-word text-foreground">
              {row.value.trim() ? (
                row.value
              ) : (
                <span className="text-muted-foreground italic">Not provided</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
