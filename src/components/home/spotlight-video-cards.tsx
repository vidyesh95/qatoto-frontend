import Image from "next/image";

export type SpotlightVideoCardsProps = {
  imageSrc: string;
  alt: string;
  position: "left" | "center" | "right";
};

const POSITION_CLASSES: Record<SpotlightVideoCardsProps["position"], string> = {
  left: "flex-1 rounded-md hover:flex-[2] hover:rounded-xl",
  center:
    "flex-[2] rounded-xl group-has-[[data-pos=left]:hover]/spot:flex-1 group-has-[[data-pos=left]:hover]/spot:rounded-md group-has-[[data-pos=right]:hover]/spot:flex-1 group-has-[[data-pos=right]:hover]/spot:rounded-md",
  right: "flex-1 rounded-md hover:flex-[2] hover:rounded-xl",
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
        className="w-full aspect-video object-cover"
      />
    </div>
  );
}
