// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `merchandising.api.ts` swaps `resolveMockRead` for `getJson`.
//
// THE INCOMPLETE SET IS THE MOST IMPORTANT FIXTURE HERE. The old mock modelled a pathway as a flat
// `items[]`, so a dead member simply vanished and a five-piece look rendered as three pieces with
// nothing saying a piece was missing. For a rail that is fine — a shorter rail is still a rail. For a
// set it is a lie, because the buyer believes they are seeing the whole kit. `MOCK_PATHWAY_SET` below
// therefore ships one `substituted` slot and one `unavailable` required slot, so the honest
// degradation path is the DEFAULT thing a reviewer sees rather than an edge case nobody opened.
//
// The rail fixture likewise carries all FOUR merchandising entity kinds, because `category` and
// `organization` were silently dropped by the backend resolver until Phase 8 and an arm with no
// fixture is an arm nobody has watched render.

import type {
  MerchandisingItem,
  StorePathwayCandidate,
  StorePathwayIndexPage,
  StorePathwaySet,
  StoreRailPage,
} from "@/lib/store/merchandising.schemas";
import type { StoreProductCard } from "@/lib/store/organizations.schemas";

const PUDA_SELLER: StoreProductCard["seller"] = {
  organizationId: "org_puda",
  slug: "guangdong-puda-electrical",
  displayName: "Guangdong Puda Electrical Appliance Co., Ltd",
  countryCode: "CN",
  logoUrl: null,
  summary: null,
};

const NORDLYS_SELLER: StoreProductCard["seller"] = {
  organizationId: "org_nordlys",
  slug: "nordlys-industrial",
  displayName: "Nordlys Industrial AS",
  countryCode: "NO",
  logoUrl: null,
  summary: null,
};

/** Keeps the fixtures below readable — the card shape is 19 fields and most are the same here. */
function buildProductCard(
  overrides: Partial<StoreProductCard> & Pick<StoreProductCard, "id" | "publicSlug" | "title">,
): StoreProductCard {
  return {
    brand: null,
    currency: "USD",
    priceInCents: 100_000,
    compareAtPriceInCents: null,
    minimumOrderQuantity: null,
    stockState: "in_stock",
    hasVariants: false,
    variantCount: 0,
    condition: "new",
    samplePolicy: "unavailable",
    leadTimeMinDays: null,
    leadTimeMaxDays: null,
    mainImageUrl: null,
    seller: PUDA_SELLER,
    category: { id: "cat_stacking_chair", slug: "stacking-chair", name: "Stacking chair" },
    reviewMetrics: { averageRating: null, reviewCount: 0 },
    ...overrides,
  };
}

// --- Pathway index ----------------------------------------------------------

export const MOCK_PATHWAY_INDEX_PAGE: StorePathwayIndexPage = {
  items: [
    {
      id: "pth_hotel_refit",
      slug: "autumn-hotel-room-refit",
      title: "Autumn hotel-room refit",
      summary: "Everything to fit out one guest room, from the bed frame to the door signage.",
      accent: "amber",
      cardImageUrl: "/images/store/pathways/hotel-refit.avif",
      // Curated: a merchandiser typed these slots.
      isAnchored: false,
      slotCount: 5,
    },
    {
      id: "pth_model_c_bicycle",
      slug: "everything-for-the-model-c-bicycle",
      title: "Everything for the Model-C bicycle",
      summary: "Jersey, gearset, lights and the bolts that actually fit it.",
      accent: "emerald",
      cardImageUrl: "/images/store/pathways/model-c-bicycle.avif",
      // Anchored: the slots were RESOLVED from the relation graph against one product.
      isAnchored: true,
      slotCount: 4,
    },
    {
      id: "pth_cafe_seating",
      slug: "cafe-seating-package",
      title: "Café seating package",
      summary: null,
      accent: "slate",
      // No card image. Renders a neutral accent tile, never a broken image and never the local
      // placeholder banner the old mock synthesised per slug.
      cardImageUrl: null,
      isAnchored: false,
      slotCount: 3,
    },
    {
      id: "pth_workshop_bench",
      slug: "workshop-bench-fitout",
      title: "Workshop bench fit-out",
      summary: "Bench, vice, lighting and storage for one assembly station.",
      accent: "sky",
      cardImageUrl: "/images/store/pathways/workshop-bench.avif",
      isAnchored: false,
      slotCount: 6,
    },
  ],
  page: { nextCursor: "cursor_pathways_page_2", hasMore: true },
};

export const MOCK_PATHWAY_INDEX_PAGE_EMPTY: StorePathwayIndexPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

// --- Pathway set candidates -------------------------------------------------

const CANDIDATE_STACKING_CHAIR: StorePathwayCandidate = {
  key: "cand_stacking_chair",
  rank: 0,
  sourceKind: "curated",
  relationKind: null,
  productId: "prd_folding_chair",
  variantId: "var_folding_chair_red",
  variantName: "Raspberry red",
  product: buildProductCard({
    id: "prd_folding_chair",
    publicSlug: "lv-folding-chair",
    title: "Powder-coated steel folding chair, stackable",
    priceInCents: 123_079,
    minimumOrderQuantity: 4,
    hasVariants: true,
    variantCount: 4,
    reviewMetrics: { averageRating: 4.8, reviewCount: 2432 },
  }),
  pricing: {
    status: "priced",
    currency: "USD",
    unitPriceInCents: 123_079,
    // The slot needs 4, so the line total is the SERVER's multiplication. Doing it on the client is
    // how a set total starts disagreeing with the cart it seeds.
    lineTotalInCents: 492_316,
    minimumOrderQuantity: 4,
    stockState: "in_stock",
  },
};

const CANDIDATE_CHEAPER_CHAIR: StorePathwayCandidate = {
  key: "cand_banquet_chair",
  rank: 1,
  sourceKind: "derived",
  // A derived candidate arrives with the edge that produced it. `complements` is the only kind the
  // nightly co-occurrence job may write — correlation is not evidence of fitment.
  relationKind: "complements",
  productId: "prd_banquet_chair",
  variantId: null,
  variantName: null,
  product: buildProductCard({
    id: "prd_banquet_chair",
    publicSlug: "stacking-banquet-chair",
    title: "Stacking banquet chair, upholstered seat",
    priceInCents: 64_099,
    seller: NORDLYS_SELLER,
    currency: "USD",
  }),
  pricing: {
    status: "priced",
    currency: "USD",
    unitPriceInCents: 64_099,
    lineTotalInCents: 256_396,
    minimumOrderQuantity: 1,
    stockState: "in_stock",
  },
};

const CANDIDATE_DESK_LAMP: StorePathwayCandidate = {
  key: "cand_desk_lamp",
  rank: 0,
  sourceKind: "curated",
  relationKind: null,
  productId: "prd_desk_lamp",
  variantId: null,
  variantName: null,
  product: buildProductCard({
    id: "prd_desk_lamp",
    publicSlug: "brass-desk-lamp",
    title: "Brass desk lamp, dimmable",
    priceInCents: 18_400,
    currency: "USD",
    category: { id: "cat_lighting", slug: "lighting", name: "Lighting" },
  }),
  pricing: {
    status: "priced",
    currency: "USD",
    unitPriceInCents: 18_400,
    lineTotalInCents: 36_800,
    minimumOrderQuantity: 1,
    stockState: "low_stock",
  },
};

const CANDIDATE_MIRROR_EUR: StorePathwayCandidate = {
  key: "cand_mirror",
  rank: 0,
  sourceKind: "curated",
  relationKind: null,
  productId: "prd_mirror",
  variantId: null,
  variantName: null,
  product: buildProductCard({
    id: "prd_mirror",
    publicSlug: "framed-wall-mirror",
    title: "Framed wall mirror, 600 × 900",
    priceInCents: 42_500,
    // A SECOND CURRENCY in the same set, on purpose. This is what makes `currencyTotals` an array
    // rather than a number, and it is the whole reason a single "set total" cannot exist.
    currency: "EUR",
    seller: NORDLYS_SELLER,
    category: { id: "cat_mirrors", slug: "mirrors", name: "Mirrors" },
  }),
  pricing: {
    status: "priced",
    currency: "EUR",
    unitPriceInCents: 42_500,
    lineTotalInCents: 42_500,
    minimumOrderQuantity: 1,
    stockState: "in_stock",
  },
};

const CANDIDATE_OUT_OF_STOCK_HEADBOARD: StorePathwayCandidate = {
  key: "cand_headboard",
  rank: 0,
  sourceKind: "curated",
  relationKind: null,
  productId: "prd_headboard",
  variantId: null,
  variantName: null,
  product: buildProductCard({
    id: "prd_headboard",
    publicSlug: "upholstered-headboard",
    title: "Upholstered headboard, king",
    priceInCents: 210_000,
    stockState: "unavailable",
  }),
  // The candidate exists and is rank 0, and it still cannot be sold at this quantity. A slot whose
  // only candidate is in this state is `unavailable`, not absent.
  pricing: {
    status: "unavailable",
    pricingError: { type: "INSUFFICIENT_STOCK", availableQuantity: 1 },
  },
};

// --- The set --------------------------------------------------------------

/**
 * A curated five-slot set with one substitution and one unfillable required slot.
 *
 * `completeness` says 4 of 5 required slots filled and `isComplete: false`, which is what disables
 * the whole-set CTA. Two currencies across the filled slots, so `currencyTotals` has two entries and
 * neither is "the price of the set".
 */
export const MOCK_PATHWAY_SET: StorePathwaySet = {
  pathway: {
    id: "pth_hotel_refit",
    slug: "autumn-hotel-room-refit",
    title: "Autumn hotel-room refit",
    summary: "Everything to fit out one guest room, from the bed frame to the door signage.",
    accent: "amber",
    heroImageUrl: "/images/store/pathways/hotel-refit-hero.avif",
    cardImageUrl: "/images/store/pathways/hotel-refit.avif",
    anchorProduct: null,
  },
  slots: [
    {
      id: "slot_seating",
      roleLabel: "Guest seating",
      isRequired: true,
      quantity: 4,
      siblingOrder: 0,
      derivedRelationKind: null,
      state: "available",
      chosenCandidateKey: "cand_stacking_chair",
      unavailableReason: null,
      candidates: [CANDIDATE_STACKING_CHAIR, CANDIDATE_CHEAPER_CHAIR],
    },
    {
      id: "slot_lighting",
      roleLabel: "Bedside lighting",
      isRequired: true,
      quantity: 2,
      siblingOrder: 1,
      derivedRelationKind: null,
      state: "available",
      chosenCandidateKey: "cand_desk_lamp",
      unavailableReason: null,
      candidates: [CANDIDATE_DESK_LAMP],
    },
    {
      id: "slot_mirror",
      roleLabel: "Wall mirror",
      isRequired: false,
      quantity: 1,
      siblingOrder: 2,
      derivedRelationKind: null,
      state: "available",
      chosenCandidateKey: "cand_mirror",
      unavailableReason: null,
      candidates: [CANDIDATE_MIRROR_EUR],
    },
    {
      // SUBSTITUTED: rank 0 could not be sold, so the slot fell through to rank 1 rather than
      // disappearing. That fall-through is what candidates exist for — a set is only as robust as
      // its substitutes.
      id: "slot_side_table",
      roleLabel: "Side table",
      isRequired: true,
      quantity: 2,
      siblingOrder: 3,
      derivedRelationKind: null,
      state: "substituted",
      chosenCandidateKey: "cand_banquet_chair",
      unavailableReason: null,
      candidates: [CANDIDATE_OUT_OF_STOCK_HEADBOARD, CANDIDATE_CHEAPER_CHAIR],
    },
    {
      // UNAVAILABLE AND REQUIRED. The slot is still in the response — "never omit an unfillable
      // required slot", because an absent slot and a slot with nothing in it are different facts and
      // only the second one is true.
      id: "slot_headboard",
      roleLabel: "Headboard",
      isRequired: true,
      quantity: 1,
      siblingOrder: 4,
      derivedRelationKind: null,
      state: "unavailable",
      chosenCandidateKey: null,
      unavailableReason: {
        type: "PRICING_FAILED",
        pricingError: { type: "INSUFFICIENT_STOCK", availableQuantity: 1 },
      },
      candidates: [CANDIDATE_OUT_OF_STOCK_HEADBOARD],
    },
  ],
  currencyTotals: [
    { currency: "USD", subtotalInCents: 785_512, slotCount: 3 },
    { currency: "EUR", subtotalInCents: 42_500, slotCount: 1 },
  ],
  completeness: {
    slotCount: 5,
    requiredSlotCount: 4,
    filledRequiredSlotCount: 3,
    isComplete: false,
  },
  page: { nextCursor: null, hasMore: false },
};

/**
 * An ANCHORED set: slots resolved from the relation graph against one product, and complete.
 *
 * The contrast matters — one model, two shapes, one renderer. An anchored set is not a second
 * feature, and if it needed its own page that would be the tell that the wire shape had diverged.
 */
export const MOCK_ANCHORED_PATHWAY_SET: StorePathwaySet = {
  pathway: {
    id: "pth_model_c_bicycle",
    slug: "everything-for-the-model-c-bicycle",
    title: "Everything for the Model-C bicycle",
    summary: "Jersey, gearset, lights and the bolts that actually fit it.",
    accent: "emerald",
    heroImageUrl: null,
    cardImageUrl: "/images/store/pathways/model-c-bicycle.avif",
    anchorProduct: buildProductCard({
      id: "prd_model_c",
      publicSlug: "model-c-bicycle",
      title: "Model-C city bicycle frameset",
      priceInCents: 480_000,
      reviewMetrics: { averageRating: 4.6, reviewCount: 88 },
    }),
  },
  slots: [
    {
      id: "slot_bolts",
      roleLabel: "Chain bolts",
      isRequired: true,
      // Twelve of them. A bicycle takes one saddle and twelve bolts, which is the whole reason a
      // slot carries a quantity at all.
      quantity: 12,
      siblingOrder: 0,
      // A derived slot states the edge it came from. `spare_part_of` is a fitment claim, so whether
      // it may be worded confirmatorily depends on the candidate's `sourceKind`, not on this.
      derivedRelationKind: "spare_part_of",
      state: "available",
      chosenCandidateKey: "cand_bolts",
      unavailableReason: null,
      candidates: [
        {
          key: "cand_bolts",
          rank: 0,
          // `derived` + `compatible_with` is exactly the pair that must NOT render as verified
          // fitment. The seller says the bolt fits; nobody has checked.
          sourceKind: "derived",
          relationKind: "compatible_with",
          productId: "prd_chain_bolt",
          variantId: null,
          variantName: null,
          product: buildProductCard({
            id: "prd_chain_bolt",
            publicSlug: "m5-chain-bolt",
            title: "M5 stainless chain bolt",
            priceInCents: 180,
            category: { id: "cat_fasteners", slug: "fasteners", name: "Fasteners" },
          }),
          pricing: {
            status: "priced",
            currency: "USD",
            unitPriceInCents: 180,
            lineTotalInCents: 2_160,
            minimumOrderQuantity: 1,
            stockState: "in_stock",
          },
        },
      ],
    },
    {
      id: "slot_front_light",
      roleLabel: "Front light",
      isRequired: true,
      quantity: 1,
      siblingOrder: 1,
      derivedRelationKind: "accessory_of",
      state: "available",
      chosenCandidateKey: "cand_front_light",
      unavailableReason: null,
      candidates: [
        {
          key: "cand_front_light",
          rank: 0,
          sourceKind: "curated",
          relationKind: null,
          productId: "prd_front_light",
          variantId: null,
          variantName: null,
          product: buildProductCard({
            id: "prd_front_light",
            publicSlug: "usb-front-light",
            title: "USB-C rechargeable front light, 800 lumen",
            priceInCents: 6_400,
            category: { id: "cat_bike_lights", slug: "bike-lights", name: "Bike lights" },
          }),
          pricing: {
            status: "priced",
            currency: "USD",
            unitPriceInCents: 6_400,
            lineTotalInCents: 6_400,
            minimumOrderQuantity: 1,
            stockState: "in_stock",
          },
        },
      ],
    },
  ],
  currencyTotals: [{ currency: "USD", subtotalInCents: 8_560, slotCount: 2 }],
  completeness: {
    slotCount: 2,
    requiredSlotCount: 2,
    filledRequiredSlotCount: 2,
    isComplete: true,
  },
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_PATHWAY_SETS_BY_SLUG: Readonly<Record<string, StorePathwaySet>> = {
  "autumn-hotel-room-refit": MOCK_PATHWAY_SET,
  "everything-for-the-model-c-bicycle": MOCK_ANCHORED_PATHWAY_SET,
};

export const MOCK_FEATURED_PATHWAY_SLUGS: readonly string[] =
  Object.keys(MOCK_PATHWAY_SETS_BY_SLUG);

// --- Rails ------------------------------------------------------------------

/** All four entity kinds, so no arm of the switch is unreachable. */
const RAIL_ITEMS: MerchandisingItem[] = [
  {
    entityKind: "product",
    entityId: "prd_folding_chair",
    product: buildProductCard({
      id: "prd_folding_chair",
      publicSlug: "lv-folding-chair",
      title: "Powder-coated steel folding chair, stackable",
      priceInCents: 123_079,
      hasVariants: true,
      variantCount: 4,
      reviewMetrics: { averageRating: 4.8, reviewCount: 2432 },
    }),
  },
  {
    entityKind: "category",
    entityId: "cat_chairs",
    category: {
      id: "cat_chairs",
      slug: "chairs",
      name: "Chairs",
      parentCategoryId: "cat_home_furniture",
      siblingOrder: 2,
      imageUrl: "/images/store/categories/chairs.avif",
    },
  },
  {
    entityKind: "organization",
    entityId: "org_puda",
    organization: {
      organizationId: "org_puda",
      slug: "guangdong-puda-electrical",
      displayName: "Guangdong Puda Electrical Appliance Co., Ltd",
      countryCode: "CN",
      logoUrl: null,
      summary: "Contract manufacturer of small kitchen appliances and modular seating.",
    },
  },
  {
    entityKind: "provider_offering",
    entityId: "off_meridian_fcl",
    offering: {
      id: "off_meridian_fcl",
      slug: "meridian-fcl-asia-europe",
      title: "FCL ocean freight, South China to North Europe",
      summary: "Weekly consolidated sailings from Yantian and Shekou.",
      providerKind: "freight_forwarder",
      pricingModel: "per_unit",
      indicativePriceMinInCents: 185_000,
      indicativePriceMaxInCents: 240_000,
      currency: "USD",
      minimumLeadTimeDays: 28,
      maximumLeadTimeDays: 38,
    },
    provider: {
      organizationId: "org_meridian",
      slug: "meridian-freight",
      displayName: "Meridian Freight Partners",
      countryCode: "SG",
      logoUrl: null,
      publicSummary: "Consolidated ocean and air freight between East Asia and Northern Europe.",
      verificationState: "verified",
      acceptingRequests: true,
      serviceRegionSummary: "East Asia → Europe, North America",
      declaredResponseTimeHours: 4,
      reviewMetrics: { averageRating: 4.7, reviewCount: 128 },
      fulfillmentMetrics: {
        onTimeShipmentRate: 0.962,
        onTimeSampleSize: 214,
        completedOrderCount: 268,
      },
    },
  },
];

export const MOCK_RAIL_PAGES_BY_SLUG: Readonly<Record<string, StoreRailPage>> = {
  "whats-new": {
    rail: { slug: "whats-new", title: "What's new", strategy: "newest" },
    items: RAIL_ITEMS,
    page: { nextCursor: "cursor_rail_page_2", hasMore: true },
  },
  trending: {
    rail: { slug: "trending", title: "Trending this week", strategy: "trending" },
    items: [RAIL_ITEMS[0]],
    page: { nextCursor: null, hasMore: false },
  },
  /**
   * `trending_placeholder` returns an EMPTY LIST unconditionally and always will — it is kept
   * forever so that backing the ranking engine out stays a per-rail data edit rather than a deploy.
   * A rail carrying it is NOT broken, and the page must render it as empty rather than as an error.
   */
  "for-you": {
    rail: { slug: "for-you", title: "For you", strategy: "trending_placeholder" },
    items: [],
    page: { nextCursor: null, hasMore: false },
  },
};

export const MOCK_FEATURED_RAIL_SLUGS: readonly string[] = Object.keys(MOCK_RAIL_PAGES_BY_SLUG);
