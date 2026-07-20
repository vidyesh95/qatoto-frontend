import Image from "next/image";
import Link from "next/link";

import BuyActionButtons from "@/components/home/store/cards/buy-action-buttons";
import RatingBadge from "@/components/home/store/cards/rating-badge";
import CategoryBreadcrumb from "@/components/home/store/sections/category-breadcrumb";
import CompanyDetailsSection from "@/components/home/store/sections/company-details-section";
import CustomizationOptions from "@/components/home/store/sections/customization-options";
import DeliverTo from "@/components/home/store/sections/deliver-to";
import DeliveryCost from "@/components/home/store/sections/delivery-cost";
import EngagementBar from "@/components/home/store/sections/engagement-bar";
import PackagingAndDelivery from "@/components/home/store/sections/packaging-and-delivery";
import PriceChart from "@/components/home/store/sections/price-chart";
import type { ProductRail as ProductRailData } from "@/types/store";
import ProductImageGallery from "@/components/home/store/sections/product-image-gallery";
import ProductDetailsSection from "@/components/home/store/sections/product-details-section";
import ProductHighlights from "@/components/home/store/sections/product-highlights";
import ProductRail from "@/components/home/store/rails/product-rail";
import QuestionsAndAnswers from "@/components/home/store/sections/questions-and-answers";
import RatingsAndReviews from "@/components/home/store/sections/ratings-and-reviews";
import SamplePrice from "@/components/home/store/sections/sample-price";
import SimilarAndCompare from "@/components/home/store/sections/similar-and-compare";
import StoreAndChatActions from "@/components/home/store/sections/store-and-chat-actions";
import TradeProtection from "@/components/home/store/sections/trade-protection";
import {
  MOCK_CATEGORY_RAILS,
  MOCK_PRODUCT_COLORS,
  MOCK_PRODUCT_HERO_IMAGES,
  MOCK_PRODUCT_PRICING_TIERS,
} from "@/mocks/store-mocks";

// Product detail (chair) view. UI-only mock — static data baked in, no fetch.
// Mirrors the Figma spec: image + 360 banner, color picker, price tiers,
// customization, delivery, trade protection, product + company details,
// highlights, reviews, photos and a Q&A block, with a sticky buy bar.

// Both rails borrow products from the exported category pools so no new mock
// products are authored here. Different pools keep the two rails distinct.
const FREQUENTLY_BOUGHT_TOGETHER_RAIL: ProductRailData = {
  id: "frequently-bought-together",
  title: "Frequently bought together",
  href: "/store/stacking-chair",
  products: MOCK_CATEGORY_RAILS["stacking-chair"][0].products,
};

const OTHER_RECOMMENDATIONS_RAIL: ProductRailData = {
  id: "other-recommendations",
  title: "Other recommendations",
  href: "/store/chairs",
  products: MOCK_CATEGORY_RAILS["chairs"][1].products,
};

function Icon({ src, size = 24, className }: { src: string; size?: number; className?: string }) {
  return <Image src={`/icons/${src}`} width={size} height={size} alt="" className={className} />;
}

export default function ProductDetail({ slug }: { slug: string }) {
  void slug; // single mock product for now

  return (
    <div className="mx-auto w-full max-w-md pb-40 md:max-w-2xl md:pb-24 lg:max-w-6xl lg:pb-12">
      {/* Breadcrumb category trail */}
      <CategoryBreadcrumb />

      {/* lg+: two-column PDP — sticky media gallery left, buy box right. Below
          lg these wrappers are style-less blocks, so the mobile flow and DOM
          order stay exactly as before. */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        {/* Gallery column — sticks just under the 56px navbar while the buy
            column scrolls */}
        <div className="lg:sticky lg:top-16">
          {/* Hero image gallery + dots */}
          <ProductImageGallery
            images={MOCK_PRODUCT_HERO_IMAGES}
            alt="Louis Vuitton Folding Metal Living Room Chair"
          />

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
        </div>

        {/* Buy column */}
        <div className="min-w-0">
          {/* Title leads the buy box at lg (enterprise convention); mobile keeps
          color picker first — order utilities only bite at lg. */}
          <div className="lg:flex lg:flex-col">
            {/* Color picker */}
            <div className="px-4 pt-2 lg:order-2 lg:px-6">
              <p className="py-2 text-xs font-medium tracking-wide text-foreground">Select Color</p>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {MOCK_PRODUCT_COLORS.map((color) => (
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
            <div className="space-y-1 px-4 pt-2 lg:order-1 lg:px-6">
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
          </div>

          {/* Engagement pills — toggle-fill on select; share opens a sheet */}
          <EngagementBar />

          {/* Price chart — tap "more" opens the detailed price-chart sheet */}
          <PriceChart pricingTiers={MOCK_PRODUCT_PRICING_TIERS} />

          {/* Sample price — order one unit before committing to a bulk order */}
          <SamplePrice />

          {/* Customization options — tap opens the seller's allowed-customizations sheet */}
          <CustomizationOptions />

          {/* Deliver to — selectable address with a Change sheet (add/edit/select) */}
          <DeliverTo />

          {/* Delivery cost — tap opens the delivery options sheet (map + modes) */}
          <DeliveryCost />

          {/* Packaging and delivery — collapsed spec rows + nested lead time */}
          <PackagingAndDelivery />

          {/* Trade protection — tap opens the sheet explaining each guarantee */}
          <TradeProtection />

          {/* Desktop inline CTAs — replace the fixed bottom bar at lg+ */}
          <div className="hidden gap-2 px-6 py-3 lg:flex">
            <BuyActionButtons />
          </div>
        </div>
      </div>

      {/* Product details — "All product details" opens the tabbed spec sheet */}
      <ProductDetailsSection />

      {/* View similar / Add to Compare — each opens its own bottom sheet */}
      <SimilarAndCompare />

      {/* Frequently bought together */}
      <ProductRail rail={FREQUENTLY_BOUGHT_TOGETHER_RAIL} />

      {/* Company details — "Verified capabilities" and "All company details"
          each open their own bottom sheet */}
      <CompanyDetailsSection />

      {/* Store / Chat now — Store opens the manufacturer storefront sheet; Chat
          now opens the manufacturer chat sheet (dispute mediation + file share) */}
      <StoreAndChatActions />

      {/* Product highlights — collapsible cards (native details/summary) */}
      <ProductHighlights />

      {/* Ratings and reviews */}
      <RatingsAndReviews />

      {/* Questions and answers */}
      <QuestionsAndAnswers />

      {/* Report abuse */}
      <div className="flex justify-center px-4 py-3 lg:px-6">
        <Link href="#" className="flex items-center gap-1 text-xs font-medium text-[#6F7979]">
          <Icon
            src="flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            size={16}
            className="opacity-70"
          />
          Report abuse
        </Link>
      </div>

      {/* Other recommendations — end-of-page discovery rail */}
      <ProductRail rail={OTHER_RECOMMENDATIONS_RAIL} />

      {/* Sticky action bar — sits above the mobile bottom nav (md:hidden adds
          its ~80px height); on md+ there's no bottom nav so it drops to 0.
          Hidden at lg+ where the buy column shows the CTAs inline. */}
      <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md gap-2 bg-white px-4 py-2 md:bottom-0 lg:hidden">
        <BuyActionButtons />
      </div>
    </div>
  );
}
