// Store data layer for the B2B commerce surface. Mirrors the fetch+mock
// fallback shape of `cms.ts` / `videos.ts`: if `QATOTO_STORE_API_URL` is unset
// or the upstream call fails, every getter falls back to the in-file MOCK_*
// data so the UI renders without a backend. All getters are `"use cache"`.
//
// The backend is the source of truth. The category tree, pathway item sets,
// pricing, and product feeds returned here are display data only — the Express
// API must independently re-derive and re-authorize anything trusted.

export type HeroSlide = {
  id: string;
  imageSrc: string;
  title: string;
  subtitle: string;
  href: string;
};

// A node in the category tree. `childrenSlugs` empty => leaf (renders products).
// `hoverBg` is a display-only Tailwind hover class the backend supplies per node;
// dummy values are cycled from HOVER_PALETTE until the API is wired up.
export type StoreCategory = {
  slug: string;
  name: string;
  imageSrc: string;
  childrenSlugs: string[];
  hoverBg?: string;
};

export type StoreProduct = {
  id: string;
  name: string;
  subtitle?: string;
  imageSrc: string;
  price: string;
  href: string;
  hoverBg?: string;
};

// One item inside a pathway "look" — a single buyable piece of the set.
export type PathwayItem = {
  id: string;
  name: string;
  categoryLabel: string;
  imageSrc: string;
  price: string;
  href: string;
};

export type Pathway = {
  slug: string;
  title: string;
  subtitle?: string;
  imageSrc: string;
  // Vertical label baked into the hero art (e.g. "Louis Vuitton Collection").
  overlayLabel?: string;
  hoverBg?: string;
  items: PathwayItem[];
};

export type B2BLink = {
  id: string;
  label: string;
  iconSrc: string;
  href: string;
};

// A horizontally-scrolling product feed (What's New, Popular, For You, …).
export type ProductRail = {
  id: string;
  title: string;
  href: string;
  products: StoreProduct[];
};

export type StoreHome = {
  hero: HeroSlide[];
  rootCategories: StoreCategory[];
  pathways: Pathway[];
  b2bLinks: B2BLink[];
  rails: ProductRail[];
};

export type CategoryView = {
  category: StoreCategory;
  children: StoreCategory[];
  pathways: Pathway[];
  rails: ProductRail[];
};

// Dummy hover tints, cycled by index. The backend will eventually send a real
// `hoverBg` per card; until then we fan these out so cards light up like Home.
const HOVER_PALETTE = [
  "group-hover:bg-yellow-100",
  "group-hover:bg-amber-100",
  "group-hover:bg-green-100",
  "group-hover:bg-blue-100",
  "group-hover:bg-red-100",
];
const hoverAt = (i: number) => HOVER_PALETTE[i % HOVER_PALETTE.length];

const STORE_API_URL = process.env.QATOTO_STORE_API_URL;

async function storeFetch<T>(path: string): Promise<T | null> {
  if (!STORE_API_URL) return null;
  try {
    const res = await fetch(`${STORE_API_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: T = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function getStoreHome(): Promise<StoreHome> {
  "use cache";
  const remote = await storeFetch<StoreHome>("/store/home");
  return remote ?? MOCK_STORE_HOME;
}

export async function getCategory(slug: string): Promise<CategoryView | null> {
  "use cache";
  const remote = await storeFetch<CategoryView>(`/store/categories/${encodeURIComponent(slug)}`);
  if (remote) return remote;

  const category = MOCK_CATEGORIES[slug];
  if (!category) return null;

  const children = category.childrenSlugs
    .map((child) => MOCK_CATEGORIES[child])
    .filter((c): c is StoreCategory => Boolean(c))
    .map((c, i) => ({ ...c, hoverBg: hoverAt(i) }));

  return {
    category,
    children,
    pathways: MOCK_PATHWAYS.map((p, i) => ({ ...p, hoverBg: hoverAt(i) })),
    // Both leaf and branch categories surface the product feeds (What's New,
    // Popular, For You, Trending) below the sub-category grid / pathways.
    rails: MOCK_LEAF_RAILS,
  };
}

// Flat list of every category slug, for prerendering the catch-all route.
// Slugs are globally unique, so single-segment paths cover the whole tree.
export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  const remote = await storeFetch<string[]>("/store/category-slugs");
  return remote ?? Object.keys(MOCK_CATEGORIES);
}

export async function getPathway(slug: string): Promise<Pathway | null> {
  "use cache";
  const remote = await storeFetch<Pathway>(`/store/pathways/${encodeURIComponent(slug)}`);
  if (remote) return remote;
  return MOCK_PATHWAYS.find((p) => p.slug === slug) ?? null;
}

// Every pathway slug, for prerendering the pathway detail route.
export async function getPathwaySlugs(): Promise<string[]> {
  "use cache";
  const remote = await storeFetch<string[]>("/store/pathway-slugs");
  return remote ?? MOCK_PATHWAYS.map((p) => p.slug);
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    imageSrc: "/dummy/store_hero.avif",
    title: "PrecisionFlame",
    subtitle: "Timer 2 burner gas stove",
    href: "/store/pathway/steel-roll",
  },
  {
    id: "2",
    imageSrc: "/dummy/pathways_3.avif",
    title: "Bomber Drone Classic",
    subtitle: "Affordable drone for war",
    href: "/store/pathway/bomber-drone-classic",
  },
  {
    id: "3",
    imageSrc: "/dummy/pathways_4.avif",
    title: "Tata Cold Steel Roll",
    subtitle: "Industrial grade cold-rolled steel",
    href: "/store/pathway/steel-roll",
  },
];

const ROOT_CATEGORY_SLUGS = [
  "clothes",
  "furniture",
  "accessories",
  "beauty",
  "shoes",
  "bags",
  "machinery",
  "jewelry",
];

// Flat slug -> node map. Catch-all route looks up the last segment here, so
// every slug is globally unique. Empty `childrenSlugs` marks a leaf.
const MOCK_CATEGORIES: Record<string, StoreCategory> = {
  clothes: {
    slug: "clothes",
    name: "Clothes",
    imageSrc: "/dummy/clothes.avif",
    childrenSlugs: [],
  },
  accessories: {
    slug: "accessories",
    name: "Accessories",
    imageSrc: "/dummy/accessories.avif",
    childrenSlugs: [],
  },
  beauty: {
    slug: "beauty",
    name: "Beauty",
    imageSrc: "/dummy/beauty.avif",
    childrenSlugs: [],
  },
  furniture: {
    slug: "furniture",
    name: "Furniture",
    imageSrc: "/dummy/furniture.avif",
    childrenSlugs: [
      "outdoor-furniture",
      "home-furniture",
      "commercial-furniture",
      "kids-furniture",
      "furniture-hardware",
      "furniture-parts",
      "furniture-accessories",
      "other-furniture",
    ],
  },
  shoes: {
    slug: "shoes",
    name: "Shoes",
    imageSrc: "/dummy/shoes.avif",
    childrenSlugs: [],
  },
  bags: {
    slug: "bags",
    name: "Bags",
    imageSrc: "/dummy/bags.avif",
    childrenSlugs: [],
  },
  machinery: {
    slug: "machinery",
    name: "Machinery",
    imageSrc: "/dummy/machinery.avif",
    childrenSlugs: [],
  },
  jewelry: {
    slug: "jewelry",
    name: "Jewelry",
    imageSrc: "/dummy/jewelry.avif",
    childrenSlugs: [],
  },
  "outdoor-furniture": {
    slug: "outdoor-furniture",
    name: "Outdoor Furniture",
    imageSrc: "/dummy/outdoor_furniture.avif",
    childrenSlugs: [],
  },
  "home-furniture": {
    slug: "home-furniture",
    name: "Home Furniture",
    imageSrc: "/dummy/home_furniture.avif",
    childrenSlugs: [
      "sofas",
      "beds",
      "chairs",
      "coat-racks",
      "stools-and-ottomans",
      "tables",
      "vanity",
      "cabinets",
    ],
  },
  "commercial-furniture": {
    slug: "commercial-furniture",
    name: "Commercial Furniture",
    imageSrc: "/dummy/commercial_furniture.avif",
    childrenSlugs: [],
  },
  "kids-furniture": {
    slug: "kids-furniture",
    name: "Kid's Furniture",
    imageSrc: "/dummy/kid's_furniture.avif",
    childrenSlugs: [],
  },
  "furniture-hardware": {
    slug: "furniture-hardware",
    name: "Furniture Hardware",
    imageSrc: "/dummy/furniture_hardware.avif",
    childrenSlugs: [],
  },
  "furniture-parts": {
    slug: "furniture-parts",
    name: "Furniture Parts",
    imageSrc: "/dummy/furniture_parts.avif",
    childrenSlugs: [],
  },
  "furniture-accessories": {
    slug: "furniture-accessories",
    name: "Furniture Accessories",
    imageSrc: "/dummy/furniture_accessories.avif",
    childrenSlugs: [],
  },
  "other-furniture": {
    slug: "other-furniture",
    name: "Other Furniture",
    imageSrc: "/dummy/other_furniture.avif",
    childrenSlugs: [],
  },
  sofas: {
    slug: "sofas",
    name: "Sofas",
    imageSrc: "/dummy/sofas.avif",
    childrenSlugs: [],
  },
  beds: {
    slug: "beds",
    name: "Beds",
    imageSrc: "/dummy/beds.avif",
    childrenSlugs: [],
  },
  chairs: {
    slug: "chairs",
    name: "Chairs",
    imageSrc: "/dummy/chairs.avif",
    childrenSlugs: [
      "living-room-chair",
      "gaming-chair",
      "dining-chair",
      "office-chair",
      "chaise-lounge",
      "recliner",
      "stacking-chair",
      "massage-chair",
    ],
  },
  "coat-racks": {
    slug: "coat-racks",
    name: "Coat Racks",
    imageSrc: "/dummy/coat_racks.avif",
    childrenSlugs: [],
  },
  "stools-and-ottomans": {
    slug: "stools-and-ottomans",
    name: "Stools and Ottomans",
    imageSrc: "/dummy/stools_and_ottomans.avif",
    childrenSlugs: [],
  },
  tables: {
    slug: "tables",
    name: "Tables",
    imageSrc: "/dummy/tables.avif",
    childrenSlugs: [],
  },
  vanity: {
    slug: "vanity",
    name: "Vanity",
    imageSrc: "/dummy/vanity.avif",
    childrenSlugs: [],
  },
  cabinets: {
    slug: "cabinets",
    name: "Cabinets",
    imageSrc: "/dummy/cabinets.avif",
    childrenSlugs: [],
  },
  "living-room-chair": {
    slug: "living-room-chair",
    name: "Living Room Chair",
    imageSrc: "/dummy/living_room_chair.avif",
    childrenSlugs: [],
  },
  "gaming-chair": {
    slug: "gaming-chair",
    name: "Gaming Chair",
    imageSrc: "/dummy/gaming_chair.avif",
    childrenSlugs: [],
  },
  "dining-chair": {
    slug: "dining-chair",
    name: "Dining Chair",
    imageSrc: "/dummy/dining_chair.avif",
    childrenSlugs: [],
  },
  "office-chair": {
    slug: "office-chair",
    name: "Office Chair",
    imageSrc: "/dummy/office_chair.avif",
    childrenSlugs: [],
  },
  "chaise-lounge": {
    slug: "chaise-lounge",
    name: "Chaise Lounge",
    imageSrc: "/dummy/chaise_lounge.avif",
    childrenSlugs: [],
  },
  recliner: {
    slug: "recliner",
    name: "Recliner",
    imageSrc: "/dummy/recliner.avif",
    childrenSlugs: [],
  },
  "stacking-chair": {
    slug: "stacking-chair",
    name: "Stacking Chair",
    imageSrc: "/dummy/stacking_chair.avif",
    childrenSlugs: [],
  },
  "massage-chair": {
    slug: "massage-chair",
    name: "Massage Chair",
    imageSrc: "/dummy/massage_chair.avif",
    childrenSlugs: [],
  },
};

// Each product feed has its OWN mock array below — no shared source, no
// client-side reshuffle. The backend serves each feed as an independent list
// (the `rails` array in `/store/home`); these mocks mirror that 1:1 so swapping
// in the real API means dropping one array per feed, nothing else.
function railOf(id: string, title: string, products: StoreProduct[]): ProductRail {
  return {
    id,
    title,
    href: `/store/feed/${id}`,
    products: products.map((p, i) => ({ ...p, hoverBg: hoverAt(i) })),
  };
}

// --- What's New: freshly listed products ---
const WHATS_NEW_PRODUCTS: StoreProduct[] = [
  {
    id: "smart-thermostat",
    name: "Smart Thermostat",
    subtitle: "Wi-Fi climate controller",
    imageSrc: "/dummy/pathways_1.avif",
    price: "$149",
    href: "/store/pathway/smart-thermostat",
  },
  {
    id: "ev-charger",
    name: "Home EV Charger",
    subtitle: "11kW wall-mounted unit",
    imageSrc: "/dummy/pathways_2.avif",
    price: "$640",
    href: "/store/pathway/ev-charger",
  },
  {
    id: "solar-panel-kit",
    name: "Solar Panel Kit",
    subtitle: "400W monocrystalline",
    imageSrc: "/dummy/pathways_3.avif",
    price: "$320",
    href: "/store/pathway/solar-panel-kit",
  },
  {
    id: "robot-vacuum",
    name: "Robot Vacuum",
    subtitle: "LiDAR mapping, self-empty",
    imageSrc: "/dummy/pathways_4.avif",
    price: "$499",
    href: "/store/pathway/robot-vacuum",
  },
  {
    id: "air-purifier",
    name: "HEPA Air Purifier",
    subtitle: "Covers 800 sq ft",
    imageSrc: "/dummy/pathways_5.avif",
    price: "$210",
    href: "/store/pathway/air-purifier",
  },
];

// --- Popular: best-moving catalogue staples ---
const POPULAR_PRODUCTS: StoreProduct[] = [
  {
    id: "steel-roll",
    name: "Steel Roll",
    subtitle: "Tata Cold Steel Roll",
    imageSrc: "/dummy/thumbnail_image01.avif",
    price: "$890 / ton",
    href: "/store/pathway/steel-roll",
  },
  {
    id: "industrial-bearing",
    name: "Industrial Bearing Set",
    subtitle: "Sealed ball bearings, pack of 50",
    imageSrc: "/dummy/thumbnail_image02.avif",
    price: "$75",
    href: "/store/pathway/industrial-bearing",
  },
  {
    id: "copper-wire-spool",
    name: "Copper Wire Spool",
    subtitle: "99.9% pure, 100m",
    imageSrc: "/dummy/thumbnail_image03.avif",
    price: "$140 / spool",
    href: "/store/pathway/copper-wire-spool",
  },
  {
    id: "hydraulic-pump",
    name: "Hydraulic Pump",
    subtitle: "3000 PSI gear pump",
    imageSrc: "/dummy/thumbnail_image04.avif",
    price: "$430",
    href: "/store/pathway/hydraulic-pump",
  },
  {
    id: "pvc-pipe-bundle",
    name: "PVC Pipe Bundle",
    subtitle: "Schedule 40, 20-pack",
    imageSrc: "/dummy/thumbnail_image05.avif",
    price: "$60 / bundle",
    href: "/store/pathway/pvc-pipe-bundle",
  },
];

// --- For You: personalised recommendations ---
const FOR_YOU_PRODUCTS: StoreProduct[] = [
  {
    id: "louis-vuitton-collection",
    name: "Louis Vuitton Collection",
    subtitle: "Full seasonal look",
    imageSrc: "/dummy/thumbnail_image06.avif",
    price: "$4,250",
    href: "/store/pathway/louis-vuitton-collection",
  },
  {
    id: "p-designs",
    name: "P Designs",
    subtitle: "UI/UX design studio kit",
    imageSrc: "/dummy/thumbnail_image07.avif",
    price: "$1,200",
    href: "/store/pathway/p-designs",
  },
  {
    id: "leather-briefcase",
    name: "Leather Briefcase",
    subtitle: "Full-grain, handmade",
    imageSrc: "/dummy/thumbnail_image08.avif",
    price: "$680",
    href: "/store/pathway/leather-briefcase",
  },
  {
    id: "mechanical-keyboard",
    name: "Mechanical Keyboard",
    subtitle: "Hot-swap, 75% layout",
    imageSrc: "/dummy/thumbnail_image09.avif",
    price: "$160",
    href: "/store/pathway/mechanical-keyboard",
  },
  {
    id: "ergonomic-chair",
    name: "Ergonomic Office Chair",
    subtitle: "Mesh back, lumbar support",
    imageSrc: "/dummy/thumbnail_image10.avif",
    price: "$540",
    href: "/store/pathway/ergonomic-chair",
  },
];

// --- Trending: spiking demand right now ---
const TRENDING_PRODUCTS: StoreProduct[] = [
  {
    id: "bomber-drone-classic",
    name: "Bomber Drone Classic",
    subtitle: "Affordable drone for war",
    imageSrc: "/dummy/thumbnail_image11.avif",
    price: "$12,400",
    href: "/store/pathway/bomber-drone-classic",
  },
  {
    id: "thermal-scope",
    name: "Thermal Scope",
    subtitle: "640x480 sensor, 1000m range",
    imageSrc: "/dummy/thumbnail_image12.avif",
    price: "$3,900",
    href: "/store/pathway/thermal-scope",
  },
  {
    id: "steel-nail",
    name: "Steel Nail",
    subtitle: "Carbon steel concrete masonry nail",
    imageSrc: "/dummy/pathways_3.avif",
    price: "$3 / box",
    href: "/store/pathway/steel-nail",
  },
  {
    id: "tactical-backpack",
    name: "Tactical Backpack",
    subtitle: "45L MOLLE, water-resistant",
    imageSrc: "/dummy/pathways_4.avif",
    price: "$120",
    href: "/store/pathway/tactical-backpack",
  },
  {
    id: "field-generator",
    name: "Field Generator",
    subtitle: "2000W portable inverter",
    imageSrc: "/dummy/pathways_5.avif",
    price: "$1,150",
    href: "/store/pathway/field-generator",
  },
];

const MOCK_RAILS: ProductRail[] = [
  railOf("whats-new", "What's New", WHATS_NEW_PRODUCTS),
  railOf("popular", "Popular", POPULAR_PRODUCTS),
  railOf("for-you", "For You", FOR_YOU_PRODUCTS),
  railOf("trending", "Trending", TRENDING_PRODUCTS),
];

// --- Leaf-category feeds: each its own array too ---
const BEST_SELLERS_PRODUCTS: StoreProduct[] = [
  {
    id: "lv-folding-chair",
    name: "LV Folding Metal Chair",
    subtitle: "Pre-assembled, Red",
    imageSrc: "/dummy/living_room_chair.avif",
    price: "$753.80",
    href: "/store/product/lv-folding-chair",
  },
  {
    id: "tool-chest",
    name: "Rolling Tool Chest",
    subtitle: "7-drawer steel cabinet",
    imageSrc: "/dummy/thumbnail_image02.avif",
    price: "$380",
    href: "/store/pathway/tool-chest",
  },
  {
    id: "work-gloves",
    name: "Cut-resistant Work Gloves",
    subtitle: "Level 5, 12-pack",
    imageSrc: "/dummy/thumbnail_image03.avif",
    price: "$45 / pack",
    href: "/store/pathway/work-gloves",
  },
  {
    id: "led-floodlight",
    name: "LED Floodlight",
    subtitle: "150W, IP66 outdoor",
    imageSrc: "/dummy/thumbnail_image04.avif",
    price: "$70",
    href: "/store/pathway/led-floodlight",
  },
];

const NEW_ARRIVALS_PRODUCTS: StoreProduct[] = [
  {
    id: "smart-lock",
    name: "Smart Door Lock",
    subtitle: "Fingerprint + app unlock",
    imageSrc: "/dummy/thumbnail_image05.avif",
    price: "$190",
    href: "/store/pathway/smart-lock",
  },
  {
    id: "standing-desk",
    name: "Standing Desk",
    subtitle: "Electric, dual motor",
    imageSrc: "/dummy/thumbnail_image06.avif",
    price: "$420",
    href: "/store/pathway/standing-desk",
  },
  {
    id: "wireless-earbuds",
    name: "Wireless Earbuds",
    subtitle: "ANC, 30h battery",
    imageSrc: "/dummy/thumbnail_image07.avif",
    price: "$95",
    href: "/store/pathway/wireless-earbuds",
  },
  {
    id: "desk-lamp",
    name: "LED Desk Lamp",
    subtitle: "Dimmable, USB-C charging",
    imageSrc: "/dummy/thumbnail_image08.avif",
    price: "$48",
    href: "/store/pathway/desk-lamp",
  },
];

const TOP_RATED_PRODUCTS: StoreProduct[] = [
  {
    id: "espresso-machine",
    name: "Espresso Machine",
    subtitle: "15-bar, dual boiler",
    imageSrc: "/dummy/thumbnail_image09.avif",
    price: "$560",
    href: "/store/pathway/espresso-machine",
  },
  {
    id: "chef-knife-set",
    name: "Chef Knife Set",
    subtitle: "Damascus steel, 8-piece",
    imageSrc: "/dummy/thumbnail_image10.avif",
    price: "$220",
    href: "/store/pathway/chef-knife-set",
  },
  {
    id: "cast-iron-skillet",
    name: "Cast Iron Skillet",
    subtitle: "Pre-seasoned, 12 inch",
    imageSrc: "/dummy/thumbnail_image11.avif",
    price: "$40",
    href: "/store/pathway/cast-iron-skillet",
  },
  {
    id: "stand-mixer",
    name: "Stand Mixer",
    subtitle: "5.5L, 10-speed",
    imageSrc: "/dummy/thumbnail_image12.avif",
    price: "$310",
    href: "/store/pathway/stand-mixer",
  },
];

const MOCK_LEAF_RAILS: ProductRail[] = [
  railOf("best-sellers", "Best Sellers", BEST_SELLERS_PRODUCTS),
  railOf("new-arrivals", "New Arrivals", NEW_ARRIVALS_PRODUCTS),
  railOf("top-rated", "Top Rated", TOP_RATED_PRODUCTS),
];

const MOCK_PATHWAYS: Pathway[] = [
  {
    slug: "louis-vuitton-collection",
    title: "Louis Vuitton Collection",
    subtitle: "Build the full seasonal look",
    imageSrc: "/dummy/pathways_1.avif",
    overlayLabel: "Louis Vuitton Collection",
    items: [
      {
        id: "shirt",
        name: "Tailored Shirt",
        categoryLabel: "Clothes",
        imageSrc: "/dummy/thumbnail_image03.avif",
        price: "$680",
        href: "/store/clothes",
      },
      {
        id: "trousers",
        name: "Pleated Trousers",
        categoryLabel: "Clothes",
        imageSrc: "/dummy/thumbnail_image04.avif",
        price: "$540",
        href: "/store/clothes",
      },
      {
        id: "boots",
        name: "Leather Boots",
        categoryLabel: "Footwear",
        imageSrc: "/dummy/thumbnail_image05.avif",
        price: "$1,120",
        href: "/store/clothes",
      },
      {
        id: "shoulder-bag",
        name: "Shoulder Bag",
        categoryLabel: "Accessories",
        imageSrc: "/dummy/thumbnail_image06.avif",
        price: "$1,910",
        href: "/store/accessories",
      },
      {
        id: "watch",
        name: "Dress Watch",
        categoryLabel: "Accessories",
        imageSrc: "/dummy/thumbnail_image07.avif",
        price: "$2,300",
        href: "/store/accessories",
      },
    ],
  },
  {
    slug: "p-designs",
    title: "P Designs",
    subtitle: "Everything a design studio ships with",
    imageSrc: "/dummy/pathways_2.avif",
    items: [
      {
        id: "design-system",
        name: "Design System License",
        categoryLabel: "Software",
        imageSrc: "/dummy/thumbnail_image01.avif",
        price: "$600",
        href: "/store/clothes",
      },
      {
        id: "ui-kit",
        name: "Mobile UI Kit",
        categoryLabel: "Templates",
        imageSrc: "/dummy/thumbnail_image02.avif",
        price: "$300",
        href: "/store/clothes",
      },
      {
        id: "icon-pack",
        name: "Icon Pack Pro",
        categoryLabel: "Assets",
        imageSrc: "/dummy/thumbnail_image03.avif",
        price: "$120",
        href: "/store/clothes",
      },
      {
        id: "handoff-tool",
        name: "Dev Handoff Tool",
        categoryLabel: "Software",
        imageSrc: "/dummy/thumbnail_image04.avif",
        price: "$180",
        href: "/store/clothes",
      },
    ],
  },
  {
    slug: "steel-nail",
    title: "Steel Nail",
    subtitle: "Carbon steel concrete masonry nail",
    imageSrc: "/dummy/pathways_3.avif",
    items: [
      {
        id: "masonry-nail",
        name: "Masonry Nail Box",
        categoryLabel: "Fasteners",
        imageSrc: "/dummy/thumbnail_image05.avif",
        price: "$3 / box",
        href: "/store/accessories",
      },
      {
        id: "nail-gun",
        name: "Pneumatic Nail Gun",
        categoryLabel: "Tools",
        imageSrc: "/dummy/thumbnail_image06.avif",
        price: "$240",
        href: "/store/accessories",
      },
      {
        id: "compressor",
        name: "Air Compressor",
        categoryLabel: "Tools",
        imageSrc: "/dummy/thumbnail_image07.avif",
        price: "$410",
        href: "/store/accessories",
      },
    ],
  },
  {
    slug: "bomber-drone-classic",
    title: "Bomber Drone Classic",
    subtitle: "Affordable drone for war",
    imageSrc: "/dummy/pathways_4.avif",
    items: [
      {
        id: "drone-frame",
        name: "Carbon Drone Frame",
        categoryLabel: "Airframe",
        imageSrc: "/dummy/thumbnail_image08.avif",
        price: "$2,100",
        href: "/store/accessories",
      },
      {
        id: "battery-pack",
        name: "High-density Battery Pack",
        categoryLabel: "Power",
        imageSrc: "/dummy/thumbnail_image09.avif",
        price: "$1,800",
        href: "/store/accessories",
      },
      {
        id: "controller",
        name: "Ground Controller",
        categoryLabel: "Avionics",
        imageSrc: "/dummy/thumbnail_image10.avif",
        price: "$3,400",
        href: "/store/accessories",
      },
      {
        id: "camera-module",
        name: "Thermal Camera Module",
        categoryLabel: "Payload",
        imageSrc: "/dummy/thumbnail_image11.avif",
        price: "$5,100",
        href: "/store/accessories",
      },
    ],
  },
  {
    slug: "steel-roll",
    title: "Steel Roll",
    subtitle: "Tata Cold Steel Roll",
    imageSrc: "/dummy/pathways_5.avif",
    items: [
      {
        id: "cold-roll",
        name: "Cold-rolled Coil",
        categoryLabel: "Raw Material",
        imageSrc: "/dummy/thumbnail_image12.avif",
        price: "$890 / ton",
        href: "/store/furniture",
      },
      {
        id: "galvanized-sheet",
        name: "Galvanized Sheet",
        categoryLabel: "Raw Material",
        imageSrc: "/dummy/thumbnail_image01.avif",
        price: "$960 / ton",
        href: "/store/furniture",
      },
      {
        id: "slitting-service",
        name: "Slitting Service",
        categoryLabel: "Processing",
        imageSrc: "/dummy/thumbnail_image02.avif",
        price: "$40 / ton",
        href: "/store/furniture",
      },
    ],
  },
];

const MOCK_B2B_LINKS: B2BLink[] = [
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

const MOCK_STORE_HOME: StoreHome = {
  hero: HERO_SLIDES,
  rootCategories: ROOT_CATEGORY_SLUGS.map((slug, i) => ({
    ...MOCK_CATEGORIES[slug],
    hoverBg: hoverAt(i),
  })),
  pathways: MOCK_PATHWAYS.map((p, i) => ({ ...p, hoverBg: hoverAt(i) })),
  b2bLinks: MOCK_B2B_LINKS,
  rails: MOCK_RAILS,
};
