// TRANSPORT: props-only — renders one pathway tile it is handed, no network.
//
// The rail card for a guided set. `/store/pathways/<slug>`, PLURAL — this used to link at
// `/store/pathway/<slug>`, which has been redirect-only since the plural route shipped, so every
// tap took a visible meta-refresh pause before landing on the same page.
//
// `slotCount` is deliberately absent: `GET /store/home` selects seven pathway columns and does not
// compute the eighth, so this card says how the set was BUILT rather than how big it is. The
// `/store/pathways` index card, which reads a projection that does carry the count, shows it.

import Image from "next/image";
import Link from "next/link";

import { accentSurfaceClass } from "@/lib/store/labels";
import type { StoreHomePathwayCard } from "@/lib/store/merchandising.schemas";

export default function PathwayCard({ pathway }: { pathway: StoreHomePathwayCard }) {
  return (
    <Link
      href={`/store/pathways/${pathway.slug}`}
      className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-[#CAC4D0]/60 transition-colors hover:border-[#2A76FD] sm:w-52"
    >
      <div
        className={`relative aspect-video w-full overflow-hidden ${accentSurfaceClass(pathway.accent)}`}
      >
        {pathway.cardImageUrl !== null && (
          <Image
            src={pathway.cardImageUrl}
            fill
            sizes="(min-width: 640px) 208px, 176px"
            alt={pathway.title}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        {/* One model, two shapes. An anchored set's slots were RESOLVED from the relation graph
            against one product rather than typed by a merchandiser, and saying so tells the buyer
            why these pieces are here. */}
        {pathway.isAnchored && (
          <span className="w-fit rounded bg-[#F2F4F4] px-1.5 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]">
            Built around one product
          </span>
        )}

        <p className="text-sm leading-5 font-medium text-[#191C1C]">{pathway.title}</p>

        {pathway.summary !== null && (
          <p className="line-clamp-2 text-xs leading-4 text-[#6F7979]">{pathway.summary}</p>
        )}
      </div>
    </Link>
  );
}
