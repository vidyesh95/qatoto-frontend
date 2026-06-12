import Image from "next/image";
import Link from "next/link";
import type { Pathway } from "@/lib/store";

// Portrait card for the "Pathways for you" rail. Tapping opens the pathway
// detail page where the user buys the whole look or individual items from it.
export default function PathwayCard({ pathway }: { pathway: Pathway }) {
  return (
    <Link
      href={`/store/pathway/${pathway.slug}`}
      className="group relative flex w-44 shrink-0 flex-col sm:w-52"
    >
      <div
        className={`pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors ${pathway.hoverBg ?? "group-hover:bg-gray-100"}`}
      />
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl">
        <Image
          src={pathway.imageSrc}
          fill
          alt={pathway.title}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="truncate text-sm font-semibold">{pathway.title}</p>
        {pathway.subtitle && (
          <p className="truncate text-xs text-foreground/60">{pathway.subtitle}</p>
        )}
      </div>
    </Link>
  );
}
