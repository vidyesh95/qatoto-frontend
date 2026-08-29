// TRANSPORT: server-fetch — awaits the product and branches on the result.
//
// THE PRODUCT PAGE. It used to take a `slug` prop and do `void slug`, rendering ONE hardcoded chair
// for every id in the catalogue; there was no `products.api.ts` at all. Everything below now comes
// from `GET /store/products/:productSlug` and the four reads that hang off it.
//
// FOUR READS, IN PARALLEL, AND EACH ONE EARNS ITS ROUND TRIP:
//   the product        — the page itself.
//   the storefront     — `seller` on the product read is THIN (id, slug, displayName, countryCode,
//                        logoUrl, summary) and carries neither `declaredProfile` nor
//                        `measuredMetrics`, so a company block has to ask for the storefront.
//   companions         — the relation graph, for "view similar" and the compare tray.
//   reviews, questions — seeded so those sections render with the document rather than flashing.
//
// "BUILT IN THE OPEN" IS A FIFTH FIELD, NOT A FIFTH READ, and the distinction is the whole design.
// `product.researchProjectId` names the venture behind a listing, but every R&D read surface —
// route, service view, Zod schema — is addressed by SLUG and exposes no `id`, and there is no by-id
// project route anywhere. A client handed that raw UUID could not call R&D with it. So the backend
// joins instead and sends `builtInTheOpen` inside the product itself: no round trip, no id on the
// wire, and no new view-state variant, because the `"ready"` case already carries it.
//
// THE SESSION IS THREADED IN. This read is public but SESSION-AWARE: `attachOptionalUser` decides
// whether `engagement.viewer` is state or `null`, and whether `contactAffordance` is `chat`,
// `ask_question` or `sign_in`. Without `callerRequestOptions()` every signed-in buyer would get the
// anonymous projection and their own save toggle would render blank.
//
// NO TRADE-PROTECTION BLOCK, DELIBERATELY. It used to sit in the buy column rendering four finished
// guarantees — "Buyer protection", "Secure payment", "Return policy", "Refund for no delivery".
// Every one of them is false: §14 decided Qatoto is NOT a custodian and never holds funds, so the
// default rail is direct settlement with no protection at all, and escrow is a term the two parties
// negotiate themselves through a licensed third party. Deleted rather than hidden — a comment-out
// is an invitation to un-comment, and this copy is a claim about money.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import BuyActionButtons from "@/components/home/store/cards/buy-action-buttons";
import BuiltInTheOpen from "@/components/home/store/sections/built-in-the-open";
import RatingBadge from "@/components/home/store/cards/rating-badge";
import CategoryBreadcrumb from "@/components/home/store/sections/category-breadcrumb";
import CompanyDetailsSection from "@/components/home/store/sections/company-details-section";
import CustomizationOptions from "@/components/home/store/sections/customization-options";
import DeliverTo from "@/components/home/store/sections/deliver-to";
import DeliveryCost from "@/components/home/store/sections/delivery-cost";
import EngagementBar from "@/components/home/store/sections/engagement-bar";
import PackagingAndDelivery from "@/components/home/store/sections/packaging-and-delivery";
import PriceChart from "@/components/home/store/sections/price-chart";
import ProductDetailsSection from "@/components/home/store/sections/product-details-section";
import ProductHighlights from "@/components/home/store/sections/product-highlights";
import ProductImageGallery from "@/components/home/store/sections/product-image-gallery";
import { ProductSelectionProvider } from "@/components/home/store/sections/product-selection-context";
import QuestionsAndAnswers from "@/components/home/store/sections/questions-and-answers";
import RatingsAndReviews from "@/components/home/store/sections/ratings-and-reviews";
import SamplePrice from "@/components/home/store/sections/sample-price";
import SimilarAndCompare from "@/components/home/store/sections/similar-and-compare";
import StoreAndChatActions from "@/components/home/store/sections/store-and-chat-actions";
import VariantPicker from "@/components/home/store/sections/variant-picker";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";
import { getOrganizationStorefront } from "@/lib/store/organizations.api";
import type { OrganizationStorefrontView } from "@/lib/store/organizations.schemas";
import {
  getStoreProduct,
  getStoreProductCompanions,
  listStoreProductQuestions,
  listStoreProductReviews,
} from "@/lib/store/products.api";
import type {
  ProductCompanionGroup,
  ProductQuestionListPage,
  StoreProductDetail,
  StoreReviewListPage,
} from "@/lib/store/products.schemas";

/**
 * What the page can be showing. No `loading` variant: a server component has already awaited its
 * data by the time it renders, and the pending state is `loading.tsx`.
 *
 * Only the PRODUCT read can fail the page. Every companion read is additive — a storefront that
 * 500s costs the company block, not the product.
 */
type ProductDetailViewState =
  | { status: "error"; message: string }
  | {
      status: "ready";
      product: StoreProductDetail;
      storefront: OrganizationStorefrontView | null;
      companionGroups: readonly ProductCompanionGroup[];
      reviewsPage: StoreReviewListPage | null;
      questionsPage: ProductQuestionListPage | null;
    };

function Icon({ src, size = 24, className }: { src: string; size?: number; className?: string }) {
  return <Image src={`/icons/${src}`} width={size} height={size} alt="" className={className} />;
}

export default async function ProductDetail({ slug }: { slug: string }) {
  // BOTH READ THE SAME COOKIE JAR, so resolving the boolean here is free — this component is already
  // cookie-dynamic. `isViewerSignedIn` is threaded into the client islands below so their FIRST
  // render matches this HTML; without it they hydrate against a session atom the navbar has often
  // already resolved, and React throws the subtree away. See `useViewerSignedIn`.
  const [requestOptions, isViewerSignedIn] = await Promise.all([
    callerRequestOptions(),
    hasCallerSession(),
  ]);
  const productResult = await getStoreProduct(slug, requestOptions);

  // A 404 is the route's answer, not the page's. The backend answers 404 for "no such product" AND
  // for "not visible to you" with one code — never render a permission hint from one.
  if (!productResult.success && productResult.error.code === "404") notFound();

  if (!productResult.success) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-6 pb-24 md:max-w-2xl lg:max-w-6xl lg:px-6">
        <StoreErrorPanel message={productResult.error.message} />
      </div>
    );
  }

  const product = productResult.data;

  // Fired together, and every one is allowed to fail without taking the page with it.
  const [storefrontResult, companionsResult, reviewsResult, questionsResult] = await Promise.all([
    getOrganizationStorefront(product.seller.slug, {}, requestOptions),
    getStoreProductCompanions(slug, requestOptions),
    listStoreProductReviews(slug, {}, requestOptions),
    listStoreProductQuestions(slug, {}, requestOptions),
  ]);

  const viewState: ProductDetailViewState = {
    status: "ready",
    product,
    storefront: storefrontResult.success ? storefrontResult.data : null,
    companionGroups: companionsResult.success ? companionsResult.data.groups : [],
    reviewsPage: reviewsResult.success ? reviewsResult.data : null,
    questionsPage: questionsResult.success ? questionsResult.data : null,
  };

  return renderProductDetail(viewState, isViewerSignedIn);
}

// `isViewerSignedIn` rides alongside the view state rather than inside it: it is a fact about the
// READER, not about the product, and folding a viewer fact into a payload union is how the two start
// disagreeing. See `useViewerSignedIn` for why the islands need it at all.
function renderProductDetail(viewState: ProductDetailViewState, isViewerSignedIn: boolean) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="mx-auto w-full max-w-md px-4 pt-6 pb-24 md:max-w-2xl lg:max-w-6xl lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready": {
      const { product, storefront, companionGroups, reviewsPage, questionsPage } = viewState;
      return (
        // The provider wraps the WHOLE page, not just the buy column: the price chart's stepper sits
        // in that column but the mobile buy bar is a fixed element at the page root, and both need
        // the same quantity and the same variant. Client component, server-rendered children.
        <ProductSelectionProvider
          variants={product.variants}
          productMinimumOrderQuantity={product.minimumOrderQuantity}
        >
          <div className="mx-auto w-full max-w-md pb-40 md:max-w-2xl md:pb-24 lg:max-w-6xl lg:pb-12">
            <CategoryBreadcrumb categoryTrail={product.categoryTrail} />

            {/* lg+: two-column PDP — sticky media gallery left, buy box right. Below lg these
                wrappers are style-less blocks, so the mobile flow and DOM order stay as before. */}
            <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
              {/* Gallery column — sticks just under the 56px navbar while the buy column scrolls */}
              <div className="lg:sticky lg:top-16">
                <ProductImageGallery images={product.images} alt={product.title} />

                {/* Shown only when the seller actually uploaded a 360 asset. `mediaKind` is what
                    makes that expressible; the mock printed this banner over eight flat photos. */}
                {product.images.some((image) => image.mediaKind === "spin_360") && (
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
                )}
              </div>

              {/* Buy column */}
              <div className="min-w-0">
                {/* Title leads the buy box at lg (enterprise convention); mobile keeps the variant
                    picker first — order utilities only bite at lg. */}
                <div className="lg:flex lg:flex-col">
                  <div className="lg:order-2">
                    <VariantPicker currency={product.currency} />
                  </div>

                  <div className="space-y-1 px-4 pt-2 lg:order-1 lg:px-6">
                    {/* The SELLER, not a brand line. This used to point at a category slug, which
                        made the one link a buyer uses to vet a supplier go somewhere else. */}
                    <Link
                      href={`/store/organizations/${product.seller.slug}`}
                      className="text-xs font-medium tracking-wide text-[#2A76FD]"
                    >
                      {product.seller.displayName}
                    </Link>
                    <h1 className="text-sm font-medium tracking-tight">{product.title}</h1>
                    {/* A null average is "not rated yet", never a zero and never an invented 4.8. */}
                    {product.reviewMetrics.averageRating !== null && (
                      <div className="flex items-center gap-2 pt-1">
                        <RatingBadge value={product.reviewMetrics.averageRating.toFixed(1)} />
                        <p className="text-sm font-medium tracking-tight text-[#6F7979]">
                          {product.reviewMetrics.reviewCount.toLocaleString("en-US")}{" "}
                          {product.reviewMetrics.reviewCount === 1 ? "review" : "reviews"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <EngagementBar
                  productSlug={product.publicSlug}
                  initialEngagement={product.engagement}
                />

                <PriceChart
                  productPricingTiers={product.pricingTiers}
                  currency={product.currency}
                />

                <SamplePrice
                  productId={product.id}
                  samplePolicy={product.samplePolicy}
                  samplePriceInCents={product.samplePriceInCents}
                  currency={product.currency}
                  hasVariants={product.hasVariants}
                  isViewerSignedIn={isViewerSignedIn}
                />

                <CustomizationOptions options={product.customizationOptions} />

                <DeliverTo isViewerSignedIn={isViewerSignedIn} />

                <DeliveryCost productSlug={product.publicSlug} />

                <PackagingAndDelivery
                  packaging={product.packaging}
                  pricingTiers={product.pricingTiers}
                  leadTimeMinDays={product.leadTimeMinDays}
                  leadTimeMaxDays={product.leadTimeMaxDays}
                />

                {/* Desktop inline CTAs — replace the fixed bottom bar at lg+ */}
                <div className="hidden px-6 py-3 lg:block">
                  <BuyActionButtons
                    productId={product.id}
                    productSlug={product.publicSlug}
                    hasVariants={product.hasVariants}
                    sellingState={product.sellingState}
                    isViewerSignedIn={isViewerSignedIn}
                  />
                </div>
              </div>
            </div>

            <ProductDetailsSection product={product} />

            {product.builtInTheOpen !== null && <BuiltInTheOpen venture={product.builtInTheOpen} />}

            <SimilarAndCompare product={product} companionGroups={companionGroups} />

            {storefront !== null && <CompanyDetailsSection storefront={storefront} />}

            <StoreAndChatActions
              productId={product.id}
              sellerSlug={product.seller.slug}
              sellerDisplayName={product.seller.displayName}
              contactAffordance={product.contactAffordance}
            />

            <ProductHighlights highlights={product.highlights} />

            <RatingsAndReviews productSlug={product.publicSlug} initialPage={reviewsPage} />

            {/* The anchor `store-and-chat-actions.tsx` sends an `ask_question` caller to. */}
            <div id="product-questions">
              <QuestionsAndAnswers
                productSlug={product.publicSlug}
                initialPage={questionsPage}
                contactAffordance={product.contactAffordance}
              />
            </div>

            <div className="flex justify-center px-4 py-3 lg:px-6">
              <Link
                href="/store/report"
                className="flex items-center gap-1 text-xs font-medium text-[#6F7979]"
              >
                <Icon
                  src="flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  size={16}
                  className="opacity-70"
                />
                Report abuse
              </Link>
            </div>

            {/* Sticky action bar — sits above the mobile bottom nav (md:hidden adds its ~80px
                height); on md+ there is no bottom nav so it drops to 0. Hidden at lg+ where the buy
                column shows the CTAs inline. */}
            <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md bg-white px-4 py-2 md:bottom-0 lg:hidden">
              <BuyActionButtons
                productId={product.id}
                productSlug={product.publicSlug}
                hasVariants={product.hasVariants}
                sellingState={product.sellingState}
                isViewerSignedIn={isViewerSignedIn}
              />
            </div>
          </div>
        </ProductSelectionProvider>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
