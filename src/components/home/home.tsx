import Image from "next/image";

export default function Home() {
  return (
    <main>
      <div className="relative w-full flex justify-center bg-gray-200" id="promo-carousel">
        <Image
          src={"/dummy/highlight_image01.avif"}
          width={1080}
          height={260}
          alt="Advertise dummy image 1"
        />
        <button className="absolute top-0 right-0 p-2 cursor-pointer">
          <Image
            src={"/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
            width={24}
            height={24}
            alt="close promo"
          />
        </button>
      </div>
    </main>
  );
}
