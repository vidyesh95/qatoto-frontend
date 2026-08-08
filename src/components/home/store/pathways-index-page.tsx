// TRANSPORT: server-fetch — awaits `listStorePathways` and branches on the result.
//
// `/store/pathways`. The store home's "Pathways for you" rail pointed here and the route did not
// exist.
//
// A PATHWAY IS A SET, NOT A RAIL, and the copy on this page has to carry that. A rail ranks products
// that happen to be good and the buyer picks one; a pathway's members relate to each other and the
// buyer's intent is the whole thing. In this market that reads as multi-SKU kit sourcing —
// "everything to fit out a hotel room" — which is exactly what single-SKU search is worst at: a buyer
// who knows the kit but not the part numbers cannot express it as a query and today runs one search
// per line.
//
// `cardImageUrl` IS REAL NOW. `store_pathway` had no image column until Phase 9, which is why the old
// mock synthesised a local placeholder banner per slug. A card with no image gets its accent tint
// rather than a fabricated one.

import Image from "next/image";
import Link from "next/link";

import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { accentSurfaceClass } from "@/lib/store/labels";
import { listStorePathways } from "@/lib/store/merchandising.api";
import type { StorePathwayCard } from "@/lib/store/merchandising.schemas";

type PathwayIndexViewState =
  | { status: "error"; message: string }
  | { status: "empty" }
  | {
      status: "ready";
      pathways: StorePathwayCard[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export default async function PathwaysIndexPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const requestedCursor = readSingleParam(searchParams, "cursor");
  const result = await listStorePathways({ cursor: requestedCursor });

  const viewState: PathwayIndexViewState = !result.success
    ? { status: "error", message: result.error.message }
    : result.data.items.length === 0
      ? { status: "empty" }
      : {
          status: "ready",
          pathways: result.data.items,
          nextCursor: result.data.page.nextCursor,
          hasMore: result.data.page.hasMore,
        };

  return (
    <div className="pb-8">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">Pathways</h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          Sourcing sets rather than single listings — everything one job needs, priced per piece and
          added to your cart together.
        </p>
      </header>

      {renderPathwayIndex(viewState, searchParams)}
    </div>
  );
}

function renderPathwayIndex(viewState: PathwayIndexViewState, searchParams: RawSearchParams) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "empty":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreEmptyPanel message="No pathways are published yet." />
        </div>
      );
    case "ready":
      return (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
            {viewState.pathways.map((pathway) => (
              <PathwayCard key={pathway.id} pathway={pathway} />
            ))}
          </div>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more pathways"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function PathwayCard({ pathway }: { pathway: StorePathwayCard }) {
  return (
    <Link
      href={`/store/pathways/${pathway.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#CAC4D0]/60 transition-colors hover:border-[#2A76FD]"
    >
      {/* No image falls back to the accent tint — a real server-owned token mapped to classes on
          this side, never a class name from the API. */}
      <div
        className={`relative aspect-video w-full overflow-hidden ${accentSurfaceClass(pathway.accent)}`}
      >
        {pathway.cardImageUrl !== null && (
          <Image
            src={pathway.cardImageUrl}
            fill
            sizes="(min-width: 1024px) 380px, 90vw"
            alt={pathway.title}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] leading-4 font-medium tracking-[0.4px] text-[#6F7979]">
            {pathway.slotCount} {pathway.slotCount === 1 ? "piece" : "pieces"}
          </span>
          {/* One model, two shapes. An anchored set's slots were RESOLVED from the relation graph
              against one product rather than typed by a merchandiser, and saying so tells the buyer
              why these pieces are here. */}
          {pathway.isAnchored && (
            <span className="rounded bg-[#F2F4F4] px-1.5 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]">
              Built around one product
            </span>
          )}
        </div>

        <p className="text-sm leading-5 font-medium text-[#191C1C]">{pathway.title}</p>

        {pathway.summary !== null && (
          <p className="line-clamp-2 text-xs leading-4 text-[#6F7979]">{pathway.summary}</p>
        )}
      </div>
    </Link>
  );
}
