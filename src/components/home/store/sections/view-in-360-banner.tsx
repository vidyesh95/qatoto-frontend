// TRANSPORT: mock

import Image from "next/image";

/**
 * The "View in 360º" promo under the PDP gallery.
 *
 * MOCK and non-interactive, as it was at the mock stage. `product_image` carries a flat `url` and
 * `position` — there is no 360-capture asset kind anywhere in the schema, so there is nothing to
 * open. It stays a banner rather than becoming a button that opens an empty viewer.
 */
export default function ViewIn360Banner() {
  return (
    <div className="px-4 py-2 lg:px-6">
      <div className="flex items-center gap-3 rounded p-2 outline -outline-offset-1 outline-[#2A76FD]">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-medium text-[#191C1C]">View in 360º</p>
          <p className="text-[11px] font-medium tracking-[0.5px] text-[#6F7979]">
            Check how this looks from all angles
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-[#D6E3FF]">
          <Image
            src="/icons/360_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
        </span>
      </div>
    </div>
  );
}
