import PromoCarousel from "@/components/home/promo-carousel";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      {/* <PromoCarousel /> */}

      {/* Filter */}
      <div className="relative">
        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 bg-linear-to-r from-white via-white to-transparent py-4 pl-4 pr-18 cursor-pointer"
        >
          <Image
            src="/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt="Navigate filter back"
          />
        </button>
        <div className="h-14 flex flex-row items-center gap-2 px-4">
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Live</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Trending</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">New to you</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">News</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Recently uploaded</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Watched</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Gaming</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Shopping</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Cosplay</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">Music</div>
          <div className="px-4 py-1.5 text-sm text-nowrap border border-outline rounded-md">News</div>
        </div>
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 bg-linear-to-l from-white via-white to-transparent py-4 pl-18 pr-4 cursor-pointer"
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
