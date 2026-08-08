// TRANSPORT: server-fetch — awaits `getStoreRail` and branches on the result.
//
// `/store/rails/[railSlug]`. The "see all" target behind every rail on the store home, which pointed
// at `/store/feed/<id>` — a route that never existed.
//
// AN EMPTY RAIL IS NOT AN ERROR, and this page is where that has to be true. `trending_placeholder`
// returns an EMPTY LIST unconditionally and always will: it is kept forever so that backing the
// ranking engine out stays a per-rail data edit rather than a deploy. A rail carrying it is healthy
// and renders as empty.
//
// The strategy is also NOT a promise about ordering the client may re-apply. Ranking runs in
// Postgres; this page renders the page it was handed, in the order it arrived.

import { notFound } from "next/navigation";

import MerchandisingItemCard from "@/components/home/store/cards/merchandising-item-card";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { RAIL_STRATEGY_LABELS } from "@/lib/store/labels";
import { getStoreRail } from "@/lib/store/merchandising.api";
import type { StoreRailPage } from "@/lib/store/merchandising.schemas";
import { RAIL_STRATEGIES, type RailStrategy } from "@/lib/store/shared.schemas";

type RailViewState =
  | { status: "error"; message: string }
  | { status: "ready"; railPage: StoreRailPage };

/**
 * The strategy caption, when the strategy is one this client knows.
 *
 * A plain string on the wire, so an unrecognised strategy yields no caption rather than failing —
 * the same forward-compatibility every `.strip()` buys. The narrowing is a `find` over the known
 * tuple rather than a cast, so nothing here asserts anything about the network.
 */
function railStrategyCaption(strategy: string): string | null {
  const knownStrategy: RailStrategy | undefined = RAIL_STRATEGIES.find(
    (candidate) => candidate === strategy,
  );
  if (knownStrategy === undefined) return null;
  const caption = RAIL_STRATEGY_LABELS[knownStrategy];
  return caption === "" ? null : caption;
}

export default async function RailPage({
  railSlug,
  searchParams,
}: {
  railSlug: string;
  searchParams: RawSearchParams;
}) {
  const requestedCursor = readSingleParam(searchParams, "cursor");
  const result = await getStoreRail(railSlug, { cursor: requestedCursor });

  if (!result.success && result.error.code === "404") notFound();

  const viewState: RailViewState = result.success
    ? { status: "ready", railPage: result.data }
    : { status: "error", message: result.error.message };

  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 py-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready": {
      const { rail, items, page } = viewState.railPage;
      const strategyCaption = railStrategyCaption(rail.strategy);

      return (
        <div className="pb-8">
          <header className="px-4 pt-4 lg:px-6">
            <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
              {rail.title}
            </h1>
            {strategyCaption !== null && (
              <p className="mt-1 text-sm leading-5 text-[#6F7979]">{strategyCaption}</p>
            )}
          </header>

          {items.length === 0 ? (
            <div className="px-4 pt-6 lg:px-6">
              {/* The EMPTY panel, not the error panel and not the filtered one. This rail accepts no
                  filters, and an empty ranked rail is a normal state rather than a fault. */}
              <StoreEmptyPanel message="Nothing is in this rail right now." />
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4 lg:px-6">
                {items.map((item) => (
                  // `entityKind` plus `entityId` is the identity: two arms could carry the same
                  // underlying id for different entities, so neither alone is a safe key.
                  <MerchandisingItemCard key={`${item.entityKind}-${item.entityId}`} item={item} />
                ))}
              </div>
              <CursorPageControl
                nextCursor={page.nextCursor}
                hasMore={page.hasMore}
                buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
                label="Show more"
              />
            </>
          )}
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
