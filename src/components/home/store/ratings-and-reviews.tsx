import Image from "next/image";
import Link from "next/link";

const REVIEWS = [
  {
    name: "Central African Republic",
    rating: 3,
    body: "Comfort enough for office work. Cushion holds up after months of daily use.",
    image: "/dummy/chair_raspberry_red.avif",
  },
  {
    name: "Central African Republic",
    rating: 4,
    body: "Folds flat exactly as shown. Frame feels solid, no wobble on tile floors.",
    image: "/dummy/chair_sea_blue.avif",
  },
];

const PHOTOS = [
  "/dummy/chair_raspberry_red.avif",
  "/dummy/chair_royal_purple.avif",
  "/dummy/chair_sea_blue.avif",
  "/dummy/chair_charcoal_black.avif",
];

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-sm text-[#4A6364]">
      {"★".repeat(rating)}
      <span className="text-[#CCE8E9]">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function RatingsAndReviews() {
  return (
    <div className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Ratings and reviews</h2>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-[#6F7979] px-3 py-1.5 text-sm text-[#00696E]"
        >
          <Image
            src="/icons/rate_review_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
          />
          Rate product
        </button>
      </div>
      <div className="space-y-4">
        {REVIEWS.map((review, reviewIndex) => (
          <div key={reviewIndex} className="flex gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded bg-[#F5F5F5]">
              <Image src={review.image} fill sizes="56px" alt="" className="object-cover" />
            </div>
            <div className="flex-1">
              <Stars rating={review.rating} />
              <p className="text-[11px] text-[#6F7979]">12 months ago · {review.name}</p>
              <p className="mt-0.5 text-xs">{review.body}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="#" className="mt-3 block text-sm text-[#00696E]">
        All ratings and reviews
      </Link>

      {/* Photos */}
      <div className="mt-4 border-t border-[#CAC4D0]/60 pt-4">
        <h2 className="mb-3 text-base font-medium">Photos</h2>
        <div className="grid grid-cols-4 gap-2">
          {PHOTOS.map((photo) => (
            <div
              key={photo}
              className="relative aspect-square overflow-hidden rounded bg-[#F5F5F5]"
            >
              <Image
                src={photo}
                fill
                sizes="(min-width: 1024px) 12vw, 25vw"
                alt=""
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
