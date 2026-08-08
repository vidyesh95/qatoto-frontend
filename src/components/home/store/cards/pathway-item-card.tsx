// TRANSPORT: props-only

import Image from "next/image";
import Link from "next/link";
import type { StoreProductTile } from "@/lib/store/tiles";

/**
 * One buyable piece of a pathway "look" — image, category badge, name, price.
 *
 * The category badge is now REAL: a pathway item is a `MerchandisingItemProjection`, and its
 * product carries `category.name` from the server. Only the "+" affordance is still inert —
 * adding to cart is a backend mutation (`PUT /commerce/cart/items/:productId`) that this surface
 * does not call yet, so it stays `aria-hidden` decoration rather than a button that does nothing.
 */
export default function PathwayItemCard({
  tile,
  categoryLabel,
}: {
  tile: StoreProductTile;
  categoryLabel: string;
}) {
  const body = (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {tile.imageUrl ? (
          <Image
            src={tile.imageUrl}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            alt={tile.title}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
          {categoryLabel}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{tile.title}</p>
          <p className="text-sm text-muted-foreground">{tile.priceLabel}</p>
        </div>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-lg leading-none text-primary-foreground"
        >
          +
        </span>
      </div>
    </>
  );

  if (tile.href === null) {
    return <div className="group flex w-40 shrink-0 flex-col gap-2 sm:w-48">{body}</div>;
  }

  return (
    <Link href={tile.href} className="group flex w-40 shrink-0 flex-col gap-2 sm:w-48">
      {body}
    </Link>
  );
}
