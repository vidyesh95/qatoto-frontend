import Image from "next/image";
import Link from "next/link";

import CompanyDetailsSection from "./company-details-section";
import CustomizationOptions from "./customization-options";
import DeliverTo from "./deliver-to";
import DeliveryCost from "./delivery-cost";
import EngagementBar from "./engagement-bar";
import PriceChart, { type ProductPricingTier } from "./price-chart";
import ProductCarousel from "./product-carousel";
import ProductDetailsSection from "./product-details-section";
import SimilarAndCompare from "./similar-and-compare";
import StoreAndChatActions from "./store-and-chat-actions";
import TradeProtection from "./trade-protection";

const HERO_IMAGES = [
  "/dummy/chair_raspberry_red.avif",
  "/dummy/chair_raspberry_red02.avif",
  "/dummy/chair_raspberry_red03.avif",
];

// Product detail (chair) view. UI-only mock — static data baked in, no fetch.
// Mirrors the Figma spec: image + 360 banner, color picker, price tiers,
// customization, delivery, trade protection, product + company details,
// highlights, reviews, photos and a Q&A block, with a sticky buy bar.

const COLORS = [
  { name: "Raspberry red", src: "/dummy/chair_raspberry_red.avif", selected: true },
  { name: "Royal purple", src: "/dummy/chair_royal_purple.avif" },
  { name: "Sea blue", src: "/dummy/chair_sea_blue.avif" },
  { name: "Charcoal black", src: "/dummy/chair_charcoal_black.avif" },
];

// Price + customization will come from the backend API. For the UI phase these
// dummy getters stand in for that fetch — swap the body for a real call later,
// keep the shape and the call sites unchanged.

function getProductPricingTiers(productSlug: string): ProductPricingTier[] {
  void productSlug; // single mock product for now
  return [
    { unitPrice: "$1230.79", minimumOrderQuantity: "1 to 49 sets" },
    { unitPrice: "$1000.23", minimumOrderQuantity: "50 to 499 sets" },
    { unitPrice: "$753.80", minimumOrderQuantity: ">=500 sets" },
  ];
}

const HIGHLIGHTS = [
  {
    title: "Built to take a beating",
    body: "Cold-rolled steel tube and reinforced welds shrug off daily commercial use, banquet halls to cafés. The frame is tested to 150 kg and survives years of stacking, folding and rough handling without a creak.",
    image: "/dummy/product_highlights01.avif",
  },
  {
    title: "Stack twelve, store anywhere",
    body: "Flat-fold geometry stacks a dozen chairs into a single trolley footprint — clear a room in minutes. Nested chairs interlock so a full set rolls away on one cart and tucks into the slimmest storage closet.",
    image: "/dummy/product_highlights02.avif",
  },
  {
    title: "Contoured for long sittings",
    body: "A waterfall seat edge and lumbar-shaped back keep guests comfortable through long banquets and meetings. The breathable cushion resists flattening and springs back after hours of continuous use.",
    image: "/dummy/product_highlights03.avif",
  },
  {
    title: "Finishes that resist wear",
    body: "Powder-coated steel and stain-resistant upholstery wipe clean in seconds and shrug off scuffs. The finish holds its colour under sunlight and harsh cleaning, indoors or out on a covered patio.",
    image: "/dummy/product_highlights04.avif",
  },
  {
    title: "Floor-friendly footing",
    body: "Non-marking glides protect tile, hardwood and laminate while keeping the chair planted on uneven ground. The wide feet spread load evenly so there are no scratches, wobble or screech when guests shift.",
    image: "/dummy/product_highlights05.avif",
  },
];

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

const QUESTIONS = [
  "Is this comfortable for office work?",
  "Does it stack with older models?",
  "What is the seat height?",
];

function Icon({ src, size = 24, className }: { src: string; size?: number; className?: string }) {
  return <Image src={`/icons/${src}`} width={size} height={size} alt="" className={className} />;
}

// Compact dark rating pill (e.g. "4.8 ★").
function RatingBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-[#4A6364] p-1 text-xs font-medium tracking-wide text-white">
      {value}
      <span aria-hidden className="text-white">
        ★
      </span>
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-sm text-[#4A6364]">
      {"★".repeat(rating)}
      <span className="text-[#CCE8E9]">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function ProductDetail({ slug }: { slug: string }) {
  void slug; // single mock product for now

  const pricingTiers = getProductPricingTiers(slug);

  return (
    <div className="mx-auto w-full max-w-md pb-40 md:pb-24">
      {/* Hero carousel + dots */}
      <ProductCarousel images={HERO_IMAGES} alt="Louis Vuitton Folding Metal Living Room Chair" />

      {/* View in 360 banner */}
      <div className="px-4 py-2 lg:px-6">
        <div className="flex items-center gap-3 rounded p-2 outline -outline-offset-1 outline-[#2A76FD]">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-medium text-[#191C1C]">View in 360º</p>
            <p className="text-[11px] font-medium tracking-[0.5px] text-[#6F7979]">
              Check how this looks from all angles
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-[#D6E3FF]">
            <Icon src="360_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={24} />
          </span>
        </div>
      </div>

      {/* Color picker */}
      <div className="px-4 pt-2 lg:px-6">
        <p className="py-2 text-xs font-medium tracking-wide text-foreground">Select Color</p>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLORS.map((color) => (
            <div key={color.name} className="w-14 shrink-0">
              <div
                className={`relative aspect-square overflow-hidden rounded ${
                  color.selected ? "outline outline-[#2A76FD]" : "outline outline-[#E0E3E3]"
                } -outline-offset-1`}
              >
                <Image
                  src={color.src}
                  fill
                  sizes="56px"
                  alt={color.name}
                  className="object-cover"
                />
              </div>
              <p
                className={`mt-1 text-center text-xs font-medium tracking-wide ${
                  color.selected ? "text-[#2A76FD]" : "text-foreground"
                }`}
              >
                {color.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Brand + title + rating */}
      <div className="space-y-1 px-4 pt-2 lg:px-6">
        <Link
          href="/store/stacking-chair"
          className="text-xs font-medium tracking-wide text-[#2A76FD]"
        >
          Louis Vuitton Living Room Chairs
        </Link>
        <h1 className="text-sm font-medium tracking-tight">
          Louis Vuitton Folding Metal Living Room Chair (Finish Color - Red, Pre-assembled)
        </h1>
        <div className="flex items-center gap-2 pt-1">
          <RatingBadge value="4.8" />
          <p className="text-sm font-medium tracking-tight text-[#6F7979]">
            26,692 Ratings &amp; 2,432 Reviews
          </p>
        </div>
      </div>

      {/* Engagement pills — toggle-fill on select; share opens a sheet */}
      <EngagementBar />

      {/* Price chart — tap "more" opens the detailed price-chart sheet */}
      <PriceChart pricingTiers={pricingTiers} />

      {/* Customization options — tap opens the seller's allowed-customizations sheet */}
      <CustomizationOptions />

      {/* Deliver to — selectable address with a Change sheet (add/edit/select) */}
      <DeliverTo />

      {/* Delivery cost — tap opens the delivery options sheet (map + modes) */}
      <DeliveryCost />

      {/* Trade protection — tap opens the sheet explaining each guarantee */}
      <TradeProtection />

      {/* Product details — "All product details" opens the tabbed spec sheet */}
      <ProductDetailsSection />

      {/* View similar / Add to Compare — each opens its own bottom sheet */}
      <SimilarAndCompare />

      {/* Company details — "Verified capabilities" and "All company details"
          each open their own bottom sheet */}
      <CompanyDetailsSection />

      {/* Store / Chat now — Store opens the manufacturer storefront sheet; Chat
          now opens the manufacturer chat sheet (dispute mediation + file share) */}
      <StoreAndChatActions />

      {/* Product highlights */}
      <div className="border-t border-[#CAC4D0]/60 px-4 py-2 lg:px-6">
        <div className="flex items-center gap-2 py-2">
          <h2 className="flex-1 text-sm tracking-[0.25px] text-[#191C1C]">Product highlights</h2>
          <Icon src="keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={24} />
        </div>
        <div className="space-y-2 py-2">
          {HIGHLIGHTS.map((highlight, highlightIndex) => (
            <details key={highlight.title} className="group">
              <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base font-medium tracking-[0.15px] text-[#191C1C]">
                  {highlight.title}
                </h3>
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                  <Image
                    src={highlight.image}
                    fill
                    priority={highlightIndex === 0}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    alt={highlight.title}
                    className="object-cover"
                  />
                </div>
                <p className="line-clamp-3 text-sm leading-5 tracking-[0.25px] text-[#191C1C] group-open:line-clamp-none">
                  {highlight.body}
                </p>
                <span className="text-right text-xs font-medium tracking-[0.5px] text-[#2A76FD]">
                  <span className="group-open:hidden">read more</span>
                  <span className="hidden group-open:inline">read less</span>
                </span>
              </summary>
            </details>
          ))}
        </div>
      </div>

      {/* Ratings and reviews */}
      <div className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Ratings and reviews</h2>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-[#6F7979] px-3 py-1.5 text-sm text-[#00696E]"
          >
            <Icon src="rate_review_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={18} />
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
      </div>

      {/* Photos */}
      <div className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
        <h2 className="mb-3 text-base font-medium">Photos</h2>
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((color) => (
            <div
              key={color.name}
              className="relative aspect-square overflow-hidden rounded bg-[#F5F5F5]"
            >
              <Image
                src={color.src}
                fill
                sizes="(min-width: 1024px) 12vw, 25vw"
                alt=""
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Questions and answers */}
      <div className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
        <h2 className="mb-3 text-base font-medium">Questions and answers</h2>
        <div className="mb-3 flex items-center gap-2 rounded-full border border-[#6F7979] px-3 py-2">
          <Icon src="search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={18} />
          <span className="text-sm text-[#6F7979]">Search or ask question</span>
        </div>
        <ul className="space-y-3">
          {QUESTIONS.map((question) => (
            <li key={question} className="flex items-center justify-between text-sm">
              {question}
              <Icon src="arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={16} />
            </li>
          ))}
        </ul>
        <Link href="#" className="mt-3 block text-sm text-[#00696E]">
          All questions and answers
        </Link>
      </div>

      {/* Sticky action bar — sits above the mobile bottom nav (md:hidden adds
          its ~80px height); on md+ there's no bottom nav so it drops to 0. */}
      <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md gap-2 bg-white px-4 py-2 md:bottom-0">
        <button
          type="button"
          className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          Send inquiry
        </button>
        <button
          type="button"
          className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
        >
          Add to cart
        </button>
        <button
          type="button"
          className="flex-1 rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white"
        >
          Buy now
        </button>
      </div>
    </div>
  );
}
