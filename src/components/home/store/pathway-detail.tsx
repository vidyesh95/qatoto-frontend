// TRANSPORT: server-fetch

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchStorePathway, fetchStorePathways } from "@/lib/store/catalog.api";
import { toStoreDetailViewState } from "@/lib/store/view-state";
import MerchandisingItemCard from "@/components/home/store/cards/merchandising-item-card";
import PathwaysRail from "@/components/home/store/rails/pathways-rail";
import StoreStatusPanel from "@/components/home/store/sections/store-status-panel";
import { mockPathwayBannerForSlug } from "@/mocks/store-mocks";

/**
 * One curated pathway — the "buy the look" page.
 *
 * Its items are `MerchandisingItemProjection`s — products or provider offerings — not a bespoke
 * pathway-item shape, so the same discriminated union that fills a home rail fills this grid, in
 * the badge-and-plus `pathway` variant.
 *
 * The banner image is the ONE mock thing here: a pathway carries title, summary and an accent
 * token on the wire and no image at all.
 *
 * The "more pathways" rail reads `/store/pathways` rather than pulling the whole store home just
 * to reach the same list.
 */
export default async function PathwayDetail({ slug }: { slug: string }) {
  if (slug === "__none__") notFound();
  const [pathwayResult, pathwayListResult] = await Promise.all([
    fetchStorePathway(slug),
    fetchStorePathways(),
  ]);
  const viewState = toStoreDetailViewState(pathwayResult);

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
      const { pathway, items } = viewState.data;
      // A failed sibling read hides the rail; it never blanks the page.
      const otherPathways = pathwayListResult.success
        ? pathwayListResult.data.items.filter((entry) => entry.slug !== pathway.slug)
        : [];

      return (
        <div className="space-y-8 pb-8">
          {/*
            Hero of the complete look. The image is LOCAL — a pathway carries no image on the wire
            (STORE_STRUCTURE §5.6) — while the title and summary overlaid on it are the server's.
          */}
          <div className="relative mx-auto aspect-video w-full overflow-hidden bg-gray-100 lg:aspect-auto lg:h-100 lg:w-177.75">
            <Image
              src={mockPathwayBannerForSlug(pathway.slug)}
              fill
              sizes="(min-width: 1024px) 710px, 100vw"
              className="object-cover object-center"
              loading="eager"
              alt={pathway.title}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-4 lg:left-6">
              <h1 className="text-3xl font-semibold text-white">{pathway.title}</h1>
              {pathway.summary ? <p className="text-sm text-white/85">{pathway.summary}</p> : null}
            </div>
          </div>

          {/*
            Buy-the-set CTA. Points at /cart, which is still a heading-only page — the cart write
            (`PUT /commerce/cart/items/:productId`) is Phase 4 and this surface does not call it.
          */}
          {items.length > 0 ? (
            <div className="px-4 lg:px-6">
              <Link
                href="/cart"
                className="flex items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Buy complete set · {items.length} items
              </Link>
            </div>
          ) : null}

          <section className="space-y-3 px-4 lg:px-6">
            <h2 className="text-lg font-medium tracking-wide">Items in this pathway</h2>
            {items.length === 0 ? (
              <p className="text-sm text-foreground/70">
                No eligible items in this pathway right now.
              </p>
            ) : (
              <div className="flex flex-wrap items-stretch gap-3">
                {items.map((item, itemIndex) => (
                  <MerchandisingItemCard
                    key={`${item.entityKind}-${item.entityId}`}
                    item={item}
                    accentIndex={itemIndex}
                    variant="pathway"
                  />
                ))}
              </div>
            )}
          </section>

          {otherPathways.length > 0 ? <PathwaysRail pathways={otherPathways} /> : null}
          <div className="px-4 lg:px-6">
            <Link href="/store" className="text-sm font-medium text-[#00696E]">
              Back to store
            </Link>
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
