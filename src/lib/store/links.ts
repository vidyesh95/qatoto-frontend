// TRANSPORT: props-only — pure href building, no network.

import type { HeroSlide, StoreSearchHit } from "@/lib/store/catalog.schemas";
import type { StoreMerchandisingEntityKind } from "@/lib/store/labels";

/**
 * Where a merchandising target points.
 *
 * The backend sends an entity KIND and a SLUG, never a path — a URL in the database would
 * outlive the routing that produced it. This is the single place that turns one into the
 * other, so a route rename is one edit.
 *
 * `provider_offering` returns null ON PURPOSE. `/store/services/[offeringSlug]` is a
 * shipped backend route with no frontend page yet (STORE_STRUCTURE §3.1), and a link to a
 * route that does not exist is a 404 the user cannot distinguish from a deleted listing.
 * Callers render an unlinked card until that page lands; nothing here fabricates a
 * destination.
 */
export function merchandisingTargetHref(
  entityKind: StoreMerchandisingEntityKind,
  targetSlug: string,
): string | null {
  switch (entityKind) {
    case "product":
      return `/store/product/${targetSlug}`;
    case "category":
      return `/store/category/${targetSlug}`;
    case "organization":
      return `/store/organizations/${targetSlug}`;
    case "provider_offering":
      return null;
    default: {
      const exhaustiveEntityKind: never = entityKind;
      return exhaustiveEntityKind;
    }
  }
}

/**
 * A hero slide's destination, or null when it has none.
 *
 * Both `linkTargetKind` and `linkTargetSlug` are nullable and are set together in practice,
 * but the wire allows one without the other, so both are required before a link is built.
 * A slide with no target is decorative and renders unlinked.
 */
export function heroSlideHref(slide: HeroSlide): string | null {
  if (slide.linkTargetKind === null || slide.linkTargetSlug === null) return null;
  return merchandisingTargetHref(slide.linkTargetKind, slide.linkTargetSlug);
}

/** A search hit's destination. `provider_offering` hits have none yet — see above. */
export function storeSearchHitHref(hit: StoreSearchHit): string | null {
  switch (hit.documentKind) {
    case "product":
      return `/store/product/${hit.publicSlug}`;
    case "provider_offering":
      return null;
    default: {
      const exhaustiveDocumentKind: never = hit.documentKind;
      return exhaustiveDocumentKind;
    }
  }
}
