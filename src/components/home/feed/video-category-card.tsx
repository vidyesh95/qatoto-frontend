// TRANSPORT: props-only — one "What's on your mind?" tile. Fetches nothing.

import Image from "next/image";
import Link from "next/link";

export type VideoCategoryCardProps = {
  imageSrc: string;
  name: string;
  hoverBg?: string;
  /**
   * Where the tile goes — `?category=<slug>`, built by the caller with `buildFilterHref` so
   * the rest of the query string survives.
   *
   * Optional because the tile predates the category taxonomy and still renders without one.
   * A tile with no destination is inert rather than a link to nowhere.
   */
  href?: string;
};

export default function VideoCategoryCard({
  imageSrc,
  name,
  hoverBg = "group-hover:bg-gray-100",
  href,
}: VideoCategoryCardProps) {
  const tile = (
    <>
      <div
        className={`pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors ${hoverBg}`}
      />
      <Image
        src={imageSrc}
        width={159}
        height={159}
        alt={name}
        className="aspect-square w-full rounded-xl"
      />
      <p>{name}</p>
    </>
  );

  const className = "group relative flex cursor-pointer flex-col items-center";

  return href === undefined ? (
    <div className={className}>{tile}</div>
  ) : (
    // `scroll={false}`: the tile grid sits mid-page and the filtered result replaces the
    // sections around it, so yanking the reader to the top adds nothing.
    <Link href={href} scroll={false} className={className}>
      {tile}
    </Link>
  );
}
