import type { Metadata } from "next";

import RfqComposer, {
  type RfqGoodsLineSeed,
  type RfqServiceLineSeed,
} from "@/components/home/store/composers/rfq-composer";
import { getStoreProduct } from "@/lib/store/products.api";
import type { StoreProductDetail } from "@/lib/store/products.schemas";
import { getStoreServiceOffering } from "@/lib/store/providers.api";
import type { PublicServiceOffering } from "@/lib/store/providers.schemas";

// Permanently dynamic: session-scoped and behind a BUYER organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "New request for quotation",
  description: "Ask providers to quote on Qatoto",
};

/**
 * The buyer's own words for what they want, seeded from a listing's spec sheet.
 *
 * `requestedSpecificationSnapshot` is REQUIRED by the composer's builder, so a product with no
 * specifications and no description seeds it blank and the buyer types it — which is the honest
 * outcome. Inventing a sentence here would put words in a commercial request that nobody wrote.
 *
 * The seller's free-text `group` is deliberately dropped: it organises a spec SHEET into tabs, and
 * flattening it into a request line would read as part of the requirement.
 */
function buildSpecificationSnapshot(product: StoreProductDetail): string {
  const specificationLines = product.specifications
    .toSorted((first, second) => first.position - second.position)
    .map((specification) => `${specification.key}: ${specification.value}`);
  if (specificationLines.length > 0) return specificationLines.join("\n");
  return product.description ?? "";
}

function buildGoodsLineSeed(product: StoreProductDetail): RfqGoodsLineSeed {
  return {
    productId: product.id,
    requestedTitle: product.title,
    requestedSpecificationSnapshot: buildSpecificationSnapshot(product),
    // The seller's own minimum is the sensible starting quantity for a request about their
    // listing. Null means unstated, and an unstated minimum is not "one" — the buyer says.
    quantity: product.minimumOrderQuantity === null ? "" : String(product.minimumOrderQuantity),
    // `unitOfMeasure` is the seller's word for one unit. Blank when unstated rather than "piece",
    // which would be this page deciding what the seller sells in.
    unitLabel: product.unitOfMeasure ?? "",
  };
}

/**
 * A first service line, seeded from the offering the buyer came from.
 *
 * ⚠️ ONLY THREE FIELDS, AND THE TYPED REQUIREMENT IS NOT ONE OF THEM. The offering's `detail`
 * describes what the PROVIDER offers — its lanes, its modes, its capacities. A requirement
 * describes what the BUYER needs to move. Copying the first into the second would have this page
 * write the buyer's requirement for them, which is the same mistake as seeding a quantity from a
 * `minimumOrderQuantity` the seller never stated.
 *
 * `summary` IS DELIBERATELY UNUSED for the same reason: it is the provider's pitch, not a
 * statement of need. The title is a label the buyer will recognise as where they came from; the
 * pitch would read as though they had asked for it.
 */
function buildServiceLineSeed(offering: PublicServiceOffering): RfqServiceLineSeed {
  return {
    serviceOfferingId: offering.offering.id,
    // The buyer chose a provider kind by opening this page; the control stays editable regardless.
    providerKind: offering.offering.providerKind,
    requirementSummary: offering.offering.title,
  };
}

/**
 * NO `generateStaticParams` HERE — this route has no dynamic segment.
 *
 * It sits under `/store/rfqs/`, where a sibling `[rfqId]` exists. Routing precedence within one directory puts
 * static above `[param]`, so `new` reaches this file and is never captured as an RFQ id.
 *
 * ⚠️ A BAD `?productSlug=` OR `?offeringSlug=` RENDERS AN EMPTY COMPOSER, IT DOES NOT 404. The
 * slug is a convenience for arriving from a product or an offering page, not this page's identity
 * — a buyer who wants to raise a request from scratch reaches the same screen, and a stale or
 * mistyped link should leave them composing rather than at a not-found page. Both reads answer 404
 * for a typo AND for a listing that is merely not visible, so the two are indistinguishable here
 * by design.
 *
 * BOTH PARAMS ARE ACCEPTED TOGETHER, because an RFQ may be goods, services, or both — which is
 * what the composer's own copy tells the buyer. Nothing currently links here with both, but
 * refusing the combination would be this route inventing a rule the request model does not have.
 */
export default async function NewRfqRoute({
  searchParams,
}: {
  searchParams: Promise<{ productSlug?: string | string[]; offeringSlug?: string | string[] }>;
}) {
  const { productSlug, offeringSlug } = await searchParams;
  const requestedProductSlug = Array.isArray(productSlug) ? productSlug[0] : productSlug;
  const requestedOfferingSlug = Array.isArray(offeringSlug) ? offeringSlug[0] : offeringSlug;

  let seededGoodsLine: RfqGoodsLineSeed | null = null;
  if (requestedProductSlug !== undefined && requestedProductSlug.length > 0) {
    const productResult = await getStoreProduct(requestedProductSlug);
    if (productResult.success) seededGoodsLine = buildGoodsLineSeed(productResult.data);
  }

  let seededServiceLine: RfqServiceLineSeed | null = null;
  if (requestedOfferingSlug !== undefined && requestedOfferingSlug.length > 0) {
    const offeringResult = await getStoreServiceOffering(requestedOfferingSlug);
    if (offeringResult.success) seededServiceLine = buildServiceLineSeed(offeringResult.data);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <RfqComposer seededGoodsLine={seededGoodsLine} seededServiceLine={seededServiceLine} />
    </div>
  );
}
