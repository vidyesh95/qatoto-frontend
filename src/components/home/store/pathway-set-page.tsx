// TRANSPORT: server-fetch — awaits `getStorePathway` and branches on the result.
//
// `/store/pathways/[pathwaySlug]`. Replaces the mock `/store/pathway/[id]`, which rendered a flat
// `items[]` and a "Buy complete set · N items" link straight to `/cart` with no bundle add.
//
// HONEST DEGRADATION IS THE WHOLE POINT OF THIS PAGE (§15.6).
//
// The old shape could not express an incomplete set: a member that stopped being eligible simply
// vanished, so a five-piece look rendered as three pieces and LOOKED COMPLETE. For a rail that is
// correct — a shorter rail is still a rail. For a set it is a lie, because the buyer believes they
// are seeing the whole kit and will find out at checkout.
//
// So three rules are enforced here rather than hoped for:
//
//  1. AN UNFILLABLE REQUIRED SLOT STILL RENDERS, with its reason. An absent slot and a slot with
//     nothing in it are different facts and only the second is true.
//  2. THE WHOLE-SET CTA IS DISABLED WHEN `completeness.isComplete` IS FALSE. It reads "3 of 5
//     pieces available" and refuses rather than seeding a cart that is quietly short a piece.
//  3. THERE IS NO SINGLE SET TOTAL. `currencyTotals` is rendered as one line per currency, with the
//     slot count each covers. A kit sourced from three countries has three totals, and adding them
//     would invent an FX rate the platform has not quoted.

import { notFound } from "next/navigation";

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import PathwaySlotList from "@/components/home/store/sections/pathway-slot-list";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import Image from "next/image";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { formatCentsLabel, formatCountLabel } from "@/lib/store/format";
import { accentSurfaceClass } from "@/lib/store/labels";
import { getStorePathway } from "@/lib/store/merchandising.api";
import type { StorePathwaySet } from "@/lib/store/merchandising.schemas";

type PathwaySetViewState =
  | { status: "error"; message: string }
  | { status: "ready"; set: StorePathwaySet };

export default async function PathwaySetPage({
  pathwaySlug,
  searchParams,
}: {
  pathwaySlug: string;
  searchParams: RawSearchParams;
}) {
  const requestedCursor = readSingleParam(searchParams, "cursor");
  const result = await getStorePathway(pathwaySlug, { cursor: requestedCursor });

  if (!result.success && result.error.code === "404") notFound();

  const viewState: PathwaySetViewState = result.success
    ? { status: "ready", set: result.data }
    : { status: "error", message: result.error.message };

  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 py-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready": {
      const { pathway, slots, currencyTotals, completeness, page } = viewState.set;

      return (
        <div className="pb-10">
          <div className={`relative aspect-[16/7] w-full ${accentSurfaceClass(pathway.accent)}`}>
            {pathway.heroImageUrl !== null && (
              <Image
                src={pathway.heroImageUrl}
                fill
                sizes="100vw"
                priority
                alt={pathway.title}
                className="object-cover"
              />
            )}
          </div>

          <header className="px-4 pt-4 lg:px-6">
            <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
              {pathway.title}
            </h1>
            {pathway.summary !== null && (
              <p className="mt-1 text-sm leading-5 text-[#6F7979]">{pathway.summary}</p>
            )}
          </header>

          {/* An anchored set says what it is built around, and shows it. The slots here were
              RESOLVED from the relation graph against this product rather than typed by a
              merchandiser, and that provenance is why the pieces belong together. */}
          {pathway.anchorProduct !== null && (
            <section aria-label="Built around" className="px-4 pt-4 lg:px-6">
              <p className="pb-2 text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979] uppercase">
                Built around
              </p>
              <div className="max-w-56">
                <CatalogProductCard product={pathway.anchorProduct} />
              </div>
            </section>
          )}

          <SetSummary
            completeness={completeness}
            currencyTotals={currencyTotals}
            pathwayTitle={pathway.title}
          />

          <PathwaySlotList slots={slots} />

          <CursorPageControl
            nextCursor={page.nextCursor}
            hasMore={page.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more pieces"
          />
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function SetSummary({
  completeness,
  currencyTotals,
  pathwayTitle,
}: {
  completeness: StorePathwaySet["completeness"];
  currencyTotals: StorePathwaySet["currencyTotals"];
  pathwayTitle: string;
}) {
  return (
    <section aria-label={`Cost and availability for ${pathwayTitle}`} className="px-4 pt-5 lg:px-6">
      <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        {/* ONE LINE PER CURRENCY, each stating how many slots it covers. A subtotal over 3 of 5
            slots is not the price of the set, and the slot count beside it is what stops it reading
            as one. `formatCurrencyTotalsLabel` exists for a compact join; here the slot counts
            matter enough to earn their own rows. */}
        {currencyTotals.length === 0 ? (
          <p className="text-sm leading-5 text-[#6F7979]">
            Nothing in this set can be priced right now.
          </p>
        ) : (
          <dl className="space-y-1">
            {currencyTotals.map((total) => (
              <div key={total.currency} className="flex items-baseline justify-between gap-4">
                <dt className="text-xs leading-4 text-[#6F7979]">
                  {formatCountLabel(total.slotCount)} {total.slotCount === 1 ? "piece" : "pieces"}{" "}
                  in {total.currency}
                </dt>
                <dd className="text-sm leading-5 font-medium text-[#191C1C]">
                  {formatCentsLabel(total.subtotalInCents, total.currency)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {currencyTotals.length > 1 && (
          <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
            These are separate subtotals, not a sum. The pieces are priced by different sellers in
            different currencies, and Qatoto does not convert between them.
          </p>
        )}

        <div className="mt-3 border-t border-[#CAC4D0]/60 pt-3">
          {completeness.isComplete ? (
            <>
              <button
                type="button"
                className="w-full rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white"
              >
                Add all {formatCountLabel(completeness.slotCount)} pieces to cart
              </button>
              <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
                Adds one chosen piece per required slot at the quantity the set asks for. Nothing is
                ordered until you check out.
              </p>
            </>
          ) : (
            <>
              {/* DISABLED, not hidden, and it says why. Seeding a cart from an incomplete set would
                  hand the buyer a basket quietly short a piece they believe they bought. */}
              <button
                type="button"
                disabled
                className="w-full rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {completeness.filledRequiredSlotCount} of {completeness.requiredSlotCount} required
                pieces available
              </button>
              <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
                This set cannot be bought whole right now. You can still add the available pieces
                individually below.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
