"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  useCreateListingMutation,
  useProductQuery,
  useUpdateListingMutation,
  type SaveProgress,
} from "@/lib/products/hooks";
import {
  CATEGORY_LABEL_TO_SLUG,
  CATEGORY_LABELS,
  centsToDollarString,
  CONDITION_LABEL_TO_SLUG,
  CONDITION_LABELS,
  dollarsToCents,
  SLUG_TO_CATEGORY_LABEL,
  SLUG_TO_CONDITION_LABEL,
  type CreateProductInput,
} from "@/lib/products/schemas";

const LISTING_STEPS = [
  { id: "identity", label: "Product Identity" },
  { id: "images", label: "Images & Media" },
  { id: "description", label: "Description" },
  { id: "pricing", label: "Pricing & Inventory" },
  { id: "review", label: "Review & Publish" },
] as const;

type ListingStepId = (typeof LISTING_STEPS)[number]["id"];

const PRODUCT_CATEGORIES = CATEGORY_LABELS;
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string>(PRODUCT_CONDITIONS[0]);

  // Step 2 — images
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const currentStep = LISTING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === LISTING_STEPS.length - 1;

  const imageCount = existingImages.length + selectedImageFiles.length;
  const mutationErrorMessage = readMutationError(createMutation.error ?? updateMutation.error);
  const errorMessage = localError ?? mutationErrorMessage;

  // Prefill the form once from the loaded product (edit mode).
  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (!isEditMode || hasPrefilledRef.current || !productQuery.data) return;
    hasPrefilledRef.current = true;
    const product = productQuery.data;
    setProductTitle(product.title);
    setBrandName(product.brand ?? "");
    setSelectedCategory(SLUG_TO_CATEGORY_LABEL[product.category] ?? "");
    setSelectedCondition(SLUG_TO_CONDITION_LABEL[product.condition] ?? PRODUCT_CONDITIONS[0]);
    setProductDescription(product.description ?? "");
    setKeyFeatures(product.keyFeatures);
    setPriceInDollars(centsToDollarString(product.priceInCents));
    setCompareAtPriceInDollars(
      product.compareAtPriceInCents === null
        ? ""
        : centsToDollarString(product.compareAtPriceInCents),
    );
    setStockQuantity(String(product.stockQuantity));
    setSkuCode(product.sku ?? "");
    setExistingImages(
      product.images
        .toSorted((first, second) => first.position - second.position)
        .map((image) => ({ id: image.id, url: image.url })),
    );
    setPricingTiers(
      product.pricingTiers
        .toSorted((first, second) => first.position - second.position)
        .map((tier) => ({
          id: crypto.randomUUID(),
          unitPriceInDollars: centsToDollarString(tier.unitPriceInCents),
          minimumOrderQuantity: String(tier.minimumOrderQuantity),
        })),
    );
  }, [isEditMode, productQuery.data]);

  // Object-URL previews for newly selected files; revoked when the set changes.
  useEffect(() => {
    const urls = selectedImageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedImageFiles]);

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
    const remainingSlots = MAX_PRODUCT_IMAGES - existingImages.length;
    setSelectedImageFiles((previousFiles) =>
      [...previousFiles, ...imageFiles].slice(0, Math.max(0, remainingSlots)),
    );
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
    setSelectedImageFiles((previousFiles) =>
      previousFiles.filter((_, imageIndex) => imageIndex !== imageIndexToRemove),
    );
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

    const categorySlug = CATEGORY_LABEL_TO_SLUG[selectedCategory];
    if (!categorySlug) return { error: "Select a category." };

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

    return {
      title,
      brand: brandName.trim() || undefined,
      category: categorySlug,
      condition: CONDITION_LABEL_TO_SLUG[selectedCondition] ?? "new",
      description: productDescription.trim() || undefined,
      keyFeatures,
      priceInCents,
      compareAtPriceInCents: compareAtPriceInCents ?? undefined,
      stockQuantity: resolvedStock,
      sku: skuCode.trim() || undefined,
      pricingTiers: tiers,
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="product-category" className="text-sm font-medium text-foreground">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="product-category"
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <Image
                    src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                  />
                </div>
              </div>
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
                {selectedImageFiles.map((imageFile, imageIndex) => (
                  <div
                    key={`${imageFile.name}-${imageFile.size}-${imageIndex}`}
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
                      aria-label={`Remove ${imageFile.name}`}
                      className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background transition-opacity hover:opacity-80"
                    >
                      <Image
                        src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={14}
                        height={14}
                      />
                    </button>
                    {imagePreviewUrls[imageIndex] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreviewUrls[imageIndex]}
                        alt={imageFile.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Image
                        src="/icons/image_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={28}
                        height={28}
                      />
                    )}
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
                { label: "Category", value: selectedCategory },
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
              ]}
            />
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

      {errorMessage && isLastStep && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {errorMessage}
        </p>
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
              disabled={isSaving}
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

/** Read a human message off a mutation error (backend envelope when present). */
function readMutationError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiRequestError) return error.apiError.message;
  return "Something went wrong. Please try again.";
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
