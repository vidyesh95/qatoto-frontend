import Image from "next/image";
import Link from "next/link";

const VIDEOS = [
  "/dummy/thumbnail_image01.avif",
  "/dummy/thumbnail_image02.avif",
  "/dummy/thumbnail_image03.avif",
];

const PHOTOS = [
  "/dummy/review_image01.avif",
  "/dummy/review_image02.avif",
  "/dummy/review_image03.avif",
  "/dummy/chair_raspberry_red.avif",
  "/dummy/chair_royal_purple.avif",
  "/dummy/chair_sea_blue.avif",
  "/dummy/chair_charcoal_black.avif",
  "/dummy/chair_raspberry_red02.avif",
];

const REVIEWS = [
  {
    handle: "@ikun",
    avatar: "/dummy/profile_image_01.avif",
    product: "Cement flower pot with Safety manual and gray mold 1pc",
    rating: 3,
    body: "Cement flower pot 🤣 too heavy, No one wants",
    images: [
      "/dummy/review_image01.avif",
      "/dummy/review_image02.avif",
      "/dummy/review_image03.avif",
    ],
    helpful: "8.8m",
    date: "12 months ago",
    country: "Central African Republic",
  },
  {
    handle: "@ikun",
    avatar: "/dummy/profile_image_02.avif",
    product: "Cement flower pot with Safety manual and brown mold 1pc",
    rating: 3,
    body: "Cement flower pot 🤣 too heavy, No one wants",
    images: [
      "/dummy/chair_raspberry_red.avif",
      "/dummy/chair_sea_blue.avif",
      "/dummy/chair_royal_purple.avif",
    ],
    helpful: "8.8m",
    date: "12 months ago",
    country: "Central African Republic",
  },
  {
    handle: "@ikun",
    avatar: "/dummy/profile_image_03.avif",
    product: "Cement flower pot with Safety manual and gray mold 1pc",
    rating: 3,
    body: "Cement flower pot 🤣 too heavy, No one wants",
    images: [
      "/dummy/chair_charcoal_black.avif",
      "/dummy/review_image02.avif",
      "/dummy/chair_raspberry_red02.avif",
    ],
    helpful: "8.8m",
    date: "12 months ago",
    country: "Central African Republic",
  },
];

const CHEVRON = "/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg";

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-xl leading-none text-[#00696E]">
      {"★".repeat(rating)}
      <span className="text-[#E0E3E3]">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 lg:px-6">
      <span className="text-sm text-[#191C1C]">{title}</span>
      <Image src={CHEVRON} width={20} height={20} alt="" className="opacity-70" />
    </div>
  );
}

function ThumbStrip({ images, alt }: { images: string[]; alt: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 lg:px-6">
      {images.map((image) => (
        <div
          key={image}
          className="relative size-18 shrink-0 overflow-hidden rounded border border-[#E0E3E3] bg-[#F5F5F5]"
        >
          <Image src={image} fill sizes="72px" alt={alt} className="object-cover" />
        </div>
      ))}
    </div>
  );
}

export default function RatingsAndReviews() {
  return (
    <div className="border-t border-[#CAC4D0]/60 py-2">
      {/* Header + rate button */}
      <div className="flex items-center justify-between px-4 py-2 lg:px-6">
        <h2 className="text-sm text-[#191C1C]">Ratings and reviews</h2>
        <Image src={CHEVRON} width={20} height={20} alt="" className="opacity-70" />
      </div>
      <div className="px-4 py-2 lg:px-6">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#6F7979] py-2.5 text-sm font-medium text-[#00696E]"
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

      {/* Rating summary */}
      <div className="flex items-center gap-2 px-4 py-1 lg:px-6">
        <span className="flex items-center gap-1 rounded bg-[#4A6364] px-1.5 py-1 text-[11px] font-medium text-white">
          4.8
          <span className="text-xs leading-none">★</span>
        </span>
        <span className="text-sm font-medium text-[#6F7979]">
          26,692 Ratings &amp; 2,432 Reviews
        </span>
      </div>

      {/* Videos */}
      <div className="py-2">
        <SectionHeader title="Videos" />
        <ThumbStrip images={VIDEOS} alt="Review video thumbnail" />
      </div>

      {/* Photos */}
      <div className="py-2">
        <SectionHeader title="Photos" />
        <ThumbStrip images={PHOTOS} alt="Review photo" />
      </div>

      {/* Reviews */}
      {REVIEWS.map((review, reviewIndex) => (
        <div key={reviewIndex} className="py-4">
          <div className="flex gap-2 px-4 lg:px-6">
            <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-[#F5F5F5]">
              <Image src={review.avatar} fill sizes="32px" alt="" className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium text-black">{review.handle}</p>
              <p className="text-xs font-medium text-[#A9ACAC]">{review.product}</p>
              <Stars rating={review.rating} />
              <p className="mt-1 text-xs font-medium text-black">{review.body}</p>
              <p className="text-right text-xs font-medium text-[#2A76FD]">more</p>

              {/* Review image grid */}
              <div className="mt-1 flex gap-1">
                {review.images.map((image) => (
                  <div
                    key={image}
                    className="relative size-18 overflow-hidden rounded-[3px] bg-[#F5F5F5]"
                  >
                    <Image src={image} fill sizes="72px" alt="" className="object-cover" />
                  </div>
                ))}
              </div>

              <p className="mt-1 flex gap-1 text-[11px] font-medium text-black">
                <span>{review.date}</span>
                <span>•</span>
                <span>{review.country}</span>
              </p>

              {/* Actions */}
              <div className="mt-1 flex items-center gap-4 text-[11px] font-medium text-black">
                <span className="flex items-center gap-1">
                  <Image
                    src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    width={14}
                    height={14}
                    alt=""
                  />
                  {review.helpful}
                </span>
                <Image
                  src="/icons/reply_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={14}
                  height={14}
                  alt="Reply"
                />
                <Image
                  src="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={14}
                  height={14}
                  alt="Share"
                />
              </div>
            </div>
            <Image
              src="/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={14}
              height={14}
              alt="More"
              className="shrink-0"
            />
          </div>

          {/* Verified purchase */}
          <div className="mt-4 flex items-center justify-center gap-2 px-14 text-[11px] font-medium text-[#6F7979]">
            <span className="h-px w-6 bg-[#CAC4D0]" />
            Verified Purchase
            <Image
              src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
              width={14}
              height={14}
              alt=""
            />
          </div>
        </div>
      ))}

      {/* Footer link */}
      <div className="border-t border-[#CAC4D0]/60">
        <Link
          href="#"
          className="flex items-center justify-between px-4 py-3 text-sm text-[#191C1C] lg:px-6"
        >
          All ratings and reviews
          <Image src={CHEVRON} width={20} height={20} alt="" className="opacity-70" />
        </Link>
      </div>
    </div>
  );
}
