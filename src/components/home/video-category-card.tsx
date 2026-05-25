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
    <div className="group relative flex flex-col items-center cursor-pointer">
      <div
        className={`absolute inset-0 -m-2 rounded-2xl pointer-events-none -z-10 transition-colors ${hoverBg}`}
      />
      <Image
        src={imageSrc}
        width={159}
        height={159}
        alt={name}
        className="w-full aspect-square rounded-xl"
      />
      <p>{name}</p>
    </div>
  );
}
