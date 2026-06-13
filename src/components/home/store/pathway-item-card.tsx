import Image from "next/image";
import Link from "next/link";
import type { PathwayItem } from "@/lib/store";

// One buyable piece of a pathway "look" — image, category badge, name, price.
// Tapping navigates to the item's product/category surface; actual cart adds
// are a backend mutation wired later (thin client never owns cart truth).
export default function PathwayItemCard({ item }: { item: PathwayItem }) {
  return (
    <Link href={item.href} className="group flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        <Image
          src={item.imageSrc}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          alt={item.name}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
          {item.categoryLabel}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.price}</p>
        </div>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-lg leading-none text-primary-foreground"
        >
          +
        </span>
      </div>
    </Link>
  );
}
