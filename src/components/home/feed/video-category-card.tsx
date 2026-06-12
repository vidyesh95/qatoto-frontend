import Image from "next/image";

export type VideoCategoryCardProps = {
  imageSrc: string;
  name: string;
  hoverBg?: string;
};

export default function VideoCategoryCard({
  imageSrc,
  name,
  hoverBg = "group-hover:bg-gray-100",
}: VideoCategoryCardProps) {
  return (
    <div className="group relative flex cursor-pointer flex-col items-center">
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
    </div>
  );
}
