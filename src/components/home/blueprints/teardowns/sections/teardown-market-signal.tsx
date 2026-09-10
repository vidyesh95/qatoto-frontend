// TRANSPORT: props-only — the signal is assembled by `getTeardownMarketSignal` in
// `@/lib/blueprints/api` and handed down. This component joins nothing and counts nothing.

import Link from "next/link";

import type { TeardownMarketSignal } from "@/lib/blueprints/api";
import { buildBlueprintHref } from "@/lib/blueprints/schemas";
import { formatCentsLabel } from "@/lib/store/format";

/**
 * DOES ANYBODY WANT THE THING — the half of the pitch a teardown cannot make on its own.
 *
 * The argument for building a known product rather than an invention is that the demand question
 * is already settled: somebody is selling this, at a price, today. A teardown that shows a founder
 * a bill of materials and nothing about the market has handed them half a decision.
 *
 * ⚠️ ATTENTION IS NOT DEMAND, AND THE COUNTS ON THIS ROW ARE NOT IN HERE. `viewCount`, `likeCount`
 * and `saveCount` sit a few hundred pixels up the page and are deliberately excluded: forty
 * thousand people reading a teardown is forty thousand people reading a teardown. What counts is
 * somebody having listed the product for sale, or somebody having shipped a build from these files.
 *
 * ⚠️ NO SIGNAL SUPPRESSES THE WHOLE BLOCK, and the getter returns `null` rather than an empty pair
 * so this component cannot get it wrong. There is no "No builds yet", no "No listings" and no empty
 * card. That is `docs/PRODUCT.md` Principle 2 applied at the section level, and here it is stronger
 * than usual: an empty state would read as a VERDICT on the product, and a founder does not need a
 * page of fixtures telling them nobody wants a thing.
 *
 * ⚠️ EACH HALF SUPPRESSES INDEPENDENTLY. A teardown with listings and no builds renders the
 * listings alone; the fixtures carry one of each so neither branch ships unexercised.
 *
 * THE TWO HALVES ARE RANKED, NOT BALANCED. Listings are the primary signal because a price somebody
 * is asking is the strongest evidence this codebase holds; a showcase is evidence of feasibility as
 * much as of demand, so it reads second and quieter.
 *
 * NOT A CARD GRID. Two hairline lists under one heading — `docs/Design.md` §6 bans the repeated
 * icon-and-heading card, and two lists of three rows is exactly the content that keeps getting
 * built as six identical boxes.
 */
export default function TeardownMarketSignalBand({
  marketSignal,
  productClassLabel,
}: {
  readonly marketSignal: TeardownMarketSignal;
  /** The class the listings belong to. `null` when the publisher did not place the subject. */
  readonly productClassLabel: string | null;
}) {
  return (
    <section className="mt-8 max-w-2xl" aria-labelledby="teardown-market-signal">
      <h2 id="teardown-market-signal" className="text-sm font-medium text-foreground">
        Who is already selling and building this
      </h2>

      {marketSignal.storeListings.length === 0 ? null : (
        <>
          <h3 className="mt-3 text-[11px] font-medium tracking-[0.5px] text-muted-foreground uppercase">
            {/*
              THE CLASS IS NAMED, because "3 listings" without saying of what is a number a reader
              cannot check — and checking is the entire posture of this product.
            */}
            On the Qatoto store{productClassLabel === null ? "" : `, ${productClassLabel}`}
          </h3>
          <ul className="mt-1">
            {marketSignal.storeListings.map((listing) => (
              <li
                key={listing.productSlug}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-black/5 py-2"
              >
                <Link
                  href={`/store/product/${listing.productSlug}`}
                  className="text-sm font-medium text-foreground transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                >
                  {listing.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {listing.organizationDisplayName}
                  {/*
                    A PRICE AND ITS CURRENCY TRAVEL TOGETHER — the contract refuses one without the
                    other — so a quote-only listing prints its seller and nothing else. No "POA", no
                    dash, no invented band.
                  */}
                  {listing.priceInCents === null || listing.currency === null
                    ? null
                    : ` · ${formatCentsLabel(listing.priceInCents, listing.currency)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {marketSignal.showcases.length === 0 ? null : (
        <>
          <h3 className="mt-4 text-[11px] font-medium tracking-[0.5px] text-muted-foreground uppercase">
            Built from this teardown
          </h3>
          <ul className="mt-1">
            {marketSignal.showcases.map((showcase) => (
              <li
                key={showcase.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-black/5 py-2"
              >
                <Link
                  href={buildBlueprintHref(showcase)}
                  className="text-sm font-medium text-foreground transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
                >
                  {showcase.title}
                </Link>
                <span className="text-xs text-muted-foreground">{showcase.author.displayName}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-3 max-w-prose text-xs text-muted-foreground">
        Listings and builds are the only demand evidence on this page. Views, likes and saves are
        attention, and attention is not a market.
      </p>
    </section>
  );
}
