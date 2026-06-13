import Image from "next/image";
import Link from "next/link";

import ProductCarousel from "./product-carousel";

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

const PRICE_TIERS = [
  { price: "$1230.79", order: "1 to 49 sets" },
  { price: "$1000.23", order: "50 to 499 sets" },
  { price: "$753.80", order: ">=500 sets" },
];

const CUSTOMIZATION = ["Custom logo", "Custom graphics", "Custom packaging", "Custom cards"];

const TRADE_PROTECTION = [
  { label: "Buyer protection", icon: "shield_person_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  { label: "Secure payment", icon: "lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  { label: "Return policy", icon: "compare_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  {
    label: "Refund for no delivery",
    icon: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
];

const ENGAGEMENT = [
  { count: "3.7k", icon: "favorite_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg" },
  { count: "414", icon: "share_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg" },
  { count: "1.1k", icon: "comment_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg" },
  { count: "3696", icon: "bar_chart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
];

const KEY_FEATURES = [
  "Powder-coated steel frame, anti-rust finish",
  "Folds flat to 5 cm — stacks up to 12 high",
  "Weight capacity 150 kg, tested to EN 16139",
  "Non-marking floor glides, indoor/outdoor",
  "Pre-assembled — no tools required",
];

const VERIFIED = [
  "OEM factory",
  "Full customization",
  "Product inspection",
  "Design-based customization",
];

const HIGHLIGHTS = [
  {
    title: "Built to take a beating",
    body: "Cold-rolled steel tube and reinforced welds shrug off daily commercial use, banquet halls to cafés.",
    image: "/dummy/living_room_chair.avif",
  },
  {
    title: "Stack twelve, store anywhere",
    body: "Flat-fold geometry stacks a dozen chairs into a single trolley footprint — clear a room in minutes.",
    image: "/dummy/stacking_chair.avif",
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

// Collapsible section row with a chevron — native <details>, no client JS.
function Section({
  title,
  children,
  open,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="group border-t border-[#CAC4D0]/60 [&_summary]:list-none">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 lg:px-6">
        <span className="text-sm">{title}</span>
        <Icon
          src="keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          size={22}
          className="transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pb-4 lg:px-6">{children}</div>
    </details>
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
          {COLORS.map((c) => (
            <div key={c.name} className="w-14 shrink-0">
              <div
                className={`relative aspect-square overflow-hidden rounded ${
                  c.selected ? "outline outline-[#2A76FD]" : "outline outline-[#E0E3E3]"
                } -outline-offset-1`}
              >
                <Image src={c.src} fill alt={c.name} className="object-cover" />
              </div>
              <p
                className={`mt-1 text-center text-xs font-medium tracking-wide ${
                  c.selected ? "text-[#2A76FD]" : "text-foreground"
                }`}
              >
                {c.name}
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

      {/* Engagement pills */}
      <div className="flex gap-4 px-4 py-6 lg:px-6">
        {ENGAGEMENT.map((e) => (
          <span
            key={e.count}
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#CCE8E9] px-2 py-1 text-[11px] font-medium text-[#041F21] shadow-sm"
          >
            <Icon src={e.icon} size={16} />
            {e.count}
          </span>
        ))}
      </div>

      {/* Price chart */}
      <Section title="Price chart" open>
        <div className="grid grid-cols-3 gap-2">
          {PRICE_TIERS.map((t) => (
            <div key={t.order}>
              <p className="text-sm font-medium">{t.price}</p>
              <p className="mt-1 text-[11px] font-medium text-[#6F7979]">Min. order:</p>
              <p className="text-[11px] font-medium text-[#6F7979]">{t.order}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Customization options */}
      <Section title="Customization options" open>
        <div className="grid grid-cols-2 gap-2">
          {CUSTOMIZATION.map((label) => (
            <label key={label} className="flex items-center gap-2 text-xs">
              <Icon src="check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={16} />
              {label}
            </label>
          ))}
        </div>
      </Section>

      {/* Deliver to */}
      <div className="flex items-center gap-2 border-t border-[#CAC4D0]/60 px-4 py-3 lg:px-6">
        <div className="flex-1 text-xs">
          <p>
            <span className="text-[#6F7979]">Deliver to:</span> Vidyesh Bipin Churi, 401301{" "}
            <span className="ml-1 rounded bg-[#D6E3FF] px-1 py-0.5">HOME</span>
          </p>
          <p className="mt-0.5 text-[#6F7979]">
            1457, Vinay house, Agashi-Crossnaka, Virar west, Tal: Vasai, Dist: Palghar
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Change
        </button>
      </div>

      {/* Delivery cost */}
      <div className="flex items-center gap-2 border-t border-[#CAC4D0]/60 px-4 py-3 text-xs lg:px-6">
        <div className="flex-1 space-y-0.5">
          <p>
            <span className="text-[#6F7979]">Delivery cost:</span> Free Delivery to your location
          </p>
          <p>
            <span className="text-[#6F7979]">Estimate delivery time:</span> Sept 23 to Sept 27
          </p>
        </div>
        <Icon src="keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={22} />
      </div>

      {/* Trade protection */}
      <Section title="Trade protection" open>
        <div className="grid grid-cols-2 gap-2">
          {TRADE_PROTECTION.map((t) => (
            <div key={t.label} className="flex items-center gap-2 text-xs">
              <Icon src={t.icon} size={16} />
              {t.label}
            </div>
          ))}
        </div>
      </Section>

      {/* Product details */}
      <Section title="Product details" open>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">In the box</p>
            <p className="mt-1 text-xs text-[#191C1C]">
              1 × Folding chair (pre-assembled), 4 × floor glides, cleaning cloth, warranty card.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Key Features</p>
            <ul className="mt-1 space-y-0.5 text-xs text-[#191C1C]">
              {KEY_FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <Link href="#" className="block border-t border-[#CAC4D0]/60 pt-3 text-sm text-[#00696E]">
            All product details
          </Link>
        </div>
      </Section>

      {/* View similar / Add to Compare */}
      <div className="flex gap-2 px-4 py-3 lg:px-6">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 border border-[#6F7979] px-4 py-2 text-sm"
        >
          <Icon src="search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={20} />
          View similar
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 border border-[#6F7979] px-4 py-2 text-sm"
        >
          <Icon src="compare_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={20} />
          Add to Compare
        </button>
      </div>

      {/* Company details */}
      <Section title="Company details" open>
        <div className="space-y-3">
          <p className="text-base font-medium">Guangdong Puda Electrical Appliance Co., Ltd</p>
          <p className="flex items-center gap-2 text-sm">
            <Icon src="location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" size={20} />
            Guangdong, China
          </p>
          <div className="flex items-center gap-2">
            <RatingBadge value="4.8" />
            <span className="text-sm text-[#6F7979]">26,692 Ratings &amp; 2,432 Reviews</span>
          </div>
          <div>
            <p className="text-base font-medium">Main categories:</p>
            <p className="text-sm">Jacket, shirt, t-shirt, pants, hoodies</p>
          </div>
          <div className="border-t border-[#CAC4D0]/60 pt-3">
            <p className="mb-2 text-sm">Verified capabilities</p>
            <ul className="space-y-2">
              {VERIFIED.map((v) => (
                <li key={v} className="flex items-center gap-2 text-xs">
                  <Icon src="verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg" size={16} />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Product highlights */}
      <div className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
        <h2 className="mb-3 text-base font-medium">Product highlights</h2>
        <div className="space-y-6">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title}>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                <Image src={h.image} fill alt={h.title} className="object-cover" />
              </div>
              <h3 className="mt-2 text-sm font-medium">{h.title}</h3>
              <p className="text-xs text-[#6F7979]">{h.body}</p>
            </div>
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
          {REVIEWS.map((r, i) => (
            <div key={i} className="flex gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded bg-[#F5F5F5]">
                <Image src={r.image} fill alt="" className="object-cover" />
              </div>
              <div className="flex-1">
                <Stars rating={r.rating} />
                <p className="text-[11px] text-[#6F7979]">12 months ago · {r.name}</p>
                <p className="mt-0.5 text-xs">{r.body}</p>
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
          {COLORS.map((c) => (
            <div
              key={c.name}
              className="relative aspect-square overflow-hidden rounded bg-[#F5F5F5]"
            >
              <Image src={c.src} fill alt="" className="object-cover" />
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
          {QUESTIONS.map((q) => (
            <li key={q} className="flex items-center justify-between text-sm">
              {q}
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
