// TRANSPORT: props-only — renders the order's Incoterm it was handed and three directory links, no network.
//
// Cargo insurance, lab testing and warehousing, as SIGNPOSTS to the provider directory. Nothing here
// is a record of cover, a test result or a storage contract, because nothing in the backend stores
// one against an order: `commerce_order` and `commerce_shipment_leg` carry no such column, and a
// card that read "Attached" or "Optional" over a field no server sends is the control-with-no-
// backing-table that `docs/Design.md` §6 bans. The declaration write is todo.md §23.
//
// RENDERED OUTSIDE `OrderFulfillmentPanel`, ON PURPOSE. The fulfillment read 404s until something
// ships, and pre-shipment testing and pre-dispatch cover are exactly that window — mounted inside the
// panel's success branch this would never show when it is useful.
//
// NO `orderId` IN ANY LINK. `GET /store/providers` is `.strict()` and has no order param, and an RFQ
// carries no order link: accepting a quote creates its OWN order. A `?orderId=` here would read as a
// connection that does not exist, so the copy says where an accepted quote ends up instead.
//
// STORAGE COVER IS AN INSURER'S PRODUCT, NOT A FOURTH KIND. The insurers who write cargo cover also
// write stock-throughput and stock-in-storage policies, and a warehouse's own liability is limited by
// its storage terms — so the storage row links to `insurance_provider` again rather than inventing a
// `warehouse_insurance` kind the backend's pgEnum does not have. The directory cannot filter by
// coverage class yet, so that link promises an insurer, not storage-specific results.
//
// ⚠️ THE NO-LIABILITY SENTENCES ARE THE LIABILITY POSITION, not boilerplate, and they live in the
// component rather than a footer for that reason. Do not trim them. Nothing here may say "insured",
// "certified", "verified" or "guaranteed" as a claim (STORE_STRUCTURE §18).

import Link from "next/link";

import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";

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

const SIGNPOST_LINK_CLASS =
  "text-xs leading-4 font-medium text-primary-imprint underline underline-offset-2 hover:text-foreground";

export default function OrderThirdPartyServiceSignposts({
  incotermSnapshot,
}: {
  incotermSnapshot: string | null;
}) {
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
        Arranged directly with a provider from the directory. A quote you accept there becomes its
        own order and is tracked on that order, not this one.
      </p>

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
          <Link
            href="/store/providers?providerKind=insurance_provider"
            className={SIGNPOST_LINK_CLASS}
          >
            Find a cargo insurer
          </Link>
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
            <Link
              href="/store/providers?providerKind=insurance_provider"
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
