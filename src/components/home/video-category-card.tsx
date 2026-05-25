import Image from "next/image";

export type VideoCategoryCardProps = {
  imageSrc: string;
  name: string;
};

export default function VideoCategoryCard({ imageSrc, name }: VideoCategoryCardProps) {
  return (
    <div className="flex flex-col items-center">
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
