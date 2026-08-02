// TRANSPORT: props-only — one Spotlight tile. Fetches nothing.

import Image from "next/image";
import Link from "next/link";

export type SpotlightVideoCardsProps = {
  imageSrc: string;
  alt: string;
  position: "left" | "center" | "right";
  /** `/watch?v=<videoId>`. Optional so the tile still renders for a row with no id. */
  href?: string;
};

const POSITION_CLASSES: Record<SpotlightVideoCardsProps["position"], string> = {
  left: "w-3/5 rounded-md hover:w-full hover:rounded-xl md:w-auto md:flex-1 md:hover:flex-[2]",
  center:
    "w-full rounded-xl group-has-[[data-pos=left]:hover]/spot:w-3/5 group-has-[[data-pos=left]:hover]/spot:rounded-md group-has-[[data-pos=right]:hover]/spot:w-3/5 group-has-[[data-pos=right]:hover]/spot:rounded-md md:w-auto md:flex-[2] md:group-has-[[data-pos=left]:hover]/spot:flex-1 md:group-has-[[data-pos=right]:hover]/spot:flex-1",
  right: "w-3/5 rounded-md hover:w-full hover:rounded-xl md:w-auto md:flex-1 md:hover:flex-[2]",
};

export default function SpotlightVideoCards({
  imageSrc,
  alt,
  position,
  href,
}: SpotlightVideoCardsProps) {
  const image = (
    <Image
      src={imageSrc}
      width={512}
      height={288}
      alt={alt}
      className="aspect-video w-full object-cover"
    />
  );

  return (
    // `data-pos` drives the sibling-hover expansion in POSITION_CLASSES and must stay on the
    // outermost element, so the link goes INSIDE rather than wrapping it.
    <div
      data-pos={position}
      className={`cursor-pointer overflow-hidden transition-all duration-300 ease-out ${POSITION_CLASSES[position]}`}
    >
      {href === undefined ? (
        image
      ) : (
        <Link href={href} aria-label={alt}>
          {image}
        </Link>
      )}
    </div>
  );
}
