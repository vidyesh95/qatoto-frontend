import Image from "next/image";

export type SpotlightVideoCardsProps = {
  imageSrc: string;
  alt: string;
  position: "left" | "center" | "right";
};

const POSITION_CLASSES: Record<SpotlightVideoCardsProps["position"], string> = {
  left: "w-3/5 rounded-md hover:w-full hover:rounded-xl md:w-auto md:flex-1 md:hover:flex-[2]",
  center:
    "w-full rounded-xl group-has-[[data-pos=left]:hover]/spot:w-3/5 group-has-[[data-pos=left]:hover]/spot:rounded-md group-has-[[data-pos=right]:hover]/spot:w-3/5 group-has-[[data-pos=right]:hover]/spot:rounded-md md:w-auto md:flex-[2] md:group-has-[[data-pos=left]:hover]/spot:flex-1 md:group-has-[[data-pos=right]:hover]/spot:flex-1",
  right: "w-3/5 rounded-md hover:w-full hover:rounded-xl md:w-auto md:flex-1 md:hover:flex-[2]",
};

export default function SpotlightVideoCards({ imageSrc, alt, position }: SpotlightVideoCardsProps) {
  return (
    <div
      data-pos={position}
      className={`cursor-pointer overflow-hidden transition-all duration-300 ease-out ${POSITION_CLASSES[position]}`}
    >
      <Image
        src={imageSrc}
        width={512}
        height={288}
        alt={alt}
        className="aspect-video w-full object-cover"
      />
    </div>
  );
}
