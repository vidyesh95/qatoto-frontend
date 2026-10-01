"use client";

import Image from "next/image";
import type { CategoryAttribute } from "@/lib/store/catalog.schemas";
import {
  PRODUCT_SPECIFICATION_GROUP_MAX_LENGTH,
  PRODUCT_SPECIFICATION_KEY_MAX_LENGTH,
  PRODUCT_SPECIFICATION_MAX_COUNT,
  PRODUCT_SPECIFICATION_VALUE_MAX_LENGTH,
  type SpecificationDraft,
} from "../listing-editor-types";
import { StepCard } from "../listing-editor-subcomponents";

function CategoryAttributeControl({
  attribute,
  value,
  onChange,
}: {
  readonly attribute: CategoryAttribute;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const controlId = `attribute-${attribute.attributeKey}`;

  switch (attribute.valueKind) {
    case "enum":
      return (
        <select
          id={controlId}
          aria-label={attribute.label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint"
        >
          <option value="">Not stated</option>
          {attribute.choices.map((choice) => (
            <option key={choice.choiceValue} value={choice.choiceValue}>
              {choice.label}
            </option>
          ))}
        </select>
      );
    case "number":
      return (
        <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-primary-imprint">
          <input
            id={controlId}
            aria-label={attribute.label}
            type="number"
            step={attribute.numericScale === null ? 1 : 10 ** -attribute.numericScale}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Not stated"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {attribute.unitLabel !== null && (
            <span className="ml-2 text-sm text-muted-foreground">{attribute.unitLabel}</span>
          )}
        </div>
      );
    case "text":
      return (
        <input
          id={controlId}
          aria-label={attribute.label}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Not stated"
          className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
        />
      );
    default: {
      const exhaustiveKind: never = attribute.valueKind;
      return exhaustiveKind;
    }
  }
}

function CategoryAttributesSection({
  selectedCategorySlug,
  isEditMode,
  isAttributesLoading,
  categoryAttributes,
  categoryDisplayLabel,
  attributeAnswers,
  onAttributeAnswerChange,
}: {
  readonly selectedCategorySlug: string | null;
  readonly isEditMode: boolean;
  readonly isAttributesLoading: boolean;
  readonly categoryAttributes: readonly CategoryAttribute[];
  readonly categoryDisplayLabel: string | null;
  readonly attributeAnswers: Record<string, string>;
  readonly onAttributeAnswerChange: (key: string, value: string) => void;
}) {
  if (selectedCategorySlug === null) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {isEditMode
          ? "Pick your category again on the first step to load the fields it asks for. Anything you have already typed below is kept."
          : "Choose a category on the first step and the fields it asks for will appear here."}
      </p>
    );
  }
  if (isAttributesLoading) {
    return <p className="text-sm text-muted-foreground">Loading this category&apos;s fields…</p>;
  }
  if (categoryAttributes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        This category does not define any standard fields yet, so use the free-text rows below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          {categoryDisplayLabel ? `${categoryDisplayLabel} fields` : "Category fields"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Every listing in this category answers these, so buyers can filter and compare on them.
          Blank means you have not stated it.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {categoryAttributes.map((attribute) => (
          <li key={attribute.attributeKey} className="flex flex-col gap-1.5">
            <label
              htmlFor={`attribute-${attribute.attributeKey}`}
              className="text-sm font-medium text-foreground"
            >
              {attribute.label}
              {attribute.isRequiredForPublish && <span className="text-destructive"> *</span>}
            </label>
            <CategoryAttributeControl
              attribute={attribute}
              value={attributeAnswers[attribute.attributeKey] ?? ""}
              onChange={(nextVal) => onAttributeAnswerChange(attribute.attributeKey, nextVal)}
            />
            {attribute.groupLabel !== null && (
              <p className="text-xs text-muted-foreground">
                Shows under &ldquo;{attribute.groupLabel}&rdquo; on your listing.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpecificationsStep({
  selectedCategorySlug,
  isEditMode,
  isAttributesLoading,
  categoryAttributes,
  categoryDisplayLabel,
  attributeAnswers,
  onAttributeAnswerChange,
  specifications,
  specificationFieldIdPrefix,
  specificationGroupSuggestions,
  onAddSpecification,
  onSpecificationChange,
  onRemoveSpecification,
}: {
  readonly selectedCategorySlug: string | null;
  readonly isEditMode: boolean;
  readonly isAttributesLoading: boolean;
  readonly categoryAttributes: readonly CategoryAttribute[];
  readonly categoryDisplayLabel: string | null;
  readonly attributeAnswers: Record<string, string>;
  readonly onAttributeAnswerChange: (key: string, value: string) => void;
  readonly specifications: readonly SpecificationDraft[];
  readonly specificationFieldIdPrefix: string;
  readonly specificationGroupSuggestions: readonly string[];
  readonly onAddSpecification: () => void;
  readonly onSpecificationChange: (
    index: number,
    field: keyof SpecificationDraft,
    value: string,
  ) => void;
  readonly onRemoveSpecification: (index: number) => void;
}) {
  return (
    <StepCard
      title="Specifications"
      subtitle="The facts a buyer compares before they choose. Voltage, material, dimensions — whatever your category turns on."
    >
      <CategoryAttributesSection
        selectedCategorySlug={selectedCategorySlug}
        isEditMode={isEditMode}
        isAttributesLoading={isAttributesLoading}
        categoryAttributes={categoryAttributes}
        categoryDisplayLabel={categoryDisplayLabel}
        attributeAnswers={attributeAnswers}
        onAttributeAnswerChange={onAttributeAnswerChange}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Specification sheet</h3>
            <p className="text-xs text-muted-foreground">
              Optional, and worth filling in: this is what the buyer&apos;s comparison table puts
              side by side.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddSpecification}
            disabled={specifications.length >= PRODUCT_SPECIFICATION_MAX_COUNT}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image
              src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={18}
              height={18}
            />
            Add specification
          </button>
        </div>

        {specifications.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No specifications yet. A listing with none still publishes — it just cannot be compared
            against anything on the fields a buyer cares about.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {specifications.map((specification, specificationIndex) => (
              <li
                key={specification.id}
                className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${specificationFieldIdPrefix}-${specification.id}-name`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Name
                  </label>
                  <input
                    id={`${specificationFieldIdPrefix}-${specification.id}-name`}
                    type="text"
                    value={specification.key}
                    maxLength={PRODUCT_SPECIFICATION_KEY_MAX_LENGTH}
                    onChange={(event) =>
                      onSpecificationChange(specificationIndex, "key", event.target.value)
                    }
                    placeholder="e.g. Material"
                    className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${specificationFieldIdPrefix}-${specification.id}-value`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Value
                  </label>
                  <input
                    id={`${specificationFieldIdPrefix}-${specification.id}-value`}
                    type="text"
                    value={specification.value}
                    maxLength={PRODUCT_SPECIFICATION_VALUE_MAX_LENGTH}
                    onChange={(event) =>
                      onSpecificationChange(specificationIndex, "value", event.target.value)
                    }
                    placeholder="e.g. Solid oak"
                    className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`${specificationFieldIdPrefix}-${specification.id}-group`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Group (optional)
                  </label>
                  <input
                    id={`${specificationFieldIdPrefix}-${specification.id}-group`}
                    type="text"
                    value={specification.group}
                    maxLength={PRODUCT_SPECIFICATION_GROUP_MAX_LENGTH}
                    list="specification-group-suggestions"
                    onChange={(event) =>
                      onSpecificationChange(specificationIndex, "group", event.target.value)
                    }
                    placeholder="e.g. Materials"
                    className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSpecification(specificationIndex)}
                  aria-label={
                    specification.key.trim().length > 0
                      ? `Remove ${specification.key.trim()}`
                      : "Remove specification"
                  }
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

        <datalist id="specification-group-suggestions">
          {specificationGroupSuggestions.map((groupName) => (
            <option key={groupName} value={groupName}>
              {groupName}
            </option>
          ))}
        </datalist>

        <p className="text-xs text-muted-foreground">
          {specifications.length}/{PRODUCT_SPECIFICATION_MAX_COUNT} specifications added
        </p>
      </div>
    </StepCard>
  );
}
