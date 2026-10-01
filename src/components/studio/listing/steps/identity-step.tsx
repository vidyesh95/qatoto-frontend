"use client";

import {
  ListingCategoryPicker,
  type ListingCategoryChoice,
} from "@/components/studio/listing/listing-category-picker";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import {
  PRODUCT_CONDITIONS,
  PRODUCT_MODEL_NUMBER_MAX_LENGTH,
  PRODUCT_TITLE_MAX_LENGTH,
  PRODUCT_UNIT_OF_MEASURE_MAX_LENGTH,
  UNIT_OF_MEASURE_SUGGESTIONS,
} from "../listing-editor-types";
import { StepCard } from "../listing-editor-subcomponents";

export function IdentityStep({
  productTitle,
  onProductTitleChange,
  brandName,
  onBrandNameChange,
  categoryChoice,
  onCategoryChoiceChange,
  isSaving,
  modelNumber,
  onModelNumberChange,
  unitOfMeasure,
  onUnitOfMeasureChange,
  countryOfOriginCode,
  onCountryOfOriginCodeChange,
  selectedCondition,
  onSelectedConditionChange,
}: {
  readonly productTitle: string;
  readonly onProductTitleChange: (title: string) => void;
  readonly brandName: string;
  readonly onBrandNameChange: (brand: string) => void;
  readonly categoryChoice: ListingCategoryChoice | null;
  readonly onCategoryChoiceChange: (choice: ListingCategoryChoice | null) => void;
  readonly isSaving: boolean;
  readonly modelNumber: string;
  readonly onModelNumberChange: (model: string) => void;
  readonly unitOfMeasure: string;
  readonly onUnitOfMeasureChange: (unit: string) => void;
  readonly countryOfOriginCode: string;
  readonly onCountryOfOriginCodeChange: (countryCode: string) => void;
  readonly selectedCondition: string;
  readonly onSelectedConditionChange: (condition: string) => void;
}) {
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
          onChange={(event) => onProductTitleChange(event.target.value)}
          placeholder="e.g. Wireless Noise-Cancelling Headphones, Black"
          className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
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
            onChange={(event) => onBrandNameChange(event.target.value)}
            placeholder="e.g. Qatoto Originals"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
          />
        </div>

        <ListingCategoryPicker
          value={categoryChoice}
          isDisabled={isSaving}
          onChange={onCategoryChoiceChange}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="model-number" className="text-sm font-medium text-foreground">
            Model or part number
          </label>
          <input
            id="model-number"
            type="text"
            value={modelNumber}
            maxLength={PRODUCT_MODEL_NUMBER_MAX_LENGTH}
            onChange={(event) => onModelNumberChange(event.target.value)}
            placeholder="e.g. LM358, DC-4420, SS24-1180"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
          />
          <p className="text-xs text-muted-foreground">
            The manufacturer&apos;s own code — a part number, a model number, a style code. Buyers
            search by it, so it is worth the exact characters.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit-of-measure" className="text-sm font-medium text-foreground">
            Unit of measure
          </label>
          <input
            id="unit-of-measure"
            type="text"
            value={unitOfMeasure}
            maxLength={PRODUCT_UNIT_OF_MEASURE_MAX_LENGTH}
            list="unit-of-measure-suggestions"
            onChange={(event) => onUnitOfMeasureChange(event.target.value)}
            placeholder="e.g. piece"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
          />
          <datalist id="unit-of-measure-suggestions">
            {UNIT_OF_MEASURE_SUGGESTIONS.map((unitName) => (
              <option key={unitName} value={unitName}>
                {unitName}
              </option>
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            What one unit is, so a quantity means something. Leave it blank if a piece is obvious.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="country-of-origin" className="text-sm font-medium text-foreground">
          Country of origin
        </label>
        <select
          id="country-of-origin"
          value={countryOfOriginCode}
          onChange={(event) => onCountryOfOriginCodeChange(event.target.value)}
          className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint"
        >
          <option value="">Not stated</option>
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Where the product is made. Buyers filtering on origin, and customs paperwork, both read
          this.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Condition</span>
        <div className="flex gap-2">
          {PRODUCT_CONDITIONS.map((condition) => (
            <button
              key={condition}
              type="button"
              onClick={() => onSelectedConditionChange(condition)}
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
}
