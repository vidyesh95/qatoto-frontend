// TRANSPORT: mock — the banner image is local; title, summary and accent are real.

import Image from "next/image";
import Link from "next/link";
import type { StorePathway } from "@/lib/store/catalog.schemas";
import { hoverTintForIndex } from "@/lib/store/tiles";
import { mockPathwayBannerForSlug } from "@/mocks/store-mocks";

/**
 * Portrait card for the "Pathways for you" rail.
 *
 * Title, summary and accent come from the server. The image does NOT — a pathway carries no image
 * on the wire, so `mockPathwayBannerForSlug` picks a stable local banner from the slug. Swap that
 * one call for a real field the day the backend carries one.
 */
export default function PathwayCard({
  pathway,
  accentIndex,
}: {
  pathway: StorePathway;
  accentIndex: number;
}) {
  return (
    <Link
      href={`/store/pathway/${pathway.slug}`}
      className="group relative flex w-44 shrink-0 flex-col sm:w-52"
    >
      <div
        className={`pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors ${hoverTintForIndex(accentIndex)}`}
      />
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={mockPathwayBannerForSlug(pathway.slug)}
          fill
          sizes="(min-width: 640px) 208px, 176px"
          alt={pathway.title}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="truncate text-sm font-semibold">{pathway.title}</p>
        {pathway.summary ? (
          <p className="truncate text-xs text-foreground/60">{pathway.summary}</p>
        ) : null}
      </div>
    </Link>
  );
}
