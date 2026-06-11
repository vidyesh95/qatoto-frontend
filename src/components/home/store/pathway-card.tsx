import Image from "next/image";
import Link from "next/link";
import type { Pathway } from "@/lib/store";

// Portrait card for the "Pathways for you" rail. Tapping opens the pathway
// detail page where the user buys the whole look or individual items from it.
export default function PathwayCard({ pathway }: { pathway: Pathway }) {
  return (
    <Link
      href={`/store/pathway/${pathway.slug}`}
      className="group relative flex aspect-[3/4] w-44 shrink-0 flex-col justify-start overflow-hidden rounded-xl bg-gray-100 sm:w-52"
    >
      <Image
        src={pathway.imageSrc}
        fill
        alt={pathway.title}
        className="object-cover transition duration-300 group-hover:scale-105"
      />
      <div className="relative bg-linear-to-b from-black/50 to-transparent p-3">
        <p className="text-sm font-semibold text-white">{pathway.title}</p>
        {pathway.subtitle && (
          <p className="line-clamp-2 text-xs text-white/85">{pathway.subtitle}</p>
        )}
      </div>
    </Link>
  );
}
