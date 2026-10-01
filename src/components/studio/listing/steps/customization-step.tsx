"use client";

import { useState } from "react";
import {
  PRODUCT_CUSTOMIZATION_CHOICE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_MEDIA_TYPE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_SLOT_MAX_COUNT,
  type CustomizationSlotDraft,
} from "../listing-editor-types";
import { StepCard, StepSectionHeader } from "../listing-editor-subcomponents";
import { PRODUCT_CUSTOMIZATION_KINDS } from "@/lib/store/products.schemas";

function StringListRows({
  legend,
  placeholder,
  values,
  maxCount,
  onChange,
}: {
  readonly legend: string;
  readonly placeholder: string;
  readonly values: readonly string[];
  readonly maxCount: number;
  readonly onChange: (values: string[]) => void;
}) {
  const [pendingValue, setPendingValue] = useState("");

  function addPendingValue() {
    const trimmed = pendingValue.trim();
    if (trimmed.length === 0 || values.length >= maxCount || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setPendingValue("");
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{legend}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={pendingValue}
          maxLength={120}
          onChange={(changeEvent) => setPendingValue(changeEvent.target.value)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key !== "Enter") return;
            keyEvent.preventDefault();
            addPendingValue();
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={addPendingValue}
          disabled={pendingValue.trim().length === 0 || values.length >= maxCount}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {values.map((value, valueIndex) => (
            <li
              key={value}
              className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs text-foreground"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, index) => index !== valueIndex))}
                aria-label={`Remove ${value}`}
                className="cursor-pointer text-muted-foreground"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface CustomizationStepProps {
  readonly customizationSlots: readonly CustomizationSlotDraft[];
  readonly retiredCustomizationSlotCount: number;
  readonly onAddCustomizationSlot: () => void;
  readonly onRemoveCustomizationSlot: (index: number) => void;
  readonly onCustomizationLabelChange: (index: number, label: string) => void;
  readonly onUpdateCustomizationSlot: (
    index: number,
    patch: Partial<CustomizationSlotDraft>,
  ) => void;
}

export function CustomizationStep({
  customizationSlots,
  retiredCustomizationSlotCount,
  onAddCustomizationSlot,
  onRemoveCustomizationSlot,
  onCustomizationLabelChange,
  onUpdateCustomizationSlot,
}: CustomizationStepProps) {
  return (
    <StepCard
      title="Customization"
      subtitle="What a buyer can specify on this listing — artwork to upload, or a choice you offer."
    >
      <div className="flex flex-col gap-3">
        <StepSectionHeader
          title="Slots"
          description="Optional. Leave this empty and the listing sells exactly as described."
          buttonLabel="Add slot"
          onButtonClick={onAddCustomizationSlot}
          isButtonDisabled={customizationSlots.length >= PRODUCT_CUSTOMIZATION_SLOT_MAX_COUNT}
        />

        {customizationSlots.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xl bg-secondary/40 p-3 text-xs leading-4 text-muted-foreground">
            <li>Buyers see these on the listing and fill them in before ordering.</li>
            <li>
              A minimum order quantity on a slot is a commercial term — the server checks it at the
              cart and again at checkout.
            </li>
            <li>
              Every slot is optional to answer. Slots a buyer MUST answer are not offered yet.
            </li>
          </ul>
        )}

        {customizationSlots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No customization. Add a slot only if buyers genuinely supply something — a listing sold
            as-is is simpler for everyone.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {customizationSlots.map((slot, slotIndex) => (
              <li
                key={slot.localId}
                className="flex flex-col gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Slot {slotIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveCustomizationSlot(slotIndex)}
                    aria-label={`Remove slot ${String(slotIndex + 1)}`}
                    className="cursor-pointer text-xs font-medium text-destructive"
                  >
                    Remove
                  </button>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Label</span>
                  <input
                    type="text"
                    value={slot.label}
                    maxLength={120}
                    onChange={(changeEvent) =>
                      onCustomizationLabelChange(slotIndex, changeEvent.target.value)
                    }
                    placeholder="Packaging material"
                    className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Key</span>
                  <input
                    type="text"
                    value={slot.slotKey}
                    maxLength={60}
                    readOnly={slot.savedId !== null}
                    onChange={(changeEvent) =>
                      onUpdateCustomizationSlot(slotIndex, {
                        slotKey: changeEvent.target.value,
                        isSlotKeyEdited: true,
                      })
                    }
                    placeholder="packaging_material"
                    className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none read-only:text-muted-foreground focus:border-primary"
                  />
                  <span className="text-xs leading-4 text-muted-foreground">
                    {slot.savedId === null
                      ? "Lower-case words joined by underscores. Follows the label until you edit it."
                      : "Fixed once saved — buyers' past orders name this key."}
                  </span>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Kind</span>
                  <select
                    value={slot.customizationKind}
                    onChange={(changeEvent) => {
                      const nextKind = PRODUCT_CUSTOMIZATION_KINDS.find(
                        (kind) => kind === changeEvent.target.value,
                      );
                      if (nextKind === undefined) return;
                      onUpdateCustomizationSlot(slotIndex, { customizationKind: nextKind });
                    }}
                    className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="choice">A choice you offer</option>
                    <option value="file_upload">A file the buyer uploads</option>
                  </select>
                </label>

                {slot.customizationKind === "choice" ? (
                  <StringListRows
                    legend="Options a buyer picks from"
                    placeholder="kraft"
                    values={slot.choiceValues}
                    maxCount={PRODUCT_CUSTOMIZATION_CHOICE_MAX_COUNT}
                    onChange={(choiceValues) =>
                      onUpdateCustomizationSlot(slotIndex, { choiceValues })
                    }
                  />
                ) : (
                  <StringListRows
                    legend="Accepted file types"
                    placeholder="image/png"
                    values={slot.acceptedMediaTypes}
                    maxCount={PRODUCT_CUSTOMIZATION_MEDIA_TYPE_MAX_COUNT}
                    onChange={(acceptedMediaTypes) =>
                      onUpdateCustomizationSlot(slotIndex, { acceptedMediaTypes })
                    }
                  />
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Minimum order quantity
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={slot.minimumOrderQuantity}
                    onChange={(changeEvent) =>
                      onUpdateCustomizationSlot(slotIndex, {
                        minimumOrderQuantity: changeEvent.target.value,
                      })
                    }
                    placeholder="Any quantity"
                    className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <span className="text-xs leading-4 text-muted-foreground">
                    Leave blank if this applies at any quantity.
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {retiredCustomizationSlotCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {retiredCustomizationSlotCount} retired{" "}
            {retiredCustomizationSlotCount === 1 ? "slot is" : "slots are"} kept on this listing
            because past orders name them. They are not offered to buyers.
          </p>
        )}
      </div>
    </StepCard>
  );
}
