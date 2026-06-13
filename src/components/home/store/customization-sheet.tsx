"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

// Customization options bottom sheet for the product page (UI-only phase, no
// fetch). The seller allows a set of customizations; here the buyer uploads
// their branding/graphics/cards and picks a packaging material. Selected file
// names live in local state purely for UX feedback — nothing is sent. When the
// backend phase starts uploads go to the API and the seller owns what's allowed.

type UploadSlotId = "logo" | "graphics" | "packagingGraphics" | "cards";

type UploadSlot = {
  id: UploadSlotId;
  label: string;
  hint: string;
  accept: string;
  minimumOrderQuantity: number;
};

const UPLOAD_SLOTS: UploadSlot[] = [
  {
    id: "logo",
    label: "Brand logo",
    hint: "PNG or SVG, transparent background",
    accept: "image/png,image/svg+xml",
    minimumOrderQuantity: 50,
  },
  {
    id: "graphics",
    label: "Custom graphics",
    hint: "Artwork printed on the seat back",
    accept: "image/*",
    minimumOrderQuantity: 100,
  },
  {
    id: "packagingGraphics",
    label: "Packaging graphics",
    hint: "Print-ready box artwork",
    accept: "image/*,application/pdf",
    minimumOrderQuantity: 200,
  },
  {
    id: "cards",
    label: "Custom cards",
    hint: "Thank-you / warranty card design",
    accept: "image/*,application/pdf",
    minimumOrderQuantity: 50,
  },
];

type PackagingMaterial = {
  name: string;
  minimumOrderQuantity: number;
};

const PACKAGING_MATERIALS: PackagingMaterial[] = [
  { name: "Kraft cardboard", minimumOrderQuantity: 50 },
  { name: "Corrugated box", minimumOrderQuantity: 100 },
  { name: "Rigid gift box", minimumOrderQuantity: 300 },
  { name: "Poly mailer", minimumOrderQuantity: 50 },
];

// Small pill stating how many sets unlock a customization.
function MinimumOrderBadge({ minimumOrderQuantity }: { minimumOrderQuantity: number }) {
  return (
    <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-[11px] font-medium text-[#191C1C]">
      Min. {minimumOrderQuantity} sets
    </span>
  );
}

function UploadField({
  slot,
  fileName,
  onPick,
}: {
  slot: UploadSlot;
  fileName: string | null;
  onPick: (fileName: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <p className="text-xs font-medium text-[#191C1C]">{slot.label}</p>
        <MinimumOrderBadge minimumOrderQuantity={slot.minimumOrderQuantity} />
      </div>
      <div
        className={`flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-3 ${
          fileName ? "border-[#00696E] bg-[#00696E]/5" : "border-[#6F7979]"
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
              {fileName ?? `Upload ${slot.label.toLowerCase()}`}
            </span>
            <span className="block text-[11px] text-[#6F7979]">{slot.hint}</span>
          </span>
        </button>
        {fileName && (
          <button
            type="button"
            aria-label={`Remove ${slot.label.toLowerCase()}`}
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
        aria-label={`Upload ${slot.label.toLowerCase()}`}
        accept={slot.accept}
        className="hidden"
        onChange={(changeEvent) => onPick(changeEvent.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

// Bottom sheet on mobile, centered modal on desktop — mirrors DeliverySheet.
export default function CustomizationSheet({ onClose }: { onClose: () => void }) {
  const [uploadedFileNames, setUploadedFileNames] = useState<Record<UploadSlotId, string | null>>({
    logo: null,
    graphics: null,
    packagingGraphics: null,
    cards: null,
  });
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const setUpload = (slotId: UploadSlotId, fileName: string | null) =>
    setUploadedFileNames((previous) => ({ ...previous, [slotId]: fileName }));

  return (
    <>
      <button
        type="button"
        aria-label="Close customization options"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Customization options"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Customization options</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <p className="shrink-0 px-4 pb-2 text-xs text-[#6F7979]">
          Upload your branding and choose how it ships. Applied to every unit in the order.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(80px+env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-4">
            <UploadField
              slot={UPLOAD_SLOTS[0]}
              fileName={uploadedFileNames.logo}
              onPick={(fileName) => setUpload("logo", fileName)}
            />
            <UploadField
              slot={UPLOAD_SLOTS[1]}
              fileName={uploadedFileNames.graphics}
              onPick={(fileName) => setUpload("graphics", fileName)}
            />

            {/* Packaging material — single choice */}
            <div>
              <p className="mb-1 text-xs font-medium text-[#191C1C]">Packaging material</p>
              <div className="flex flex-wrap gap-2">
                {PACKAGING_MATERIALS.map((material) => {
                  const isSelected = selectedMaterial === material.name;
                  return (
                    <button
                      key={material.name}
                      type="button"
                      onClick={() => setSelectedMaterial(material.name)}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                        isSelected
                          ? "border-[#00696E] bg-[#00696E]/5 text-[#00696E]"
                          : "border-[#6F7979] text-[#191C1C]"
                      }`}
                    >
                      {material.name}
                      <span className="text-[11px] text-[#6F7979]">
                        · Min. {material.minimumOrderQuantity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <UploadField
              slot={UPLOAD_SLOTS[2]}
              fileName={uploadedFileNames.packagingGraphics}
              onPick={(fileName) => setUpload("packagingGraphics", fileName)}
            />
            <UploadField
              slot={UPLOAD_SLOTS[3]}
              fileName={uploadedFileNames.cards}
              onPick={(fileName) => setUpload("cards", fileName)}
            />
          </div>
        </div>

        {/* Sticky footer — confirm. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-[#CAC4D0]/60 bg-background px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <p className="flex-1 text-xs text-[#6F7979]">Changes apply to this order only</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#00696E] px-6 py-2 text-sm font-medium text-white"
          >
            Save customization
          </button>
        </div>
      </div>
    </>
  );
}
