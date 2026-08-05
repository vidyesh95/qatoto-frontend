// TRANSPORT: server-fetch — three parallel reads with the caller's cookie forwarded, then the
// whole feed rendered from them. The only fetching component on the homepage below the promo.
//
// ONE REQUEST FOR THE RANKED GRID. Recommended, Explore and the filtered grid all come out of
// a single `GET /feed/videos` page — the split is `splitFeedPage`, not a second call.
// Spotlight is a SEPARATE curated read (`GET /spotlight/videos`), set by admins — not
// `mode=trending&limit=3`.
//
// EACH READ IS LIFTED INTO ITS OWN VIEW STATE so one failure does not blank the others: a
// `/feed/categories` outage must still leave a working video grid, and a feed outage must
// still leave a working chip row.

import Filter from "@/components/home/feed/filter";
import CategoryTilesSection from "@/components/home/feed/category-tiles-section";
import ExploreSection from "@/components/home/feed/explore-section";
import {
  describeFeedError,
  FeedErrorPanel,
  FeedSignInRequiredPanel,
} from "@/components/home/feed/feed-status-panel";
import FilteredFeed from "@/components/home/feed/filtered-feed";
import RecommendedSection from "@/components/home/feed/recommended-section";
import SpotlightSection from "@/components/home/feed/spotlight-section";
import { listFeedCategories, listFeedVideos } from "@/lib/feed/api";
import { isDefaultFeedSelection, readFeedSelection } from "@/lib/feed/feed-search-params";
import type { ContentCategory, FeedMode, FeedVideoPage } from "@/lib/feed/schemas";
import { splitFeedPage } from "@/lib/feed/slice-feed-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { isUnauthorized, type ActionResponse } from "@/lib/http";
import { callerRequestOptions } from "@/lib/server-http";
import { listActiveSpotlightVideos } from "@/lib/spotlight/api";
import type { PublicSpotlightVideo } from "@/lib/spotlight/schemas";

/** The backend's own default, restated so the seed and every later page agree on it. */
const FEED_PAGE_LIMIT = 24;

/**
 * The feed page as the view renders it.
 *
 * No `loading` variant, matching `@/lib/view-state`: this is a server component that awaits
 * its data before it renders at all, so loading is the `<Suspense>` boundary above it.
 */
type FeedPageViewState =
  | { readonly status: "sign_in_required"; readonly message: string }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly page: FeedVideoPage };

/**
 * A 401 on `?mode=watched` while signed out is the ONE case that wants a sign-in prompt rather
 * than an error panel — every other feed read is optional-auth and answers anonymous viewers a
 * real page.
 *
 * GATED ON THE MODE, not just the status. An expired better-auth cookie can produce a 401 on
 * `mode=all`, and the ungated version told that reader "Sign in to see what you've watched" —
 * a message about a mode they never selected.
 *
 * Every other failure now carries copy that says WHICH failure it was (`describeFeedError`).
 * Previously they were one indistinguishable sentence, which is what made an empty homepage
 * undiagnosable.
 */
function toFeedPageViewState(
  result: ActionResponse<FeedVideoPage>,
  mode: FeedMode,
): FeedPageViewState {
  if (result.success) return { status: "ready", page: result.data };
  if (isUnauthorized(result.error) && mode === "watched") {
    return { status: "sign_in_required", message: "Sign in to see what you've watched." };
  }
  return { status: "error", message: describeFeedError(result.error) };
}

export default async function FeedShell({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  // AWAITED HERE AND NOWHERE HIGHER. This component sits inside its own <Suspense>, so the
  // dynamism this await introduces is scoped to the feed region; `page.tsx` threads the
  // promise down untouched for exactly that reason.
  const resolvedSearchParams = await searchParams;
  const selection = readFeedSelection(resolvedSearchParams);
  const isDefaultView = isDefaultFeedSelection(selection);
  const requestOptions = await callerRequestOptions();

  const feedFilter = {
    mode: selection.mode,
    ...(selection.categorySlug === undefined ? {} : { categorySlug: selection.categorySlug }),
  };

  const [categoriesResult, spotlightResult, feedResult] = await Promise.all([
    listFeedCategories(requestOptions),
    // Skipped entirely when a filter is active — Spotlight does not render there, and paying
    // for a curated read nobody will see is the kind of waste that only shows up under load.
    // `no-store`: an admin publishing a change must not wait out a cache entry.
    isDefaultView
      ? listActiveSpotlightVideos({ cache: "no-store" })
      : Promise.resolve<ActionResponse<PublicSpotlightVideo[]>>({
          success: true,
          data: [],
        }),
    listFeedVideos({ ...feedFilter, limit: FEED_PAGE_LIMIT }, requestOptions),
  ]);

  /*
   * A FAILED CATEGORY READ IS NOT "NO CATEGORIES", and conflating them is the exact lie
   * `ListViewState` exists to prevent — `view-state.ts` says so in its own header.
   *
   * `rowsOrEmpty` used to be called here, which meant a broken `/feed/categories` silently
   * produced five mode chips and NO tile grid (`category-tiles-section.tsx` returns `null` on an
   * empty list). Indistinguishable from a database with no taxonomy seeded, which is a state this
   * project is actually in a lot — so the failure hid inside a legitimate empty.
   *
   * The rows still degrade to `[]` so the video grid survives; the DIFFERENCE is now visible.
   */
  const categories: ContentCategory[] = categoriesResult.success ? categoriesResult.data : [];
  const didCategoriesFail = !categoriesResult.success;
  const feedState = toFeedPageViewState(feedResult, selection.mode);
  const spotlightVideos = spotlightResult.success ? spotlightResult.data : [];

  const chipRow = (
    <>
      <Filter
        initialCategories={categories}
        searchParams={resolvedSearchParams}
        selection={selection}
      />
      {/*
        The visible difference between "the taxonomy is empty" and "the taxonomy read failed".
        Without it both render as five mode chips and no tile grid.
      */}
      {didCategoriesFail && (
        <p className="px-4 pb-2 text-xs text-[#6F7979] lg:px-6">
          Topic filters are unavailable right now.
        </p>
      )}
    </>
  );

  // Exhaustive switch with a `never` default (CLAUDE.md Pattern 1): adding a variant to
  // `FeedPageViewState` becomes a compile error here rather than a silently unhandled state.
  switch (feedState.status) {
    case "sign_in_required":
      return (
        <>
          {chipRow}
          <section className="py-8">
            <FeedSignInRequiredPanel message={feedState.message} />
          </section>
        </>
      );
    case "error":
      return (
        <>
          {chipRow}
          <section className="py-8">
            <FeedErrorPanel message={feedState.message} />
          </section>
        </>
      );
    case "ready": {
      if (!isDefaultView) {
        const activeCategory = categories.find(
          (category) => category.slug === selection.categorySlug,
        );
        return (
          <>
            {chipRow}
            <FilteredFeed
              filter={selection}
              initialPage={feedState.page}
              limit={FEED_PAGE_LIMIT}
              {...(activeCategory === undefined ? {} : { categoryLabel: activeCategory.label })}
            />
          </>
        );
      }

      const { recommendedVideos } = splitFeedPage(feedState.page.data);
      return (
        <>
          {chipRow}
          <section className="space-y-8 py-8">
            <RecommendedSection videos={recommendedVideos} />
            <CategoryTilesSection categories={categories} searchParams={resolvedSearchParams} />
            <SpotlightSection videos={spotlightVideos} />
            {/*
              Explore re-derives its own tail from the SAME page object rather than being
              handed the slice, because the infinite hook must page against what the server
              actually returned — a pre-trimmed seed would make `pagination` describe a page
              that never existed.
            */}
            <ExploreSection
              filter={selection}
              initialPage={feedState.page}
              limit={FEED_PAGE_LIMIT}
            />
          </section>
        </>
      );
    }
    default: {
      const exhaustiveCheck: never = feedState;
      return exhaustiveCheck;
    }
  }
}
