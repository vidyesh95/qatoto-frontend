// TRANSPORT: client-query — reads the services the viewer arranged for this order; the rest is
// the order's Incoterm it was handed and directory links.
"use client";

// Cargo insurance, lab testing and warehousing: where to find a provider, how to ask for quotes FOR
// this order, and the services the viewer has already arranged for it. What a party says it arranged
// on its own lives beside this, in `order-third-party-declarations-panel.tsx`.
//
// RENDERED OUTSIDE `OrderFulfillmentPanel`, ON PURPOSE. Pre-shipment testing and pre-dispatch cover
// happen before anything moves, and this has to be visible then.
//
// THE DIRECTORY LINKS CARRY NO `orderId`. `GET /store/providers` is `.strict()` and has no order
// param. The link that does carry the order is "Request quotes for this order", which opens the RFQ
// composer with `?relatedOrderId=` — the backend checks the viewer is a party to the order, and an
// accepted quote opens its OWN order that links back here.
//
// THE DESTINATION IS LINKED, BESIDE THE UNFILTERED LINK AND NEVER IN PLACE OF IT. When the order
// names a delivery country, the insurer and warehouse rows also link the directory filtered by
// `destinationCountryCode` — the providers with a coverage lane naming that country or naming none
// ("any country"). The unfiltered link stays because a provider that declared NO lanes is not in
// the filtered list at all. Testing gets no filtered link: pre-shipment testing happens where the
// goods are, not where they are going.
//
// LINKED SERVICES ARE THE VIEWER'S OWN. The backend returns only engagements the viewer's
// organization bought, so a buyer never sees the seller's insurer nor the reverse. Nothing here
// says how many the other party has, and nothing renders when the viewer has none.
//
// STORAGE COVER IS AN INSURER'S PRODUCT, NOT A FOURTH KIND. The insurers who write cargo cover also
// write stock-throughput and stock-in-storage policies, and a warehouse's own liability is limited by
// its storage terms — so the storage row links to `insurance_provider` again rather than inventing a
// `warehouse_insurance` kind the backend's pgEnum does not have. It pre-filters on the
// `goods_in_storage` cover type, which an insurer writing stock throughput is asked to tick as well
// (todo §23.4). An insurer that ticked nothing is not in that list, which the copy does not promise.
//
// ⚠️ THE NO-LIABILITY SENTENCES ARE THE LIABILITY POSITION, not boilerplate, and they live in the
// component rather than a footer for that reason. Do not trim them. Nothing here may say "insured",
// "certified", "verified" or "guaranteed" as a claim (STORE_STRUCTURE §18).

import Link from "next/link";

import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import { useOrderLinkedServiceEngagementsQuery } from "@/hooks/store/orders";
import { countryName } from "@/lib/countries";
import { SERVICE_ENGAGEMENT_STATE_LABELS } from "@/lib/store/fulfillment.schemas";

/**
 * The two Incoterms® 2020 rules that put the duty to insure on the seller.
 *
 * Exact match on the snapshot string, and every other value — including null and a term this list
 * does not know — renders no note. An Incoterm decides who is OBLIGED to insure; it does not decide
 * who MAY buy cover, which is why this is a note and never a gate.
 */
function isSellerInsuredIncoterm(incotermSnapshot: string | null): boolean {
  return incotermSnapshot === "CIF" || incotermSnapshot === "CIP";
}

/** The directory for one provider kind, narrowed to providers with a lane to the destination. */
function buildDestinationDirectoryHref(providerKind: string, deliveryCountryCode: string): string {
  const searchParams = new URLSearchParams({
    providerKind,
    destinationCountryCode: deliveryCountryCode,
  });
  return `/store/providers?${searchParams.toString()}`;
}

const SIGNPOST_LINK_CLASS =
  "text-xs leading-4 font-medium text-primary-imprint underline underline-offset-2 hover:text-foreground";

export default function OrderThirdPartyServiceSignposts({
  orderId,
  incotermSnapshot,
  deliveryCountryCode,
}: {
  orderId: string;
  incotermSnapshot: string | null;
  deliveryCountryCode: string | null;
}) {
  const destinationName = deliveryCountryCode === null ? null : countryName(deliveryCountryCode);

  return (
    <section
      aria-labelledby="order-third-party-services-heading"
      className="rounded-xl border border-border px-4 py-3"
    >
      <h3
        id="order-third-party-services-heading"
        className="text-sm leading-5 font-medium text-foreground"
      >
        Insurance, testing and storage
      </h3>
      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
        Arranged directly with a provider from the directory. A quote you accept becomes its own
        order. When you request it for this order, it is also listed here, for you only.
      </p>
      <Link
        href={`/store/rfqs/new?relatedOrderId=${encodeURIComponent(orderId)}`}
        className={`mt-2 inline-block ${SIGNPOST_LINK_CLASS}`}
      >
        Request quotes for this order
      </Link>

      <LinkedServiceEngagements orderId={orderId} />

      <ul className="mt-2 divide-y divide-border">
        <li className="space-y-1 py-3">
          <ProviderKindBadge providerKind="insurance_provider" isCompact />
          <p className="text-xs leading-4 text-muted-foreground">
            Qatoto does not underwrite, quote or hold a premium. You contract with the insurer
            directly, and nothing on this page means this order is covered.
          </p>
          {isSellerInsuredIncoterm(incotermSnapshot) && (
            <p className="text-xs leading-4 text-muted-foreground">
              Under {incotermSnapshot} (Incoterms® 2020) the seller arranges cargo insurance as part
              of this sale. Whether they did, and on what terms, is between buyer and seller —
              Qatoto holds no record of a policy.
            </p>
          )}
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link
              href="/store/providers?providerKind=insurance_provider"
              className={SIGNPOST_LINK_CLASS}
            >
              Find a cargo insurer
            </Link>
            {deliveryCountryCode !== null && (
              <Link
                href={buildDestinationDirectoryHref("insurance_provider", deliveryCountryCode)}
                className={SIGNPOST_LINK_CLASS}
              >
                Insurers listing {destinationName}
              </Link>
            )}
          </p>
        </li>

        <li className="space-y-1 py-3">
          <ProviderKindBadge providerKind="testing_certification_lab" isCompact />
          <p className="text-xs leading-4 text-muted-foreground">
            Qatoto does not test products, issue certificates or check reports. A test report says
            only what the laboratory that issued it says.
          </p>
          <Link
            href="/store/providers?providerKind=testing_certification_lab"
            className={SIGNPOST_LINK_CLASS}
          >
            Find a testing lab
          </Link>
        </li>

        <li className="space-y-1 pt-3">
          <ProviderKindBadge providerKind="warehouse_provider" isCompact />
          <p className="text-xs leading-4 text-muted-foreground">
            Qatoto does not store, hold or take custody of goods. A storage contract is between you
            and the warehouse.
          </p>
          <p className="text-xs leading-4 text-muted-foreground">
            A warehouse&apos;s own liability is usually limited by its storage terms, so goods in
            storage are normally covered by their owner under a stock or stock-throughput policy,
            arranged directly with an insurer.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link
              href="/store/providers?providerKind=warehouse_provider"
              className={SIGNPOST_LINK_CLASS}
            >
              Find a warehouse
            </Link>
            {deliveryCountryCode !== null && (
              <Link
                href={buildDestinationDirectoryHref("warehouse_provider", deliveryCountryCode)}
                className={SIGNPOST_LINK_CLASS}
              >
                Warehouses listing {destinationName}
              </Link>
            )}
            <Link
              href="/store/providers?providerKind=insurance_provider&coverageClass=goods_in_storage"
              className={SIGNPOST_LINK_CLASS}
            >
              Find an insurer for stored goods
            </Link>
          </p>
        </li>
      </ul>
    </section>
  );
}

/**
 * The services the viewer arranged for this order. Renders NOTHING while loading, on a refusal and
 * when there are none — an empty list is the ordinary state, and the order's own errors are already
 * shown by the panels that own them.
 */
function LinkedServiceEngagements({ orderId }: { orderId: string }) {
  const linkedEngagementsQuery = useOrderLinkedServiceEngagementsQuery(orderId);
  const result = linkedEngagementsQuery.data;
  if (result === undefined || !result.success || result.data.items.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs leading-4 font-medium text-foreground">
        Services you arranged for this order
      </p>
      <ul className="mt-1 space-y-1">
        {result.data.items.map((engagement) => (
          <li key={engagement.id}>
            {/* THE VIEWER IS THIS ENGAGEMENT'S BUYER — the backend returns no other — so the buyer
                route is the right one. */}
            <Link
              href={`/service-engagements/${encodeURIComponent(engagement.id)}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
            >
              <ProviderKindBadge providerKind={engagement.providerKind} isCompact />
              <span className="text-xs leading-4 text-foreground">{engagement.titleSnapshot}</span>
              <span className="text-xs leading-4 text-muted-foreground">
                {SERVICE_ENGAGEMENT_STATE_LABELS[engagement.state]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
