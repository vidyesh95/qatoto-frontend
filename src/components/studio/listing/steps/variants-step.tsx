"use client";

// The listing's variants, in one of two shapes (A26).
//
// FLAT: a list of named rows — "Sea blue", "480 V / 60 Hz" — exactly as before axes existed. Any
// listing without options stays here, and nothing about it changed.
//
// GRID: the seller names up to three options and their values, and the step generates one row per
// combination. A row's name is generated from its values ("Red / M") and is what an order line will
// record, so it is shown, not typed. A combination the seller does not sell is switched OFF rather
// than removed: the row stays so it can come back, and the save leaves it out, which retires it on
// the backend if it was saved.
import Image from "next/image";
import { useId } from "react";
import ToggleSwitch from "@/components/ui/toggle-switch";
import {
  PRODUCT_VARIANT_AXIS_MAX_COUNT,
  PRODUCT_VARIANT_AXIS_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_AXIS_VALUE_MAX_LENGTH,
} from "@/lib/products/schemas";
import { countVariantCombinations } from "@/lib/products/variant-grid";
import {
  PRODUCT_VARIANT_MAX_COUNT,
  PRODUCT_VARIANT_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_SKU_MAX_LENGTH,
  PRODUCT_VARIANT_SLUG_MAX_LENGTH,
  type VariantAxisDraft,
  type VariantDraft,
} from "../listing-editor-types";
import { PricingTierRows, StepCard, StepSectionHeader } from "../listing-editor-subcomponents";
import { StringListRows } from "./string-list-rows";

type VariantField = "priceInDollars" | "stockQuantity" | "minimumOrderQuantity" | "sku";
type VariantTierField = "unitPriceInDollars" | "minimumOrderQuantity" | "leadTimeDays";

export interface VariantsStepProps {
  readonly variants: readonly VariantDraft[];
  readonly retiredVariantCount: number;
  readonly variantAxes: readonly VariantAxisDraft[];
  readonly variantGridLimitMessage: string | null;
  readonly onAddVariantAxis: () => void;
  readonly onRemoveVariantAxis: (axisIndex: number) => void;
  readonly onVariantAxisNameChange: (axisIndex: number, name: string) => void;
  readonly onVariantAxisValuesChange: (axisIndex: number, values: string[]) => void;
  readonly onVariantOfferedChange: (variantIndex: number, isOffered: boolean) => void;
  readonly onAddVariant: () => void;
  readonly onRemoveVariant: (index: number) => void;
  readonly onVariantNameChange: (index: number, name: string) => void;
  readonly onVariantSlugChange: (index: number, slug: string) => void;
  readonly onVariantFieldChange: (index: number, field: VariantField, value: string) => void;
  readonly onAddVariantTier: (variantIndex: number) => void;
  readonly onRemoveVariantTier: (variantIndex: number, tierIndex: number) => void;
  readonly onVariantTierChange: (
    variantIndex: number,
    tierIndex: number,
    field: VariantTierField,
    value: string,
  ) => void;
}

const TEXT_INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground";

export function VariantsStep(props: VariantsStepProps) {
  const { variants, retiredVariantCount, variantAxes } = props;
  const isGridMode = variantAxes.length > 0;
  const savedFlatVariantCount = isGridMode
    ? 0
    : variants.filter((variant) => variant.savedId !== null).length;

  return (
    <StepCard
      title="Variants"
      subtitle="Sizes, colours, voltages — the versions of this listing a buyer picks between."
    >
      <div className="flex flex-col gap-3">
        <StepSectionHeader
          title="Options"
          description="Optional. Name up to three — Size, Colour, Material — and each combination of their values becomes a variant with its own price and stock."
          buttonLabel="Add an option"
          onButtonClick={props.onAddVariantAxis}
          isButtonDisabled={variantAxes.length >= PRODUCT_VARIANT_AXIS_MAX_COUNT}
        />

        {!isGridMode && savedFlatVariantCount > 0 && (
          <p className="text-xs leading-4 text-muted-foreground">
            Adding an option replaces the {savedFlatVariantCount} saved variant
            {savedFlatVariantCount === 1 ? "" : "s"} below with combinations. When you save, the old
            ones are retired: they stop selling, and past orders keep naming them.
          </p>
        )}

        {isGridMode && (
          <VariantAxisEditor
            variantAxes={variantAxes}
            onRemoveVariantAxis={props.onRemoveVariantAxis}
            onVariantAxisNameChange={props.onVariantAxisNameChange}
            onVariantAxisValuesChange={props.onVariantAxisValuesChange}
          />
        )}

        {props.variantGridLimitMessage !== null && (
          <p role="alert" className="text-xs leading-4 text-destructive">
            {props.variantGridLimitMessage}
          </p>
        )}

        {isGridMode ? <VariantGridRows {...props} /> : <FlatVariantRows {...props} />}

        {retiredVariantCount > 0 && (
          <p className="text-xs leading-4 text-muted-foreground">
            {retiredVariantCount} retired variant{retiredVariantCount === 1 ? " is" : "s are"} kept
            out of sight so past orders still name what was bought. Removing a variant, or switching
            a combination off, retires it the same way — it stops selling, it is not deleted.
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

function VariantRulesList({ isGridMode }: { readonly isGridMode: boolean }) {
  return (
    <ul className="flex flex-col gap-1 rounded-xl bg-secondary/40 p-3 text-xs leading-4 text-muted-foreground">
      {isGridMode && (
        <li>
          A buyer picks one value per option; each combination you offer is its own variant with its
          own price and stock.
        </li>
      )}
      <li>Price and stock come from the variant, not from the Pricing step.</li>
      <li>Your listing shows a &ldquo;from&rdquo; price across the variants below.</li>
      <li>A buyer must choose one before they can add this listing to a cart.</li>
      <li>
        A variant with no volume pricing of its own uses the bulk tiers you set on the Pricing step;
        giving it tiers replaces them for that variant.
      </li>
    </ul>
  );
}

function VariantAxisEditor({
  variantAxes,
  onRemoveVariantAxis,
  onVariantAxisNameChange,
  onVariantAxisValuesChange,
}: Pick<
  VariantsStepProps,
  "variantAxes" | "onRemoveVariantAxis" | "onVariantAxisNameChange" | "onVariantAxisValuesChange"
>) {
  const combinationCount = countVariantCombinations(variantAxes);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {variantAxes.map((axis, axisIndex) => {
          const axisLabel =
            axis.name.trim().length > 0 ? axis.name.trim() : `option ${String(axisIndex + 1)}`;
          return (
            <li key={axis.localId} className="flex flex-col gap-3 p-3">
              <div className="flex items-end gap-3">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Option {axisIndex + 1}
                  </span>
                  <input
                    type="text"
                    value={axis.name}
                    maxLength={PRODUCT_VARIANT_AXIS_NAME_MAX_LENGTH}
                    placeholder={axisIndex === 0 ? "Size" : axisIndex === 1 ? "Colour" : "Material"}
                    onChange={(event) => onVariantAxisNameChange(axisIndex, event.target.value)}
                    className={TEXT_INPUT_CLASS}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveVariantAxis(axisIndex)}
                  aria-label={`Remove ${axisLabel}`}
                  className="mb-2 flex cursor-pointer items-center transition-opacity hover:opacity-70"
                >
                  <Image
                    src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                </button>
              </div>
              <StringListRows
                legend={`Values for ${axisLabel}`}
                placeholder={axisIndex === 0 ? "S, then Enter" : "Add a value, then Enter"}
                values={axis.values}
                maxCount={PRODUCT_VARIANT_MAX_COUNT}
                maxLength={PRODUCT_VARIANT_AXIS_VALUE_MAX_LENGTH}
                onChange={(values) => onVariantAxisValuesChange(axisIndex, values)}
              />
            </li>
          );
        })}
      </ul>
      <p className="text-xs leading-4 text-muted-foreground">
        {combinationCount} combination{combinationCount === 1 ? "" : "s"} of at most{" "}
        {PRODUCT_VARIANT_MAX_COUNT}. Removing a value removes its combinations; any that were saved
        are retired when you save.
      </p>
    </div>
  );
}

function VariantGridRows(props: VariantsStepProps) {
  const { variants } = props;
  const offeredVariantCount = variants.filter((variant) => variant.isOffered).length;
  if (variants.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Give each option at least one value and its combinations appear here.
      </p>
    );
  }
  return (
    <>
      <VariantRulesList isGridMode />
      <p className="text-xs font-medium text-muted-foreground">
        {offeredVariantCount} of {variants.length} combination{variants.length === 1 ? "" : "s"}{" "}
        offered
      </p>
      <ul className="flex flex-col gap-3">
        {variants.map((variant, variantIndex) => (
          <VariantGridRow
            key={variant.localId}
            variant={variant}
            variantIndex={variantIndex}
            {...props}
          />
        ))}
      </ul>
    </>
  );
}

function VariantGridRow({
  variant,
  variantIndex,
  onVariantOfferedChange,
  ...props
}: VariantsStepProps & { readonly variant: VariantDraft; readonly variantIndex: number }) {
  const offeredToggleId = useId();
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{variant.name}</span>
          <span className="text-xs text-muted-foreground">
            {variant.isOffered ? "Offered" : "Not offered"}
            {variant.savedId !== null && " · saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={offeredToggleId} className="text-xs font-medium text-muted-foreground">
            Offer this combination
          </label>
          <ToggleSwitch
            id={offeredToggleId}
            accessibleName={`Offer ${variant.name}`}
            isChecked={variant.isOffered}
            onCheckedChange={(isChecked) => onVariantOfferedChange(variantIndex, isChecked)}
          />
        </div>
      </div>
      {variant.isOffered && (
        <>
          <VariantSlugField variant={variant} variantIndex={variantIndex} {...props} />
          <VariantCommercialFields variant={variant} variantIndex={variantIndex} {...props} />
        </>
      )}
    </li>
  );
}

function FlatVariantRows(props: VariantsStepProps) {
  const { variants, onAddVariant, onRemoveVariant, onVariantNameChange } = props;
  return (
    <>
      <StepSectionHeader
        title="Variations"
        description="Or list versions by name, with no options. Leave both empty and the listing sells as one thing at the price on the previous step."
        buttonLabel="Add variant"
        onButtonClick={onAddVariant}
        isButtonDisabled={variants.length >= PRODUCT_VARIANT_MAX_COUNT}
      />

      {variants.length > 0 && <VariantRulesList isGridMode={false} />}

      {variants.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No variants. Add one only if buyers genuinely choose between versions — a listing sold one
          way is simpler for everyone.
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
                  className={TEXT_INPUT_CLASS}
                />
              </label>

              <VariantSlugField variant={variant} variantIndex={variantIndex} {...props} />
              <VariantCommercialFields variant={variant} variantIndex={variantIndex} {...props} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function VariantSlugField({
  variant,
  variantIndex,
  onVariantSlugChange,
}: Pick<VariantsStepProps, "onVariantSlugChange"> & {
  readonly variant: VariantDraft;
  readonly variantIndex: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">URL slug</span>
      <input
        type="text"
        value={variant.publicSlug}
        maxLength={PRODUCT_VARIANT_SLUG_MAX_LENGTH}
        readOnly={variant.savedId !== null}
        placeholder="sea-blue"
        onChange={(event) => onVariantSlugChange(variantIndex, event.target.value)}
        className={`${TEXT_INPUT_CLASS} read-only:cursor-not-allowed read-only:opacity-60`}
      />
      <span className="text-xs leading-4 text-muted-foreground">
        {variant.savedId === null
          ? "Set once. It identifies this variant afterwards, so it cannot be changed later."
          : "Fixed — past orders name this variant by its slug."}
      </span>
    </label>
  );
}

function VariantCommercialFields({
  variant,
  variantIndex,
  onVariantFieldChange,
  onAddVariantTier,
  onRemoveVariantTier,
  onVariantTierChange,
}: Pick<
  VariantsStepProps,
  "onVariantFieldChange" | "onAddVariantTier" | "onRemoveVariantTier" | "onVariantTierChange"
> & { readonly variant: VariantDraft; readonly variantIndex: number }) {
  return (
    <>
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
            className={TEXT_INPUT_CLASS}
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
            className={TEXT_INPUT_CLASS}
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
              onVariantFieldChange(variantIndex, "minimumOrderQuantity", event.target.value)
            }
            className={TEXT_INPUT_CLASS}
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
          onChange={(event) => onVariantFieldChange(variantIndex, "sku", event.target.value)}
          className={TEXT_INPUT_CLASS}
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
    </>
  );
}
