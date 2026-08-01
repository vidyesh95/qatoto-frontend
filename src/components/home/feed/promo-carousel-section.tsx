// TRANSPORT: server-fetch — async server component. Reads `GET /promotions/slides` via
// `@/lib/promo/api`. The route is PUBLIC, so no `callerRequestOptions()` and no cookie
// forwarding: nothing about a slide depends on who is asking.

import PromoCarousel from "@/components/home/feed/promo-carousel";
import { listActivePromotionalSlides } from "@/lib/promo/api";
import { toPromotionalCarouselSlide, type PromotionalCarouselSlide } from "@/lib/promo/schemas";

/**
 * `unavailable` and `empty` both render nothing, and they stay two variants anyway.
 *
 * The distinction survives in the type, so a future house-ad fallback for `empty` — while
 * still showing nothing when the backend is down — is a one-line change inside an already
 * exhaustive switch. Collapsing them now would throw that away for no gain.
 */
type PromoCarouselViewState =
  | { status: "unavailable" }
  | { status: "empty" }
  | { status: "ready"; slides: PromotionalCarouselSlide[] };

/**
 * The promotional slot on the home feed.
 *
 * WHY SERVER-FETCH AND NOT `client-query`. The read is public, so there is no session to
 * forward and nothing per-visitor to protect. And this is the topmost above-the-fold element
 * on the most-visited page: a client query would ship HTML with a hole, hydrate, fetch, then
 * paint — an empty grey box on every single visit.
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
 * reloads the front page to check it, and a stale answer there reads as a bug in the reorder.
 *
 * IF THE BACKEND IS DOWN, THE PAGE RENDERS WITHOUT A CAROUSEL. Deliberately: this slot is
 * ornamental advertising, not the page's content. An error banner here would be the topmost
 * element of the front page and would announce our infrastructure to every visitor — strictly
 * worse than the slide simply not being there. "No live slides" is also a state an admin can
 * create on purpose, and it must look identical to a visitor.
 */
export default async function PromoCarouselSection() {
  const slidesResult = await listActivePromotionalSlides({ cache: "no-store" });

  const viewState: PromoCarouselViewState = !slidesResult.success
    ? { status: "unavailable" }
    : slidesResult.data.length === 0
      ? { status: "empty" }
      : { status: "ready", slides: slidesResult.data.map(toPromotionalCarouselSlide) };

  switch (viewState.status) {
    case "unavailable":
      return null;
    case "empty":
      return null;
    case "ready":
      return <PromoCarousel slides={viewState.slides} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
