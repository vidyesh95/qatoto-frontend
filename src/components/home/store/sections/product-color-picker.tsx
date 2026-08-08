// TRANSPORT: mock

import Image from "next/image";
import { MOCK_PRODUCT_COLORS } from "@/mocks/store-mocks";

/**
 * "Select Color" swatch strip on the PDP.
 *
 * MOCK, and it cannot be otherwise yet: there is no product-variant or option table anywhere in
 * the backend schema, so a real product has exactly one appearance on the wire. The first swatch
 * shows as selected and nothing is clickable — a working picker would have to change the price,
 * gallery and cart line, none of which a variant-less product can do.
 *
 * When variants ship, this takes them as a prop and the selection drives the gallery.
 */
export default function ProductColorPicker() {
  return (
    <div className="px-4 pt-2 lg:px-6">
      <p className="py-2 text-xs font-medium tracking-wide text-foreground">Select Color</p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {MOCK_PRODUCT_COLORS.map((color, colorIndex) => {
          const isSelected = colorIndex === 0;
          return (
            <div key={color.name} className="w-14 shrink-0">
              <div
                className={`relative aspect-square overflow-hidden rounded -outline-offset-1 ${
                  isSelected ? "outline outline-[#2A76FD]" : "outline outline-[#E0E3E3]"
                }`}
              >
                <Image
                  src={color.imageSrc}
                  fill
                  sizes="56px"
                  alt={color.name}
                  className="object-cover"
                />
              </div>
              <p
                className={`mt-1 text-center text-xs font-medium tracking-wide ${
                  isSelected ? "text-[#2A76FD]" : "text-foreground"
                }`}
              >
                {color.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
