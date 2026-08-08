// TRANSPORT: server-fetch — core PDP fields; interactive sheets below remain mock.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchStoreProduct } from "@/lib/store/catalog.api";
import { toStoreDetailViewState } from "@/lib/store/view-state";
import { samplePolicyLabel, stockStateLabel } from "@/lib/store/labels";
import { formatLeadTimeDays, formatStorePriceInCents } from "@/lib/store/shared.schemas";
import BuyActionButtons from "@/components/home/store/cards/buy-action-buttons";
import RatingBadge from "@/components/home/store/cards/rating-badge";
import ProductRail from "@/components/home/store/rails/product-rail";
import CategoryBreadcrumb from "@/components/home/store/sections/category-breadcrumb";
import CompanyDetailsSection from "@/components/home/store/sections/company-details-section";
import CustomizationOptions from "@/components/home/store/sections/customization-options";
import DeliverTo from "@/components/home/store/sections/deliver-to";
import DeliveryCost from "@/components/home/store/sections/delivery-cost";
import EngagementBar from "@/components/home/store/sections/engagement-bar";
import PackagingAndDelivery from "@/components/home/store/sections/packaging-and-delivery";
import PriceChart from "@/components/home/store/sections/price-chart";
import ProductColorPicker from "@/components/home/store/sections/product-color-picker";
import ProductDetailsSection from "@/components/home/store/sections/product-details-section";
import ProductImageGallery from "@/components/home/store/sections/product-image-gallery";
import ProductSpecifications from "@/components/home/store/sections/product-specifications";
import ProductHighlights from "@/components/home/store/sections/product-highlights";
import QuestionsAndAnswers from "@/components/home/store/sections/questions-and-answers";
import RatingsAndReviews from "@/components/home/store/sections/ratings-and-reviews";
import SamplePrice from "@/components/home/store/sections/sample-price";
import SimilarAndCompare from "@/components/home/store/sections/similar-and-compare";
import StoreAndChatActions from "@/components/home/store/sections/store-and-chat-actions";
import TradeProtection from "@/components/home/store/sections/trade-protection";
import StoreStatusPanel from "@/components/home/store/sections/store-status-panel";
import ViewIn360Banner from "@/components/home/store/sections/view-in-360-banner";
import { MOCK_FREQUENTLY_BOUGHT_TOGETHER, MOCK_OTHER_RECOMMENDATIONS } from "@/mocks/store-mocks";

function Icon({ src, size = 24, className }: { src: string; size?: number; className?: string }) {
  return <Image src={`/icons/${src}`} width={size} height={size} alt="" className={className} />;
}

export default async function ProductDetail({ productSlug }: { productSlug: string }) {
  if (productSlug === "__none__") notFound();
  const productResult = await fetchStoreProduct(productSlug);
  const viewState = toStoreDetailViewState(productResult);

  switch (viewState.status) {
    case "not_found":
      notFound();
    case "error":
      return (
        <StoreStatusPanel
          status="error"
          message={viewState.message}
          isSignInRequired={viewState.isSignInRequired}
        />
      );
    case "ready": {
      const product = viewState.data;
      const galleryImages = product.images
        .toSorted((leftImage, rightImage) => leftImage.position - rightImage.position)
        .map((image) => image.url);
      const priceLabel = formatStorePriceInCents(product.priceInCents, product.currency);
      // Metrics are nested under `reviewMetrics`; there are no flat rating fields, and there
      // is no `ratingCount` distinct from `reviewCount` on the wire.
      const { averageRating, reviewCount } = product.reviewMetrics;
      const ratingLabel = averageRating !== null ? averageRating.toFixed(1) : null;
      const leadTimeLabel = formatLeadTimeDays(product.leadTimeMinDays, product.leadTimeMaxDays);
      const orderedSpecifications = product.specifications.toSorted(
        (leftSpecification, rightSpecification) =>
          leftSpecification.position - rightSpecification.position,
      );

      return (
        <div className="mx-auto w-full max-w-md pb-40 md:max-w-2xl md:pb-24 lg:max-w-6xl lg:pb-12">
          <CategoryBreadcrumb trail={product.categoryTrail} />

          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="lg:sticky lg:top-16">
              {galleryImages.length > 0 ? (
                <ProductImageGallery images={galleryImages} alt={product.title} />
              ) : (
                <div className="mx-4 aspect-square rounded-xl bg-muted lg:mx-6" />
              )}
              <ViewIn360Banner />
            </div>

            <div className="min-w-0">
              {/*
                Title leads the buy box at lg (enterprise convention); mobile keeps the colour
                picker first. The order utilities only bite at lg, so the mobile DOM order is
                unchanged.
              */}
              <div className="lg:flex lg:flex-col">
                <div className="lg:order-2">
                  <ProductColorPicker />
                </div>

                <div className="space-y-1 px-4 pt-2 lg:order-1 lg:px-6">
                  <Link
                    href={`/store/organizations/${product.seller.slug}`}
                    className="text-xs font-medium tracking-wide text-[#2A76FD]"
                  >
                    {product.brand ?? product.seller.displayName}
                  </Link>
                  <h1 className="text-sm font-medium tracking-tight">{product.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {ratingLabel ? <RatingBadge value={ratingLabel} /> : null}
                    {/*
                    Zero reviews is a fact, not an absence — say "No reviews yet" rather than
                    hiding the row, which would read as "we did not check".
                  */}
                    <p className="text-sm font-medium tracking-tight text-[#6F7979]">
                      {reviewCount > 0
                        ? `${reviewCount.toLocaleString()} ${reviewCount === 1 ? "review" : "reviews"}`
                        : "No reviews yet"}
                    </p>
                  </div>
                  <p className="pt-1 text-base font-semibold">{priceLabel}</p>
                  <p className="text-xs text-foreground/60">
                    {stockStateLabel(product.stockState)}
                    {product.minimumOrderQuantity !== null
                      ? ` · MOQ ${product.minimumOrderQuantity}`
                      : ""}
                    {product.unitOfMeasure ? ` · per ${product.unitOfMeasure}` : ""}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {samplePolicyLabel(product.samplePolicy)}
                    {product.samplePriceInCents !== null
                      ? ` · ${formatStorePriceInCents(product.samplePriceInCents, product.currency)}`
                      : ""}
                    {leadTimeLabel ? ` · Lead time ${leadTimeLabel}` : ""}
                    {product.countryOfOriginCode ? ` · Origin ${product.countryOfOriginCode}` : ""}
                    {product.modelNumber ? ` · Model ${product.modelNumber}` : ""}
                  </p>
                </div>
              </div>

              <EngagementBar />

              {product.pricingTiers.length > 0 ? (
                <PriceChart pricingTiers={product.pricingTiers} currency={product.currency} />
              ) : null}

              {/* TRANSPORT: mock sections — deferred phases */}
              <SamplePrice />
              <CustomizationOptions />
              <DeliverTo />
              <DeliveryCost />
              <PackagingAndDelivery />
              <TradeProtection />

              <div className="hidden gap-2 px-6 py-3 lg:flex">
                <BuyActionButtons />
              </div>
            </div>
          </div>

          {/* Real description + key features, inside the restored collapsible block. */}
          <ProductDetailsSection
            description={product.description}
            keyFeatures={product.keyFeatures}
          />

          {/* The server's flat specification rows, alongside the grouped sheet above. */}
          <ProductSpecifications specifications={orderedSpecifications} />

          <SimilarAndCompare />

          <ProductRail title="Frequently bought together" tiles={MOCK_FREQUENTLY_BOUGHT_TOGETHER} />
          <CompanyDetailsSection />
          <StoreAndChatActions />
          <ProductHighlights />
          <RatingsAndReviews />
          <QuestionsAndAnswers />

          <div className="flex justify-center px-4 py-3 lg:px-6">
            <span className="flex items-center gap-1 text-xs font-medium text-[#6F7979]">
              <Icon
                src="flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                size={16}
                className="opacity-70"
              />
              Report abuse (coming later)
            </span>
          </div>

          <ProductRail title="Other recommendations" tiles={MOCK_OTHER_RECOMMENDATIONS} />

          <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md gap-2 bg-white px-4 py-2 md:bottom-0 lg:hidden">
            <BuyActionButtons />
          </div>
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
