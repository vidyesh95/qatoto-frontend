// TRANSPORT: mock — the four upload slots and four materials are local, and no file is sent.
//
// The buyer uploads branding and picks a packaging material. Selected file names live in local
// state purely for UX feedback.
//
// THIS ONE CANNOT BE FULLY WIRED YET, AND THE GAP IS ON THE BACKEND SIDE.
// `commerce_product_customization_option` exists, the seller authors it at
// `PUT /products/:id/customization-options`, the upload route exists at
// `POST /commerce/customization-assets`, and the per-slot minimum order quantity is enforced at
// cart AND again at checkout preparation. What is missing is the BUYER READ: the option list is
// projected only on the seller's own `GET /products/:id` and appears nowhere under `/store/*`.
//
// So the slots below cannot yet be replaced by real ones, and the consequence is worse than a
// mock — a product carrying a REQUIRED slot cannot be checked out by anybody, because the buyer
// is never told the slot exists and `checkout/prepare` refuses the order for a term they had no
// way to read. Filed as Appendix A23; it is the one live defect the store audit found.
//
// Two rules for when the read lands: an artwork upload lands `pending_scan` and CANNOT be
// attached until a scanner promotes it — upload completion is not a malware verdict — and the
// per-slot minimum is a commercial term, so it is displayed but never enforced here alone.
"use client";

import { useRef, useState } from "react";

import Image from "next/image";

import StoreSheet from "@/components/home/store/shared/store-sheet";

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

export default function CustomizationSheet({ onClose }: { onClose: () => void }) {
  const [uploadedFileNames, setUploadedFileNames] = useState<Record<UploadSlotId, string | null>>({
    logo: null,
    graphics: null,
    packagingGraphics: null,
    cards: null,
  });
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  const setUpload = (slotId: UploadSlotId, fileName: string | null) =>
    setUploadedFileNames((previous) => ({ ...previous, [slotId]: fileName }));

  return (
    <StoreSheet
      title="Customization options"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <p className="flex-1 text-xs text-[#6F7979]">Changes apply to this order only</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#00696E] px-6 py-2 text-sm font-medium text-white"
          >
            Save customization
          </button>
        </div>
      }
    >
      <p className="px-4 pb-2 text-xs text-[#6F7979]">
        Upload your branding and choose how it ships. Applied to every unit in the order.
      </p>

      <div className="px-4 pb-2">
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
    </StoreSheet>
  );
}
