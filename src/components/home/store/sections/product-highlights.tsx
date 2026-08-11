// TRANSPORT: props-only — renders the highlights it is handed, no network.
//
// Product highlights — collapsible cards. Each uses native <details>/<summary> so expand/collapse
// needs no client JS: the whole card is the summary (always visible) and group-open toggles the
// body clamp plus the read more / read less label.
//
// `imageUrl` IS NULLABLE and a highlight without one still renders. The mock gave every card an
// image and clamped the layout around it; a seller who wrote the copy but uploaded nothing would
// otherwise get an empty grey box where the argument should be.

import Image from "next/image";

import type { ProductHighlight } from "@/lib/store/products.schemas";

export default function ProductHighlights({
  highlights,
}: {
  readonly highlights: readonly ProductHighlight[];
}) {
  if (highlights.length === 0) return null;

  const orderedHighlights = highlights.toSorted((left, right) => left.position - right.position);

  return (
    <details open className="group/section border-t border-[#CAC4D0]/60 px-4 py-2 lg:px-6">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2 [&::-webkit-details-marker]:hidden">
        <h2 className="flex-1 text-sm tracking-[0.25px] text-[#191C1C]">Product highlights</h2>
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
          className="transition-transform group-open/section:rotate-180"
        />
      </summary>
      <div className="space-y-2 py-2">
        {orderedHighlights.map((highlight, highlightIndex) => (
          <details key={highlight.id} className="group">
            <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-medium tracking-[0.15px] text-[#191C1C]">
                {highlight.title}
              </h3>
              {highlight.imageUrl !== null && (
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                  <Image
                    src={highlight.imageUrl}
                    fill
                    priority={highlightIndex === 0}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    alt={highlight.title}
                    className="object-cover"
                  />
                </div>
              )}
              <p className="line-clamp-3 text-sm leading-5 tracking-[0.25px] text-[#191C1C] group-open:line-clamp-none">
                {highlight.bodyText}
              </p>
              <span className="text-right text-xs font-medium tracking-[0.5px] text-[#2A76FD]">
                <span className="group-open:hidden">read more</span>
                <span className="hidden group-open:inline">read less</span>
              </span>
            </summary>
          </details>
        ))}
      </div>
    </details>
  );
}
