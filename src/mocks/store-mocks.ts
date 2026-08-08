// TRANSPORT: mock
//
// The store surface's remaining shared mock content.
//
// THIS IS STATIC UI CONTENT, NEVER A FALLBACK. CLAUDE.md forbids a network failure activating mock
// data, and nothing here does that: a failed read still renders `StoreStatusPanel`. These constants
// only feed sections whose backing endpoint does not exist yet.
//
// The predecessor of this file was 2,083 lines and stood in for the whole catalog — 32 categories,
// their product pools, hero slides, pathways. All of that is now real, served by `/store/*`. What
// survives here is only what the backend genuinely cannot answer:
//
//   - the six "For your Business" navigation shortcuts (a nav rail, not provider data);
//   - the PDP colour swatches (no product-variant tables exist);
//   - the PDP's two recommendation rails (recommendations are explicitly deferred, backend §12);
//   - the three named rails on a category page (one product list per category, not three);
//   - pathway banner images (a pathway carries title, summary and an accent token — no image).
//
// Content that belongs to exactly one component stays inline in that component instead, matching
// the convention the other mock sections already follow (`PACKAGING_ROWS`, `HIGHLIGHTS`).
//
// Every product tile below sets `href: null`. See `StoreProductTile` for why.

import type { StoreProductTile } from "@/lib/store/tiles";

/** A "For your Business" shortcut. Navigation, not a provider projection. */
export interface StoreBusinessLink {
  readonly id: string;
  readonly label: string;
  readonly iconSrc: string;
  readonly href: string;
}

/**
 * The six B2B essentials shortcuts.
 *
 * None of these routes exist yet — they did not exist at the mock stage either, so this restores
 * the rail exactly as it was rather than adding new dead ends. They are distinct from the store
 * home's `providerShortcuts`, which are real connector organizations from the provider directory;
 * both rails render.
 */
export const MOCK_BUSINESS_LINKS: readonly StoreBusinessLink[] = [
  {
    id: "all-categories",
    label: "All Categories",
    iconSrc: "/icons/category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/categories",
  },
  {
    id: "request-for-quotation",
    label: "Request for Quotation",
    iconSrc: "/icons/request_quote_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/rfq",
  },
  {
    id: "logistic-services",
    label: "Logistic Services",
    iconSrc: "/icons/directions_boat_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/logistics",
  },
  {
    id: "factories-worldwide",
    label: "Factories Worldwide",
    iconSrc: "/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/factories",
  },
  {
    id: "business-forum",
    label: "Business Forum",
    iconSrc: "/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/forum",
  },
  {
    id: "find-cofounder",
    label: "Find Cofounder",
    iconSrc: "/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store/find-cofounder",
  },
];

/** A selectable finish on the PDP. No variant tables exist backend-side, so this is display only. */
export interface MockProductColor {
  readonly name: string;
  readonly imageSrc: string;
}

export const MOCK_PRODUCT_COLORS: readonly MockProductColor[] = [
  { name: "Raspberry red", imageSrc: "/dummy/chair_raspberry_red.avif" },
  { name: "Royal purple", imageSrc: "/dummy/chair_royal_purple.avif" },
  { name: "Sea blue", imageSrc: "/dummy/chair_sea_blue.avif" },
  { name: "Charcoal black", imageSrc: "/dummy/chair_charcoal_black.avif" },
];

function mockTile(
  id: string,
  title: string,
  secondaryLabel: string,
  imageUrl: string,
  priceLabel: string,
  accentIndex: number,
): StoreProductTile {
  return {
    id,
    title,
    secondaryLabel,
    imageUrl,
    priceLabel,
    minimumOrderQuantity: null,
    href: null,
    accentIndex,
  };
}

/** PDP rail — sat directly under "View similar / Add to Compare" at the mock stage. */
export const MOCK_FREQUENTLY_BOUGHT_TOGETHER: readonly StoreProductTile[] = [
  mockTile(
    "plastic-stacking-chairs",
    "Plastic Stacking Chairs",
    "Set of 10",
    "/dummy/stacking_chair.avif",
    "$250",
    0,
  ),
  mockTile(
    "metal-stacking-chairs",
    "Metal Stacking Chairs",
    "Set of 4",
    "/dummy/thumbnail_image02.avif",
    "$180",
    1,
  ),
  mockTile(
    "padded-stacking-chairs",
    "Padded Stacking Chairs",
    "Set of 6",
    "/dummy/thumbnail_image03.avif",
    "$320",
    2,
  ),
  mockTile(
    "event-chairs",
    "Event Chairs",
    "Folding, set of 20",
    "/dummy/thumbnail_image04.avif",
    "$400",
    3,
  ),
];

/** PDP rail — the end-of-page discovery strip, below "Report abuse". */
export const MOCK_OTHER_RECOMMENDATIONS: readonly StoreProductTile[] = [
  mockTile(
    "ergonomic-office-chair",
    "Ergonomic Office Chair",
    "Mesh, lumbar",
    "/dummy/office_chair.avif",
    "$540",
    0,
  ),
  mockTile(
    "rgb-gaming-chair",
    "Gaming Chair",
    "Racing style, RGB",
    "/dummy/gaming_chair.avif",
    "$320",
    1,
  ),
  mockTile(
    "dining-chair-set-4",
    "Dining Chair Set",
    "Set of 4",
    "/dummy/dining_chair.avif",
    "$440",
    2,
  ),
  mockTile(
    "power-recliner-chair",
    "Power Recliner",
    "Heated, USB",
    "/dummy/recliner.avif",
    "$720",
    3,
  ),
];

/**
 * The three named rails a category page carried at the mock stage.
 *
 * The backend returns ONE product list per category, not three ranked ones, and has no "new in" /
 * "popular in" / "top rated" signal — ranking is deferred (backend §12 Phase 7). So these tiles are
 * fixed content, and the real, paginated, server-ordered grid renders below them.
 */
export interface MockCategoryRail {
  readonly id: string;
  readonly titleSuffix: string;
  readonly tiles: readonly StoreProductTile[];
}

export const MOCK_CATEGORY_RAILS: readonly MockCategoryRail[] = [
  {
    id: "new-in",
    titleSuffix: "New in",
    tiles: [
      mockTile(
        "boucle-accent-chair",
        "Accent Chair",
        "Boucle, swivel",
        "/dummy/living_room_chair.avif",
        "$480",
        0,
      ),
      mockTile(
        "tufted-chaise",
        "Chaise Lounge",
        "Tufted velvet",
        "/dummy/chaise_lounge.avif",
        "$610",
        1,
      ),
      mockTile("vanity-stool", "Vanity Stool", "Upholstered", "/dummy/vanity.avif", "$120", 2),
      mockTile("storage-cabinet", "Storage Cabinet", "Two-door", "/dummy/cabinets.avif", "$380", 3),
    ],
  },
  {
    id: "popular-in",
    titleSuffix: "Popular in",
    tiles: [
      mockTile(
        "ergonomic-office-chair",
        "Ergonomic Office Chair",
        "Mesh, lumbar",
        "/dummy/office_chair.avif",
        "$540",
        0,
      ),
      mockTile(
        "rgb-gaming-chair",
        "Gaming Chair",
        "Racing style, RGB",
        "/dummy/gaming_chair.avif",
        "$320",
        1,
      ),
      mockTile(
        "dining-chair-set-4",
        "Dining Chair Set",
        "Set of 4",
        "/dummy/dining_chair.avif",
        "$440",
        2,
      ),
      mockTile(
        "sofa-three-seater",
        "Three-seater Sofa",
        "Linen weave",
        "/dummy/sofas.avif",
        "$1,240",
        3,
      ),
    ],
  },
  {
    id: "top-rated",
    titleSuffix: "Top Rated",
    tiles: [
      mockTile(
        "power-recliner-chair",
        "Power Recliner",
        "Heated, USB",
        "/dummy/recliner.avif",
        "$720",
        0,
      ),
      mockTile(
        "full-body-massage-chair",
        "Full-body Massage Chair",
        "Zero-gravity, heat",
        "/dummy/massage_chair.avif",
        "$2,400",
        1,
      ),
      mockTile("platform-bed", "Platform Bed", "Solid oak", "/dummy/beds.avif", "$960", 2),
      mockTile("dining-table-six", "Dining Table", "Seats six", "/dummy/tables.avif", "$820", 3),
    ],
  },
];

/**
 * Banner images for a pathway page and its rail cards.
 *
 * A pathway on the wire has no image, and these cannot be keyed by slug — the mock slugs they were
 * written for (`louis-vuitton-collection`, `steel-roll`, …) will not match the slugs a real backend
 * serves. Picking by a hash of the slug at least keeps each pathway's banner stable across renders
 * and distinct from its neighbours.
 */
const MOCK_PATHWAY_BANNERS = [
  "/dummy/pathways_1.avif",
  "/dummy/pathways_2.avif",
  "/dummy/pathways_3.avif",
  "/dummy/pathways_4.avif",
  "/dummy/pathways_5.avif",
] as const;

export function mockPathwayBannerForSlug(pathwaySlug: string): string {
  let slugHash = 0;
  for (let characterIndex = 0; characterIndex < pathwaySlug.length; characterIndex += 1) {
    slugHash = (slugHash * 31 + pathwaySlug.charCodeAt(characterIndex)) % 100_000;
  }
  return MOCK_PATHWAY_BANNERS[slugHash % MOCK_PATHWAY_BANNERS.length];
}
