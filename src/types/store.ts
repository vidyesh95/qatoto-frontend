// Shared domain types for the B2B store/commerce surface. Data truth lives in
// the Express backend; these shapes are the client-side contract only.

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

export type ProductPricingTier = {
  unitPrice: string;
  minimumOrderQuantity: string;
};

export type AddressLabel = "HOME" | "WORK" | "OTHER";

export type Address = {
  id: string;
  recipientName: string;
  pincode: string;
  fullAddress: string;
  label: AddressLabel;
};
