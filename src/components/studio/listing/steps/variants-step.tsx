"use client";

import Image from "next/image";
import {
  PRODUCT_VARIANT_MAX_COUNT,
  PRODUCT_VARIANT_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_SKU_MAX_LENGTH,
  PRODUCT_VARIANT_SLUG_MAX_LENGTH,
  type VariantDraft,
} from "../listing-editor-types";
import { PricingTierRows, StepCard, StepSectionHeader } from "../listing-editor-subcomponents";

export interface VariantsStepProps {
  readonly variants: readonly VariantDraft[];
  readonly retiredVariantCount: number;
  readonly onAddVariant: () => void;
  readonly onRemoveVariant: (index: number) => void;
  readonly onVariantNameChange: (index: number, name: string) => void;
  readonly onVariantSlugChange: (index: number, slug: string) => void;
  readonly onVariantFieldChange: (
    index: number,
    field: "priceInDollars" | "stockQuantity" | "minimumOrderQuantity" | "sku",
    value: string,
  ) => void;
  readonly onAddVariantTier: (variantIndex: number) => void;
  readonly onRemoveVariantTier: (variantIndex: number, tierIndex: number) => void;
  readonly onVariantTierChange: (
    variantIndex: number,
    tierIndex: number,
    field: "unitPriceInDollars" | "minimumOrderQuantity" | "leadTimeDays",
    value: string,
  ) => void;
}

export function VariantsStep({
  variants,
  retiredVariantCount,
  onAddVariant,
  onRemoveVariant,
  onVariantNameChange,
  onVariantSlugChange,
  onVariantFieldChange,
  onAddVariantTier,
  onRemoveVariantTier,
  onVariantTierChange,
}: VariantsStepProps) {
  return (
    <StepCard
      title="Variants"
      subtitle="Sizes, colours, voltages — the versions of this listing a buyer picks between."
    >
      <div className="flex flex-col gap-3">
        <StepSectionHeader
          title="Variations"
          description="Optional. Leave this empty and the listing sells as one thing at the price on the previous step."
          buttonLabel="Add variant"
          onButtonClick={onAddVariant}
          isButtonDisabled={variants.length >= PRODUCT_VARIANT_MAX_COUNT}
        />

        {variants.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xl bg-secondary/40 p-3 text-xs leading-4 text-muted-foreground">
            <li>Price and stock come from the variant, not from the Pricing step.</li>
            <li>Your listing shows a &ldquo;from&rdquo; price across the variants below.</li>
            <li>A buyer must choose one before they can add this listing to a cart.</li>
            <li>
              A variant with no volume pricing of its own uses the bulk tiers you set on the Pricing
              step; giving it tiers replaces them for that variant.
            </li>
          </ul>
        )}

        {variants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No variants. Add one only if buyers genuinely choose between versions — a listing sold
            one way is simpler for everyone.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {variants.map((variant, variantIndex) => (
              <li
                key={variant.localId}
                className="flex flex-col gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Variant {variantIndex + 1}
                    {variant.savedId !== null && " · saved"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveVariant(variantIndex)}
                    aria-label={
                      variant.name.trim().length > 0
                        ? `Remove ${variant.name.trim()}`
                        : `Remove variant ${String(variantIndex + 1)}`
                    }
                    className="flex cursor-pointer items-center transition-opacity hover:opacity-70"
                  >
                    <Image
                      src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={20}
                      height={20}
                    />
                  </button>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <input
                    type="text"
                    value={variant.name}
                    maxLength={PRODUCT_VARIANT_NAME_MAX_LENGTH}
                    placeholder="Sea blue"
                    onChange={(event) => onVariantNameChange(variantIndex, event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">URL slug</span>
                  <input
                    type="text"
                    value={variant.publicSlug}
                    maxLength={PRODUCT_VARIANT_SLUG_MAX_LENGTH}
                    readOnly={variant.savedId !== null}
                    placeholder="sea-blue"
                    onChange={(event) => onVariantSlugChange(variantIndex, event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none read-only:cursor-not-allowed read-only:opacity-60 focus:border-foreground"
                  />
                  <span className="text-xs leading-4 text-muted-foreground">
                    {variant.savedId === null
                      ? "Set once. It identifies this variant afterwards, so it cannot be changed later."
                      : "Fixed — past orders name this variant by its slug."}
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Price</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={variant.priceInDollars}
                      placeholder="0.00"
                      onChange={(event) =>
                        onVariantFieldChange(variantIndex, "priceInDollars", event.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Stock</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={variant.stockQuantity}
                      placeholder="0"
                      onChange={(event) =>
                        onVariantFieldChange(variantIndex, "stockQuantity", event.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Min. order</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={variant.minimumOrderQuantity}
                      placeholder="Optional"
                      onChange={(event) =>
                        onVariantFieldChange(
                          variantIndex,
                          "minimumOrderQuantity",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">SKU</span>
                  <input
                    type="text"
                    value={variant.sku}
                    maxLength={PRODUCT_VARIANT_SKU_MAX_LENGTH}
                    placeholder="Optional, unique within this listing"
                    onChange={(event) =>
                      onVariantFieldChange(variantIndex, "sku", event.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                  />
                </label>

                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-foreground">
                        Volume pricing for this variant
                      </span>
                      <p className="text-xs leading-4 text-muted-foreground">
                        Optional. With none, this variant uses the listing&apos;s bulk tiers.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddVariantTier(variantIndex)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/50"
                    >
                      <Image
                        src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={16}
                        height={16}
                      />
                      Add tier
                    </button>
                  </div>
                  <PricingTierRows
                    tiers={variant.pricingTiers}
                    onTierChange={(tierIndex, field, value) =>
                      onVariantTierChange(variantIndex, tierIndex, field, value)
                    }
                    onRemoveTier={(tierIndex) => onRemoveVariantTier(variantIndex, tierIndex)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {retiredVariantCount > 0 && (
          <p className="text-xs leading-4 text-muted-foreground">
            {retiredVariantCount} retired variant{retiredVariantCount === 1 ? " is" : "s are"} kept
            out of sight so past orders still name what was bought. Removing a variant above retires
            it the same way — it stops selling, it is not deleted.
          </p>
        )}

        <p className="text-xs leading-4 text-muted-foreground">
          A variant&apos;s own volume pricing replaces the listing&apos;s rather than adding to it.
          Give a variant no tiers and the Pricing step&apos;s bulk tiers apply to it.
        </p>
      </div>
    </StepCard>
  );
}
