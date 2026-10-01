"use client";

import Image from "next/image";
import {
  PRODUCT_SAMPLE_POLICIES,
  PRODUCT_SELLING_STATES,
  ProductSamplePolicySchema,
  ProductSellingStateSchema,
  SAMPLE_POLICY_LABELS,
  type ProductSamplePolicy,
  type ProductSellingState,
} from "@/lib/store/organizations.schemas";
import {
  SELLING_STATE_HELP_TEXT,
  SELLING_STATE_OPTION_LABELS,
  type PricingTierDraft,
} from "../listing-editor-types";
import {
  PackagingInput,
  PricingTierRows,
  SourcingQuoteLinePicker,
  StepCard,
} from "../listing-editor-subcomponents";

function ProductPriceAndStockFields({
  priceInDollars,
  onPriceInDollarsChange,
  compareAtPriceInDollars,
  onCompareAtPriceInDollarsChange,
  stockQuantity,
  onStockQuantityChange,
  skuCode,
  onSkuCodeChange,
}: {
  readonly priceInDollars: string;
  readonly onPriceInDollarsChange: (value: string) => void;
  readonly compareAtPriceInDollars: string;
  readonly onCompareAtPriceInDollarsChange: (value: string) => void;
  readonly stockQuantity: string;
  readonly onStockQuantityChange: (value: string) => void;
  readonly skuCode: string;
  readonly onSkuCodeChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-price" className="text-sm font-medium text-foreground">
          Price
        </label>
        <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-primary-imprint">
          <span className="mr-2 text-sm text-muted-foreground">$</span>
          <input
            id="product-price"
            type="number"
            min="0"
            step="0.01"
            value={priceInDollars}
            onChange={(event) => onPriceInDollarsChange(event.target.value)}
            placeholder="0.00"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="compare-at-price" className="text-sm font-medium text-foreground">
          Compare-at price
        </label>
        <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-primary-imprint">
          <span className="mr-2 text-sm text-muted-foreground">$</span>
          <input
            id="compare-at-price"
            type="number"
            min="0"
            step="0.01"
            value={compareAtPriceInDollars}
            onChange={(event) => onCompareAtPriceInDollarsChange(event.target.value)}
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
          onChange={(event) => onStockQuantityChange(event.target.value)}
          placeholder="0"
          className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
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
          onChange={(event) => onSkuCodeChange(event.target.value)}
          placeholder="e.g. QT-AUDIO-001"
          className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
        />
        <p className="text-xs text-muted-foreground">
          Your internal identifier for tracking this product.
        </p>
      </div>
    </div>
  );
}

function SamplesFieldset({
  samplePolicy,
  onSamplePolicyChange,
  samplePriceInDollars,
  onSamplePriceInDollarsChange,
  maximumSampleQuantity,
  onMaximumSampleQuantityChange,
}: {
  readonly samplePolicy: ProductSamplePolicy;
  readonly onSamplePolicyChange: (policy: ProductSamplePolicy) => void;
  readonly samplePriceInDollars: string;
  readonly onSamplePriceInDollarsChange: (value: string) => void;
  readonly maximumSampleQuantity: string;
  readonly onMaximumSampleQuantityChange: (value: string) => void;
}) {
  return (
    <fieldset className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-medium text-foreground">Samples</legend>
      <p className="text-xs leading-4 text-muted-foreground">
        Buyers often order one unit to check quality before committing to a bulk order. Refundable
        means the sample price comes back as credit against their first bulk order with you.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sample-policy" className="text-sm font-medium text-foreground">
          Sample policy
        </label>
        <select
          id="sample-policy"
          value={samplePolicy}
          onChange={(event) => {
            const parsedPolicy = ProductSamplePolicySchema.safeParse(event.target.value);
            if (!parsedPolicy.success) return;
            onSamplePolicyChange(parsedPolicy.data);
          }}
          className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint"
        >
          {PRODUCT_SAMPLE_POLICIES.map((policy) => (
            <option key={policy} value={policy}>
              {SAMPLE_POLICY_LABELS[policy]}
            </option>
          ))}
        </select>
      </div>

      {samplePolicy !== "unavailable" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sample-price" className="text-sm font-medium text-foreground">
              Sample price
            </label>
            <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-primary-imprint">
              <span className="mr-2 text-sm text-muted-foreground">$</span>
              <input
                id="sample-price"
                type="number"
                min="0"
                step="0.01"
                value={samplePriceInDollars}
                onChange={(event) => onSamplePriceInDollarsChange(event.target.value)}
                placeholder="0.00"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Per unit, and usually above your bulk price — one piece costs you more to make and
              ship than five hundred.
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
              onChange={(event) => onMaximumSampleQuantityChange(event.target.value)}
              placeholder="1"
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
            />
            <p className="text-xs text-muted-foreground">
              The most a buyer can take at the sample price in one order. 1 to 20 — leave it at 1
              unless you ship a sample pack.
            </p>
          </div>
        </div>
      )}
    </fieldset>
  );
}

function PackagingFieldset({
  packageLengthMm,
  onPackageLengthMmChange,
  packageWidthMm,
  onPackageWidthMmChange,
  packageHeightMm,
  onPackageHeightMmChange,
  packageGrossWeightGrams,
  onPackageGrossWeightGramsChange,
  unitsPerPackage,
  onUnitsPerPackageChange,
}: {
  readonly packageLengthMm: string;
  readonly onPackageLengthMmChange: (value: string) => void;
  readonly packageWidthMm: string;
  readonly onPackageWidthMmChange: (value: string) => void;
  readonly packageHeightMm: string;
  readonly onPackageHeightMmChange: (value: string) => void;
  readonly packageGrossWeightGrams: string;
  readonly onPackageGrossWeightGramsChange: (value: string) => void;
  readonly unitsPerPackage: string;
  readonly onUnitsPerPackageChange: (value: string) => void;
}) {
  return (
    <fieldset className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-medium text-foreground">Packaging & shipping</legend>
      <p className="text-xs leading-4 text-muted-foreground">
        Required before this listing can be published — freight is rated on the size and weight of
        the shipped package, not the product. Enter the dimensions of one package and how many units
        it holds.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PackagingInput
          fieldKey="packageLengthMm"
          value={packageLengthMm}
          onValueChange={onPackageLengthMmChange}
        />
        <PackagingInput
          fieldKey="packageWidthMm"
          value={packageWidthMm}
          onValueChange={onPackageWidthMmChange}
        />
        <PackagingInput
          fieldKey="packageHeightMm"
          value={packageHeightMm}
          onValueChange={onPackageHeightMmChange}
        />
      </div>
      <p className="text-xs leading-4 text-muted-foreground">
        Length, width and height go in together or not at all — a half-measured box has no volume
        anyone can rate.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PackagingInput
          fieldKey="packageGrossWeightGrams"
          value={packageGrossWeightGrams}
          onValueChange={onPackageGrossWeightGramsChange}
        />
        <PackagingInput
          fieldKey="unitsPerPackage"
          value={unitsPerPackage}
          onValueChange={onUnitsPerPackageChange}
        />
      </div>
    </fieldset>
  );
}

export interface PricingStepProps {
  readonly priceInDollars: string;
  readonly onPriceInDollarsChange: (value: string) => void;
  readonly compareAtPriceInDollars: string;
  readonly onCompareAtPriceInDollarsChange: (value: string) => void;
  readonly stockQuantity: string;
  readonly onStockQuantityChange: (value: string) => void;
  readonly skuCode: string;
  readonly onSkuCodeChange: (value: string) => void;
  readonly sourcingQuoteProductLineId: string | null;
  readonly onSourcingQuoteProductLineIdSelect: (id: string | null) => void;
  readonly sellingState: ProductSellingState;
  readonly onSellingStateChange: (state: ProductSellingState) => void;
  readonly pricingTiers: readonly PricingTierDraft[];
  readonly onAddTier: () => void;
  readonly onTierChange: (
    tierIndex: number,
    field: "unitPriceInDollars" | "minimumOrderQuantity" | "leadTimeDays",
    value: string,
  ) => void;
  readonly onRemoveTier: (tierIndex: number) => void;
  readonly samplePolicy: ProductSamplePolicy;
  readonly onSamplePolicyChange: (policy: ProductSamplePolicy) => void;
  readonly samplePriceInDollars: string;
  readonly onSamplePriceInDollarsChange: (value: string) => void;
  readonly maximumSampleQuantity: string;
  readonly onMaximumSampleQuantityChange: (value: string) => void;
  readonly packageLengthMm: string;
  readonly onPackageLengthMmChange: (value: string) => void;
  readonly packageWidthMm: string;
  readonly onPackageWidthMmChange: (value: string) => void;
  readonly packageHeightMm: string;
  readonly onPackageHeightMmChange: (value: string) => void;
  readonly packageGrossWeightGrams: string;
  readonly onPackageGrossWeightGramsChange: (value: string) => void;
  readonly unitsPerPackage: string;
  readonly onUnitsPerPackageChange: (value: string) => void;
}

export function PricingStep({
  priceInDollars,
  onPriceInDollarsChange,
  compareAtPriceInDollars,
  onCompareAtPriceInDollarsChange,
  stockQuantity,
  onStockQuantityChange,
  skuCode,
  onSkuCodeChange,
  sourcingQuoteProductLineId,
  onSourcingQuoteProductLineIdSelect,
  sellingState,
  onSellingStateChange,
  pricingTiers,
  onAddTier,
  onTierChange,
  onRemoveTier,
  samplePolicy,
  onSamplePolicyChange,
  samplePriceInDollars,
  onSamplePriceInDollarsChange,
  maximumSampleQuantity,
  onMaximumSampleQuantityChange,
  packageLengthMm,
  onPackageLengthMmChange,
  packageWidthMm,
  onPackageWidthMmChange,
  packageHeightMm,
  onPackageHeightMmChange,
  packageGrossWeightGrams,
  onPackageGrossWeightGramsChange,
  unitsPerPackage,
  onUnitsPerPackageChange,
}: PricingStepProps) {
  return (
    <StepCard
      title="Pricing & Inventory"
      subtitle="Set your price and let buyers know how many are available."
    >
      <ProductPriceAndStockFields
        priceInDollars={priceInDollars}
        onPriceInDollarsChange={onPriceInDollarsChange}
        compareAtPriceInDollars={compareAtPriceInDollars}
        onCompareAtPriceInDollarsChange={onCompareAtPriceInDollarsChange}
        stockQuantity={stockQuantity}
        onStockQuantityChange={onStockQuantityChange}
        skuCode={skuCode}
        onSkuCodeChange={onSkuCodeChange}
      />

      <SourcingQuoteLinePicker
        selectedId={sourcingQuoteProductLineId}
        onSelect={onSourcingQuoteProductLineIdSelect}
      />

      <div className="flex flex-col gap-1.5 border-t border-border pt-6">
        <label htmlFor="selling-state" className="text-sm font-medium text-foreground">
          Still selling this?
        </label>
        <select
          id="selling-state"
          value={sellingState}
          onChange={(event) => {
            const parsedState = ProductSellingStateSchema.safeParse(event.target.value);
            if (!parsedState.success) return;
            onSellingStateChange(parsedState.data);
          }}
          className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint"
        >
          {PRODUCT_SELLING_STATES.map((state) => (
            <option key={state} value={state}>
              {SELLING_STATE_OPTION_LABELS[state]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{SELLING_STATE_HELP_TEXT[sellingState]}</p>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Bulk pricing tiers</h3>
            <p className="text-xs text-muted-foreground">
              Offer a lower unit price for larger B2B orders. Optional. A band may carry its own
              lead time; leave it blank to use the listing&apos;s.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddTier}
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

        <PricingTierRows
          tiers={pricingTiers}
          onTierChange={onTierChange}
          onRemoveTier={onRemoveTier}
        />
      </div>

      <SamplesFieldset
        samplePolicy={samplePolicy}
        onSamplePolicyChange={onSamplePolicyChange}
        samplePriceInDollars={samplePriceInDollars}
        onSamplePriceInDollarsChange={onSamplePriceInDollarsChange}
        maximumSampleQuantity={maximumSampleQuantity}
        onMaximumSampleQuantityChange={onMaximumSampleQuantityChange}
      />

      <PackagingFieldset
        packageLengthMm={packageLengthMm}
        onPackageLengthMmChange={onPackageLengthMmChange}
        packageWidthMm={packageWidthMm}
        onPackageWidthMmChange={onPackageWidthMmChange}
        packageHeightMm={packageHeightMm}
        onPackageHeightMmChange={onPackageHeightMmChange}
        packageGrossWeightGrams={packageGrossWeightGrams}
        onPackageGrossWeightGramsChange={onPackageGrossWeightGramsChange}
        unitsPerPackage={unitsPerPackage}
        onUnitsPerPackageChange={onUnitsPerPackageChange}
      />
    </StepCard>
  );
}
