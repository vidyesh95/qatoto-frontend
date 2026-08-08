// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Every constant here is deleted when `catalog.api.ts` swaps `resolveMockRead`
// for `getJson`. It lives under `src/mocks/store/` rather than beside the schema so that
// the deletion is one command and `rg 'mocks/store' src/lib/store` is the exhaustive list
// of what is still fake.
//
// EVERY FIXTURE IS EXPLICITLY ANNOTATED, not `satisfies`. Annotation catches a missing
// REQUIRED field at compile time; `satisfies` would let one through. `resolveMockRead`
// then parses each one through the real schema at runtime, which catches what types
// cannot — a typo'd enum member, an `undefined` where the wire says `null`.
//
// Each surface ships three scenarios: the populated one, an EMPTY one, and where the
// projection admits it a DEGRADED one. The empty and error branches of a page are the
// ones that ship unreviewed otherwise, and this is what makes them reachable — point the
// api function at `_EMPTY` or `_DEGRADED` and reload.

import type {
  StoreCategory,
  StoreCategoryDetail,
  StoreSearchPage,
} from "@/lib/store/catalog.schemas";
import type { StoreProductCard } from "@/lib/store/organizations.schemas";

// --- Sellers referenced by the product cards --------------------------------

const PUDA_SELLER: StoreProductCard["seller"] = {
  organizationId: "org_puda",
  slug: "guangdong-puda-electrical",
  displayName: "Guangdong Puda Electrical Appliance Co., Ltd",
  countryCode: "CN",
  logoUrl: "/images/store/organizations/puda-logo.svg",
  summary: "Contract manufacturer of small kitchen appliances and modular seating.",
};

const NORDLYS_SELLER: StoreProductCard["seller"] = {
  organizationId: "org_nordlys",
  slug: "nordlys-industrial",
  displayName: "Nordlys Industrial AS",
  countryCode: "NO",
  logoUrl: null,
  summary: null,
};

const SEATING_CATEGORY: StoreProductCard["category"] = {
  id: "cat_stacking_chair",
  slug: "stacking-chair",
  name: "Stacking chair",
};

/**
 * Twelve cards covering the branches the grid has to render.
 *
 * Deliberate coverage, not filler: every `stockState` except `unavailable`, every
 * `samplePolicy`, a card with variants (so the price renders as "From"), a card with
 * `averageRating: null` (no rating yet, which must not print as zero stars), a card with
 * `minimumOrderQuantity: null`, and one with no lead time declared.
 */
const CATALOG_PRODUCTS: StoreProductCard[] = [
  {
    id: "prd_folding_chair",
    publicSlug: "lv-folding-chair",
    title: "Powder-coated steel folding chair, stackable",
    brand: "Puda",
    currency: "USD",
    priceInCents: 123_079,
    compareAtPriceInCents: 149_900,
    minimumOrderQuantity: 50,
    stockState: "in_stock",
    hasVariants: true,
    variantCount: 4,
    condition: "new",
    samplePolicy: "refundable",
    leadTimeMinDays: 15,
    leadTimeMaxDays: 30,
    mainImageUrl: "/images/store/products/folding-chair-1.avif",
    seller: PUDA_SELLER,
    category: SEATING_CATEGORY,
    reviewMetrics: { averageRating: 4.8, reviewCount: 2432 },
  },
  {
    id: "prd_gaming_chair",
    publicSlug: "ergo-gaming-chair",
    title: "Ergonomic gaming chair with lumbar support",
    brand: "Puda",
    currency: "USD",
    priceInCents: 289_500,
    compareAtPriceInCents: null,
    minimumOrderQuantity: 20,
    stockState: "low_stock",
    hasVariants: true,
    variantCount: 6,
    condition: "new",
    samplePolicy: "paid",
    leadTimeMinDays: 20,
    leadTimeMaxDays: 45,
    mainImageUrl: "/images/store/products/gaming-chair-1.avif",
    seller: PUDA_SELLER,
    category: { id: "cat_gaming_chair", slug: "gaming-chair", name: "Gaming chair" },
    reviewMetrics: { averageRating: 4.4, reviewCount: 188 },
  },
  {
    id: "prd_massage_chair",
    publicSlug: "recline-massage-chair",
    title: "Zero-gravity reclining massage chair",
    brand: null,
    currency: "USD",
    priceInCents: 1_845_000,
    compareAtPriceInCents: null,
    minimumOrderQuantity: 5,
    stockState: "made_to_order",
    hasVariants: false,
    variantCount: 0,
    condition: "new",
    samplePolicy: "unavailable",
    leadTimeMinDays: 60,
    leadTimeMaxDays: 90,
    mainImageUrl: "/images/store/products/massage-chair-1.avif",
    seller: PUDA_SELLER,
    category: { id: "cat_massage_chair", slug: "massage-chair", name: "Massage chair" },
    // Null means NOT ENOUGH DATA, never zero stars. A rating of 0 would be a review.
    reviewMetrics: { averageRating: null, reviewCount: 0 },
  },
  {
    id: "prd_office_chair",
    publicSlug: "mesh-office-chair",
    title: "Mesh-back task chair, adjustable arms",
    brand: "Nordlys",
    currency: "EUR",
    priceInCents: 74_900,
    compareAtPriceInCents: 89_900,
    minimumOrderQuantity: 100,
    stockState: "in_stock",
    hasVariants: false,
    variantCount: 0,
    condition: "new",
    samplePolicy: "paid",
    leadTimeMinDays: 10,
    leadTimeMaxDays: 21,
    mainImageUrl: "/images/store/products/office-chair-1.avif",
    seller: NORDLYS_SELLER,
    category: { id: "cat_office_chair", slug: "office-chair", name: "Office chair" },
    reviewMetrics: { averageRating: 4.1, reviewCount: 63 },
  },
  {
    id: "prd_dining_chair",
    publicSlug: "oak-dining-chair",
    title: "Solid oak dining chair, woven seat",
    brand: null,
    currency: "EUR",
    priceInCents: 118_000,
    compareAtPriceInCents: null,
    // Null MOQ means the seller declared none — not "one".
    minimumOrderQuantity: null,
    stockState: "in_stock",
    hasVariants: false,
    variantCount: 0,
    condition: "new",
    samplePolicy: "refundable",
    // No lead time declared. Renders as an absence, never "ships immediately".
    leadTimeMinDays: null,
    leadTimeMaxDays: null,
    mainImageUrl: "/images/store/products/dining-chair-1.avif",
    seller: NORDLYS_SELLER,
    category: { id: "cat_dining_chair", slug: "dining-chair", name: "Dining chair" },
    reviewMetrics: { averageRating: 4.9, reviewCount: 21 },
  },
  {
    id: "prd_stool",
    publicSlug: "adjustable-bar-stool",
    title: "Gas-lift bar stool, footrest ring",
    brand: "Puda",
    currency: "USD",
    priceInCents: 46_800,
    compareAtPriceInCents: null,
    minimumOrderQuantity: 60,
    stockState: "in_stock",
    hasVariants: true,
    variantCount: 3,
    condition: "new",
    samplePolicy: "paid",
    leadTimeMinDays: 18,
    leadTimeMaxDays: 32,
    mainImageUrl: "/images/store/products/bar-stool-1.avif",
    seller: PUDA_SELLER,
    category: { id: "cat_stool", slug: "stools-and-ottomans", name: "Stools and ottomans" },
    reviewMetrics: { averageRating: 4.2, reviewCount: 97 },
  },
  {
    id: "prd_chaise",
    publicSlug: "velvet-chaise-lounge",
    title: "Velvet chaise lounge, brass feet",
    brand: null,
    currency: "USD",
    priceInCents: 512_000,
    compareAtPriceInCents: 589_000,
    minimumOrderQuantity: 10,
    stockState: "low_stock",
    hasVariants: true,
    variantCount: 5,
    condition: "new",
    samplePolicy: "unavailable",
    leadTimeMinDays: 35,
    leadTimeMaxDays: 50,
    mainImageUrl: "/images/store/products/chaise-1.avif",
    seller: PUDA_SELLER,
    category: { id: "cat_chaise", slug: "chaise-lounge", name: "Chaise lounge" },
    reviewMetrics: { averageRating: 4.6, reviewCount: 44 },
  },
  {
    id: "prd_recliner",
    publicSlug: "leather-recliner",
    title: "Full-grain leather recliner, manual",
    brand: "Nordlys",
    currency: "EUR",
    priceInCents: 698_000,
    compareAtPriceInCents: null,
    minimumOrderQuantity: 8,
    stockState: "made_to_order",
    hasVariants: false,
    variantCount: 0,
    // The one refurbished card, so the condition chip has a non-default to render.
    condition: "refurbished",
    samplePolicy: "unavailable",
    leadTimeMinDays: 45,
    leadTimeMaxDays: 75,
    mainImageUrl: "/images/store/products/recliner-1.avif",
    seller: NORDLYS_SELLER,
    category: { id: "cat_recliner", slug: "recliner", name: "Recliner" },
    reviewMetrics: { averageRating: 3.9, reviewCount: 12 },
  },
];

// --- Category tree ----------------------------------------------------------

const ROOT_CATEGORIES: StoreCategory[] = [
  {
    id: "cat_furniture",
    slug: "furniture",
    name: "Furniture",
    parentCategoryId: null,
    siblingOrder: 0,
    imageUrl: "/images/store/categories/furniture.avif",
  },
  {
    id: "cat_machinery",
    slug: "machinery",
    name: "Industrial machinery",
    parentCategoryId: null,
    siblingOrder: 1,
    imageUrl: "/images/store/categories/machinery.avif",
  },
  {
    id: "cat_clothes",
    slug: "clothes",
    name: "Apparel",
    parentCategoryId: null,
    siblingOrder: 2,
    imageUrl: "/images/store/categories/clothes.avif",
  },
  {
    id: "cat_accessories",
    slug: "accessories",
    name: "Accessories",
    parentCategoryId: null,
    siblingOrder: 3,
    imageUrl: "/images/store/categories/accessories.avif",
  },
  {
    id: "cat_beauty",
    slug: "beauty",
    name: "Beauty and personal care",
    parentCategoryId: null,
    siblingOrder: 4,
    // No image. Renders initials or a neutral tile, never a broken image.
    imageUrl: null,
  },
  {
    id: "cat_shoes",
    slug: "shoes",
    name: "Footwear",
    parentCategoryId: null,
    siblingOrder: 5,
    imageUrl: "/images/store/categories/shoes.avif",
  },
  {
    id: "cat_bags",
    slug: "bags",
    name: "Bags and luggage",
    parentCategoryId: null,
    siblingOrder: 6,
    imageUrl: "/images/store/categories/bags.avif",
  },
  {
    id: "cat_jewelry",
    slug: "jewelry",
    name: "Jewellery",
    parentCategoryId: null,
    siblingOrder: 7,
    imageUrl: "/images/store/categories/jewelry.avif",
  },
];

const SEATING_CHILDREN: StoreCategory[] = [
  {
    id: "cat_living_room_chair",
    slug: "living-room-chair",
    name: "Living room chair",
    parentCategoryId: "cat_chairs",
    siblingOrder: 0,
    imageUrl: "/images/store/categories/living-room-chair.avif",
  },
  {
    id: "cat_gaming_chair",
    slug: "gaming-chair",
    name: "Gaming chair",
    parentCategoryId: "cat_chairs",
    siblingOrder: 1,
    imageUrl: "/images/store/categories/gaming-chair.avif",
  },
  {
    id: "cat_dining_chair",
    slug: "dining-chair",
    name: "Dining chair",
    parentCategoryId: "cat_chairs",
    siblingOrder: 2,
    imageUrl: "/images/store/categories/dining-chair.avif",
  },
  {
    id: "cat_office_chair",
    slug: "office-chair",
    name: "Office chair",
    parentCategoryId: "cat_chairs",
    siblingOrder: 3,
    imageUrl: "/images/store/categories/office-chair.avif",
  },
  {
    id: "cat_recliner",
    slug: "recliner",
    name: "Recliner",
    parentCategoryId: "cat_chairs",
    siblingOrder: 4,
    imageUrl: null,
  },
  {
    id: "cat_stacking_chair",
    slug: "stacking-chair",
    name: "Stacking chair",
    parentCategoryId: "cat_chairs",
    siblingOrder: 5,
    imageUrl: "/images/store/categories/stacking-chair.avif",
  },
];

export const MOCK_ROOT_CATEGORY_LIST: { items: StoreCategory[] } = { items: ROOT_CATEGORIES };

export const MOCK_ROOT_CATEGORY_LIST_EMPTY: { items: StoreCategory[] } = { items: [] };

/**
 * A branch node: has children AND its own products.
 *
 * Both are populated on purpose. A branch that showed only children would let the page
 * skip deciding what to do when a category has both, which is the common case in a real
 * catalog and the layout question the page actually has to answer.
 */
export const MOCK_CATEGORY_DETAIL: StoreCategoryDetail = {
  category: {
    id: "cat_chairs",
    slug: "chairs",
    name: "Chairs",
    parentCategoryId: "cat_home_furniture",
    siblingOrder: 2,
    imageUrl: "/images/store/categories/chairs.avif",
  },
  children: SEATING_CHILDREN,
  facets: {
    sellerCountryCodes: [
      { value: "CN", count: 41 },
      { value: "NO", count: 12 },
      { value: "IN", count: 9 },
      { value: "VN", count: 4 },
    ],
    stockStates: [
      { value: "in_stock", count: 38 },
      { value: "low_stock", count: 14 },
      { value: "made_to_order", count: 11 },
      { value: "unavailable", count: 3 },
    ],
    samplePolicies: [
      { value: "paid", count: 29 },
      { value: "refundable", count: 18 },
      { value: "unavailable", count: 19 },
    ],
    priceRangesInCents: { minInCents: 46_800, maxInCents: 1_845_000, count: 66 },
  },
  products: {
    items: CATALOG_PRODUCTS,
    page: { nextCursor: "cursor_chairs_page_2", hasMore: true },
  },
};

/**
 * A LEAF with no listings yet — children empty, products empty, facets all zero.
 *
 * This is the state a freshly published category is in, and it must read as "nothing
 * listed here yet" rather than as a failure. Note `priceRangesInCents` has null ends and
 * a zero count: an empty category has no price range, and printing `$0` would advertise
 * free goods.
 */
export const MOCK_CATEGORY_DETAIL_EMPTY: StoreCategoryDetail = {
  category: {
    id: "cat_coat_racks",
    slug: "coat-racks",
    name: "Coat racks",
    parentCategoryId: "cat_home_furniture",
    siblingOrder: 3,
    imageUrl: null,
  },
  children: [],
  facets: {
    sellerCountryCodes: [],
    stockStates: [],
    samplePolicies: [],
    priceRangesInCents: { minInCents: null, maxInCents: null, count: 0 },
  },
  products: { items: [], page: { nextCursor: null, hasMore: false } },
};

/**
 * The fixture map the mocked detail read resolves against.
 *
 * Keyed by slug so an unknown slug 404s exactly as the backend would, instead of the usual
 * shortcut of returning the one fixture for every slug — which makes every detail route
 * look like it resolves and leaves the `notFound()` branch unreviewed.
 *
 * `chairs` is the populated branch node; `coat-racks` is the empty leaf. Both are reachable
 * by typing the URL, which is how the two layouts get compared side by side.
 */
export const MOCK_CATEGORY_DETAILS_BY_SLUG: Readonly<Record<string, StoreCategoryDetail>> = {
  chairs: MOCK_CATEGORY_DETAIL,
  "coat-racks": MOCK_CATEGORY_DETAIL_EMPTY,
};

/** Slugs worth prerendering. Ordinary categories render on demand. */
export const MOCK_FEATURED_CATEGORY_SLUGS: readonly string[] = [
  "chairs",
  "coat-racks",
  ...ROOT_CATEGORIES.map((rootCategory) => rootCategory.slug),
];

// --- Search -----------------------------------------------------------------

/**
 * A mixed result page: products AND provider offerings in one keyset list.
 *
 * `documentKind` is the discriminant and the ONLY safe way to tell them apart. Note the
 * offering rows carry `providerKind` with `categorySlug: null`, and the product rows the
 * reverse — testing a nullable field to guess the kind would misread both.
 *
 * The last offering is quote-only: `priceInCents` and `currency` are both null, because a
 * price without its currency is unrenderable and the backend never sends one without the
 * other.
 */
export const MOCK_SEARCH_PAGE: StoreSearchPage = {
  items: [
    {
      documentKind: "product",
      entityId: "prd_folding_chair",
      publicSlug: "lv-folding-chair",
      title: "Powder-coated steel folding chair, stackable",
      summary: "Stackable to twelve high. Powder-coated frame, 150 kg static load.",
      organizationSlug: "guangdong-puda-electrical",
      organizationDisplayName: "Guangdong Puda Electrical Appliance Co., Ltd",
      organizationCountryCode: "CN",
      categorySlug: "stacking-chair",
      providerKind: null,
      priceInCents: 123_079,
      currency: "USD",
      minimumOrderQuantity: 50,
      relevanceScore: 0.842,
    },
    {
      documentKind: "product",
      entityId: "prd_office_chair",
      publicSlug: "mesh-office-chair",
      title: "Mesh-back task chair, adjustable arms",
      summary: null,
      organizationSlug: "nordlys-industrial",
      organizationDisplayName: "Nordlys Industrial AS",
      organizationCountryCode: "NO",
      categorySlug: "office-chair",
      providerKind: null,
      priceInCents: 74_900,
      currency: "EUR",
      minimumOrderQuantity: 100,
      relevanceScore: 0.771,
    },
    {
      documentKind: "provider_offering",
      entityId: "off_meridian_fcl",
      publicSlug: "meridian-fcl-asia-europe",
      title: "FCL ocean freight, South China to North Europe",
      summary: "Weekly consolidated sailings from Yantian and Shekou.",
      organizationSlug: "meridian-freight",
      organizationDisplayName: "Meridian Freight Partners",
      organizationCountryCode: "SG",
      categorySlug: null,
      providerKind: "freight_forwarder",
      priceInCents: 185_000,
      currency: "USD",
      minimumOrderQuantity: null,
      relevanceScore: 0.664,
    },
    {
      documentKind: "provider_offering",
      entityId: "off_certus_preshipment",
      publicSlug: "certus-pre-shipment-inspection",
      title: "Pre-shipment inspection, furniture and fixtures",
      summary: "AQL 2.5 sampling, photo report inside 48 hours of loading.",
      organizationSlug: "certus-inspection",
      organizationDisplayName: "Certus Inspection Services",
      organizationCountryCode: "IN",
      categorySlug: null,
      providerKind: "inspection_agency",
      priceInCents: 42_000,
      currency: "USD",
      minimumOrderQuantity: null,
      relevanceScore: 0.598,
    },
    {
      documentKind: "provider_offering",
      entityId: "off_hansa_customs",
      publicSlug: "hansa-eu-import-clearance",
      title: "EU import clearance and duty representation",
      summary: "Indirect representation for non-EU sellers in DE, NL and BE.",
      organizationSlug: "hansa-customs",
      organizationDisplayName: "Hansa Customs Agency",
      organizationCountryCode: "DE",
      categorySlug: null,
      providerKind: "customs_broker",
      // Quote-only. Both null, together — never one without the other.
      priceInCents: null,
      currency: null,
      minimumOrderQuantity: null,
      relevanceScore: 0.511,
    },
  ],
  page: { nextCursor: "cursor_search_page_2", hasMore: true },
};

/**
 * A query that matched nothing.
 *
 * Distinct from a category with no listings: this is the state that must offer a way to
 * WIDEN — clear the filters — and the page renders `StoreEmptyFilteredPanel` for it
 * rather than the plain empty panel.
 */
export const MOCK_SEARCH_PAGE_EMPTY: StoreSearchPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};
