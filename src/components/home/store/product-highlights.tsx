import Image from "next/image";

// Product highlights — collapsible cards. UI-only mock, static data baked in.
// Each card uses native <details>/<summary> so expand/collapse needs no client
// JS: the whole card is the summary (always visible) and group-open toggles the
// body clamp + the read more / read less label.

const HIGHLIGHTS = [
  {
    title: "Built to take a beating",
    body: "Cold-rolled steel tube and reinforced welds shrug off daily commercial use, banquet halls to cafés. The frame is tested to 150 kg and survives years of stacking, folding and rough handling without a creak.",
    image: "/dummy/product_highlights01.avif",
  },
  {
    title: "Stack twelve, store anywhere",
    body: "Flat-fold geometry stacks a dozen chairs into a single trolley footprint — clear a room in minutes. Nested chairs interlock so a full set rolls away on one cart and tucks into the slimmest storage closet.",
    image: "/dummy/product_highlights02.avif",
  },
  {
    title: "Contoured for long sittings",
    body: "A waterfall seat edge and lumbar-shaped back keep guests comfortable through long banquets and meetings. The breathable cushion resists flattening and springs back after hours of continuous use.",
    image: "/dummy/product_highlights03.avif",
  },
  {
    title: "Finishes that resist wear",
    body: "Powder-coated steel and stain-resistant upholstery wipe clean in seconds and shrug off scuffs. The finish holds its colour under sunlight and harsh cleaning, indoors or out on a covered patio.",
    image: "/dummy/product_highlights04.avif",
  },
  {
    title: "Floor-friendly footing",
    body: "Non-marking glides protect tile, hardwood and laminate while keeping the chair planted on uneven ground. The wide feet spread load evenly so there are no scratches, wobble or screech when guests shift.",
    image: "/dummy/product_highlights05.avif",
  },
];

export default function ProductHighlights() {
  return (
    <div className="border-t border-[#CAC4D0]/60 px-4 py-2 lg:px-6">
      <div className="flex items-center gap-2 py-2">
        <h2 className="flex-1 text-sm tracking-[0.25px] text-[#191C1C]">Product highlights</h2>
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
        />
      </div>
      <div className="space-y-2 py-2">
        {HIGHLIGHTS.map((highlight, highlightIndex) => (
          <details key={highlight.title} className="group">
            <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-medium tracking-[0.15px] text-[#191C1C]">
                {highlight.title}
              </h3>
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                <Image
                  src={highlight.image}
                  fill
                  priority={highlightIndex === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt={highlight.title}
                  className="object-cover"
                />
              </div>
              <p className="line-clamp-3 text-sm leading-5 tracking-[0.25px] text-[#191C1C] group-open:line-clamp-none">
                {highlight.body}
              </p>
              <span className="text-right text-xs font-medium tracking-[0.5px] text-[#2A76FD]">
                <span className="group-open:hidden">read more</span>
                <span className="hidden group-open:inline">read less</span>
              </span>
            </summary>
          </details>
        ))}
      </div>
    </div>
  );
}
