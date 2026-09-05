// TRANSPORT: server-fetch — async server component. Reads `GET /anime/hero-slides` via
// `@/lib/anime/hero.api`. The route is PUBLIC, so no `callerRequestOptions()` and no cookie
// forwarding: nothing about a slide depends on who is asking.

import AnimeHeroCarousel from "@/components/home/anime/sections/anime-hero-carousel";
import { listActiveAnimeHeroSlides } from "@/lib/anime/hero.api";
import type { PublicAnimeHeroSlide } from "@/lib/anime/schemas";

/**
 * `unavailable` and `empty` both render nothing, and they stay two variants anyway.
 *
 * The distinction survives in the type, so a future house fallback for `empty` — while
 * still showing nothing when the backend is down — is a one-line change inside an already
 * exhaustive switch. Collapsing them now would throw that away for no gain.
 */
type AnimeHeroViewState =
  | { status: "unavailable" }
  | { status: "empty" }
  | { status: "ready"; slides: PublicAnimeHeroSlide[] };

/**
 * The hero slot at the top of /anime.
 *
 * WHY SERVER-FETCH AND NOT `client-query`. The read is public, so there is no session to
 * forward and nothing per-visitor to protect. And this is the topmost above-the-fold element
 * on the page: a client query would ship HTML with a hole, hydrate, fetch, then paint — an
 * empty grey box on every single visit.
 *
 * WHY NOT `"use cache"`, even though public + tiny + rarely-changing is exactly its pitch.
 * Three reasons, in increasing severity:
 *   1. It would CACHE A FAILURE. This transport returns failures as values, so a cached
 *      `{ success: false }` bakes "the backend was down" into the entry for its whole expire
 *      window, and there is no way to opt one return value out.
 *   2. There is NO REVALIDATION CHANNEL. Writes go to Express, and this app may not use
 *      Server Actions or Next API routes for business logic — so nothing here can ever call
 *      `revalidateTag`. An admin publishing a slide would wait out `cacheLife`.
 *   3. `src/lib/cms.ts` only gets away with it because of its in-file mock fallback, which is
 *      forbidden on a wired surface.
 *
 * `cache: "no-store"` for the same reason as (2): an admin who just reordered the carousel
 * reloads /anime to check it, and a stale answer there reads as a bug in the reorder.
 *
 * IF THE BACKEND IS DOWN, THE PAGE RENDERS WITHOUT A HERO. Deliberately: the rails below are
 * the page's content, and an error banner at the top of /anime would announce our
 * infrastructure to every visitor — strictly worse than the card simply not being there.
 * "No live slides" is also a state an admin can create on purpose by deactivating every
 * slide, and it must look identical to a visitor.
 */
export default async function AnimeHeroCarouselSection() {
  const slidesResult = await listActiveAnimeHeroSlides({ cache: "no-store" });

  const viewState: AnimeHeroViewState = !slidesResult.success
    ? { status: "unavailable" }
    : slidesResult.data.length === 0
      ? { status: "empty" }
      : { status: "ready", slides: slidesResult.data };

  switch (viewState.status) {
    case "unavailable":
      return null;
    case "empty":
      return null;
    case "ready":
      return <AnimeHeroCarousel slides={viewState.slides} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
