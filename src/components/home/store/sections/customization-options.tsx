// TRANSPORT: props-only — renders the seller's declared option slots, no network.
//
// "Customization options": the slots this seller allows, as a two-column grid; tapping anywhere
// opens the sheet where the buyer fills them in.
//
// THIS CLOSES A LIVE DEFECT (backend Appendix A23). Until `customizationOptions[]` reached the
// buyer read, `checkout/prepare` refused an order that omitted a REQUIRED slot with
// `REQUIRED_OPTION_MISSING` while the buyer was never told the slot existed — enforcement without
// disclosure, which is a trap rather than a term. A product carrying a required slot could not be
// checked out by anybody. Rendering these is what makes such a product buyable at all.
//
// A REQUIRED SLOT IS MARKED AS ONE, on the collapsed row rather than only inside the sheet: a
// buyer who never opens the sheet needs to know there is something they must supply.

import Image from "next/image";

import CustomizationOptionsOpener from "@/components/home/store/sections/customization-options-opener";
import type { ProductCustomizationOption } from "@/lib/store/products.schemas";

/** One icon per kind. The seller names the slot; the kind decides how it is filled in. */
const CUSTOMIZATION_KIND_ICONS: Record<string, string> = {
  file_upload: "upload_file_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  choice: "checklist_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
};

export default function CustomizationOptions({
  options,
}: {
  readonly options: readonly ProductCustomizationOption[];
}) {
  // A seller offering no customization gets no block. The mock rendered four slots for every
  // product, which advertised a service most sellers do not provide.
  if (options.length === 0) return null;

  const orderedOptions = options.toSorted((left, right) => left.position - right.position);
  const requiredCount = orderedOptions.filter((option) => option.isRequired).length;

  return (
    <CustomizationOptionsOpener options={orderedOptions}>
      <span className="flex w-full items-center px-4 py-2 lg:px-6">
        <span className="flex-1 text-sm leading-5 tracking-wide text-[#191C1C]">
          Customization options
          {requiredCount > 0 && (
            <span className="ml-2 rounded bg-[#FFE3E1] px-1.5 py-0.5 text-[11px] leading-4 font-medium text-[#8C1D18]">
              {requiredCount} required
            </span>
          )}
        </span>
        <Image
          src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
        />
      </span>

      <span className="grid w-full grid-cols-2 gap-y-2 px-4 lg:px-6">
        {orderedOptions.map((option) => (
          <span key={option.id} className="flex items-center gap-1">
            <Image
              src={`/icons/${CUSTOMIZATION_KIND_ICONS[option.customizationKind] ?? CUSTOMIZATION_KIND_ICONS.choice}`}
              width={16}
              height={16}
              alt=""
            />
            <span className="truncate text-xs leading-4 tracking-wide text-[#191C1C]">
              {option.label}
            </span>
          </span>
        ))}
      </span>
    </CustomizationOptionsOpener>
  );
}
