// TRANSPORT: props-only — renders the seller's declared slots. Uploads are not wired yet; see below.
//
// The buyer fills in the customization slots THIS SELLER declared. Two kinds, and the kind decides
// the control: `file_upload` takes artwork, `choice` takes one of the seller's own listed values.
//
// THE SLOTS ARE THE SELLER'S, NOT A FIXED FOUR. The mock hardcoded logo / graphics / packaging /
// cards plus four packaging materials, for every product on the platform. `slotKey`, `label`,
// `customizationKind`, `acceptedMediaTypes`, `choiceValues`, `minimumOrderQuantity` and
// `isRequired` are all authored by the seller at `PUT /products/:id/customization-options` and now
// reach the buyer on the product read (backend A23).
//
// WHAT IS STILL NOT WIRED, AND WHY IT IS SAFE TO SHIP LIKE THIS. Picking a file below does NOT
// upload it. The route exists — `POST /commerce/customization-assets` — but it answers **202** with
// the asset in `pending_scan`, and an asset CANNOT be attached to a cart line until a scanner
// promotes it. So a correct implementation is upload → poll → attach, and rendering "saved" off the
// 202 would tell a buyer their artwork is on the order when it may yet be quarantined. Until that
// loop is built the control collects the buyer's choices for the order they are about to place and
// says so, rather than claiming an attachment it did not make.
//
// THE PER-SLOT MINIMUM IS DISPLAYED, NEVER ENFORCED HERE ALONE. It is a commercial term, and the
// server checks it at cart and again at checkout preparation.
"use client";

import { useRef, useState } from "react";

import Image from "next/image";

import ModalSheet from "@/components/home/shared/modal-sheet";
import type { ProductCustomizationOption } from "@/lib/store/products.schemas";

/** Small pill stating how many units unlock a customization. */
function MinimumOrderBadge({ minimumOrderQuantity }: { minimumOrderQuantity: number }) {
  return (
    <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-[11px] font-medium text-[#191C1C]">
      Min. {minimumOrderQuantity} units
    </span>
  );
}

function RequiredBadge() {
  return (
    <span className="rounded bg-[#FFE3E1] px-1.5 py-0.5 text-[11px] font-medium text-[#8C1D18]">
      Required
    </span>
  );
}

function SlotHeading({ option }: { readonly option: ProductCustomizationOption }) {
  return (
    <div className="mb-1 flex flex-wrap items-center gap-2">
      <p className="text-xs font-medium text-[#191C1C]">{option.label}</p>
      {option.isRequired && <RequiredBadge />}
      {option.minimumOrderQuantity > 0 && (
        <MinimumOrderBadge minimumOrderQuantity={option.minimumOrderQuantity} />
      )}
    </div>
  );
}

function UploadField({
  option,
  fileName,
  onPick,
}: {
  readonly option: ProductCustomizationOption;
  readonly fileName: string | null;
  readonly onPick: (fileName: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // The seller's own allowlist. Empty means "no declared restriction" — the SERVER still verifies
  // decoded bytes at upload, so this attribute is a file-picker convenience and never a check.
  const acceptAttribute =
    option.acceptedMediaTypes.length === 0 ? undefined : option.acceptedMediaTypes.join(",");

  return (
    <div>
      <SlotHeading option={option} />
      <div
        className={`flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-3 ${
          fileName === null ? "border-[#6F7979]" : "border-[#00696E] bg-[#00696E]/5"
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <Image
            src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={22}
            height={22}
            alt=""
          />
          <span className="flex-1">
            <span className="block truncate text-xs font-medium text-[#191C1C]">
              {fileName ?? `Upload ${option.label.toLowerCase()}`}
            </span>
            {acceptAttribute !== undefined && (
              <span className="block text-[11px] text-[#6F7979]">
                Accepted: {option.acceptedMediaTypes.join(", ")}
              </span>
            )}
          </span>
        </button>
        {fileName !== null && (
          <button
            type="button"
            aria-label={`Remove ${option.label.toLowerCase()}`}
            onClick={() => {
              onPick(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={18}
              height={18}
              alt=""
            />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        aria-label={`Upload ${option.label.toLowerCase()}`}
        {...(acceptAttribute === undefined ? {} : { accept: acceptAttribute })}
        className="hidden"
        onChange={(changeEvent) => onPick(changeEvent.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

function ChoiceField({
  option,
  selectedValue,
  onSelect,
}: {
  readonly option: ProductCustomizationOption;
  readonly selectedValue: string | null;
  readonly onSelect: (value: string) => void;
}) {
  return (
    <div>
      <SlotHeading option={option} />
      <div className="flex flex-wrap gap-2">
        {option.choiceValues.map((choiceValue) => {
          const isSelected = choiceValue === selectedValue;
          return (
            <button
              key={choiceValue}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(choiceValue)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                isSelected
                  ? "border-[#00696E] bg-[#00696E]/10 font-medium text-[#00696E]"
                  : "border-[#CAC4D0] text-[#191C1C]"
              }`}
            >
              {choiceValue}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomizationSheet({
  options,
  onClose,
}: {
  readonly options: readonly ProductCustomizationOption[];
  readonly onClose: () => void;
}) {
  // Keyed by `slotKey`, which is the seller's own stable identifier for the slot and what a cart
  // line's customization payload is keyed on.
  const [valuesBySlotKey, setValuesBySlotKey] = useState<Record<string, string | null>>({});

  const setSlotValue = (slotKey: string, value: string | null) =>
    setValuesBySlotKey((previous) => ({ ...previous, [slotKey]: value }));

  const unfilledRequiredCount = options.filter(
    (option) => option.isRequired && (valuesBySlotKey[option.slotKey] ?? null) === null,
  ).length;

  return (
    <ModalSheet
      title="Customization options"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <p className="flex-1 text-xs text-[#6F7979]">
            {unfilledRequiredCount > 0
              ? `${unfilledRequiredCount} required ${unfilledRequiredCount === 1 ? "option" : "options"} still to fill in`
              : "Applies to this order only"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#00696E] px-6 py-2 text-sm font-medium text-white"
          >
            Done
          </button>
        </div>
      }
    >
      <p className="px-4 pb-2 text-xs text-[#6F7979]">
        What this seller lets you customize. Applied to every unit in the order.
      </p>

      {/* Said plainly rather than implied by a "Save" button that saves nothing. See the header. */}
      <p className="mx-4 mb-3 rounded-lg bg-[#F2F4F4] px-3 py-2 text-[11px] leading-4 text-[#6F7979]">
        Artwork files are checked for malware before they can be attached to an order, so uploads
        are not sent from here yet. Your choices are recorded for this order.
      </p>

      <div className="flex flex-col gap-4 px-4 pb-6">
        {options.map((option) =>
          option.customizationKind === "file_upload" ? (
            <UploadField
              key={option.id}
              option={option}
              fileName={valuesBySlotKey[option.slotKey] ?? null}
              onPick={(fileName) => setSlotValue(option.slotKey, fileName)}
            />
          ) : (
            <ChoiceField
              key={option.id}
              option={option}
              selectedValue={valuesBySlotKey[option.slotKey] ?? null}
              onSelect={(value) => setSlotValue(option.slotKey, value)}
            />
          ),
        )}
      </div>
    </ModalSheet>
  );
}
