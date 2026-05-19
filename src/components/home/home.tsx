import PromoCarousel from "@/components/home/promo-carousel";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      {/* <PromoCarousel /> */}

      {/* Filter */}
      <div>
        <button
          type="button"
          className="bg-linear-to-r from-white via-white to-transparent py-4 pl-4 pr-18 cursor-pointer"
        >
          <Image
            src="/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt="Navigate filter back"
          />
        </button>
        <button
          type="button"
          className="bg-linear-to-l from-white via-white to-transparent py-4 pl-18 pr-4 cursor-pointer"
        >
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt="Navigate filter forward"
          />
        </button>
      </div>
    </main>
  );
}
