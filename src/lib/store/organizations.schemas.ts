// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client-side contract for the seller storefront, `GET /store/organizations/:slug`.
// Data truth lives in the Express backend; these Zod schemas parse an untrusted
// response payload (CLAUDE.md Pattern 2 — never `as`/`any` on the network) and
// `.strip()` keeps the client forward-compatible with backend minor additions.
//
// THE ONE RULE THIS FILE ENCODES: what a seller ASSERTS about itself and what the
// platform MEASURED are two separate objects, never one flat stat list. The backend
// separated them deliberately (`store-catalog.service.ts` A13) because "founded 2009,
// per the seller" and "98.6% on-time across 412 orders" are different kinds of claim,
// and a single `{label, value}[]` array teaches a client to render the first as the
// second. Keeping `declaredProfile` and `measuredMetrics` apart here makes that
// mistake unavailable rather than merely discouraged.

import { z } from "zod";

// --- Wire enums -------------------------------------------------------------
// Postgres `pgEnum` labels, sent verbatim in both directions. These are DATA, not
// identifiers — do not "correct" them to kebab-case (CLAUDE.md wire-casing rule).
// Authority is `src/db/schema.ts` in the backend repo.

export const SELLER_BUSINESS_TYPES = [
  "manufacturer",
  "trading_company",
  "manufacturer_trading",
  "agent",
  "distributor",
] as const;

export const ORGANIZATION_MEDIA_KINDS = [
  "factory",
  "office",
  "warehouse",
  "production_line",
  "showcase",
] as const;

export const SITE_ACCESS_MODES = ["road", "sea", "air", "rail"] as const;

export const ORGANIZATION_CAPABILITY_KINDS = [
  "oem",
  "odm",
  "customization",
  "in_house_inspection",
  "in_house_rnd",
  "sample_production",
] as const;

export const VISIT_POLICIES = ["welcome", "by_appointment", "not_available"] as const;

export const STORE_STOCK_STATES = [
  "in_stock",
  "low_stock",
  "made_to_order",
  "unavailable",
] as const;

export const PRODUCT_SAMPLE_POLICIES = ["unavailable", "paid", "refundable"] as const;

export const PRODUCT_CONDITIONS = ["new", "refurbished", "used"] as const;

export type SellerBusinessType = (typeof SELLER_BUSINESS_TYPES)[number];
export type OrganizationMediaKind = (typeof ORGANIZATION_MEDIA_KINDS)[number];
export type SiteAccessMode = (typeof SITE_ACCESS_MODES)[number];
export type OrganizationCapabilityKind = (typeof ORGANIZATION_CAPABILITY_KINDS)[number];
export type VisitPolicy = (typeof VISIT_POLICIES)[number];

// --- Declared profile — what the seller says about itself --------------------

export const OrganizationMediaSchema = z
  .object({
    id: z.string(),
    mediaKind: z.enum(ORGANIZATION_MEDIA_KINDS),
    imageUrl: z.string(),
    altText: z.string().nullable(),
    widthPx: z.number().int(),
    heightPx: z.number().int(),
    position: z.number().int(),
  })
  .strip();

export const OrganizationSiteAccessSchema = z
  .object({
    id: z.string(),
    accessMode: z.enum(SITE_ACCESS_MODES),
    facilityName: z.string(),
    distanceKm: z.number().int().nullable(),
    notes: z.string().nullable(),
    position: z.number().int(),
  })
  .strip();

// No email, no phone, and no column for one. A name and a role title are what a
// company already prints on its own site; a direct line to a named individual is
// personal data. The backend table cannot hold it — neither can this schema.
export const OrganizationStakeholderSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    roleTitle: z.string(),
    photoUrl: z.string().nullable(),
    position: z.number().int(),
  })
  .strip();

export const OrganizationCapabilitySchema = z
  .object({
    id: z.string(),
    capabilityKind: z.enum(ORGANIZATION_CAPABILITY_KINDS),
    detail: z.string().nullable(),
    position: z.number().int(),
  })
  .strip();

// `approvedAt` is the ONE field on the declared profile carrying a platform decision —
// the backend ships only approved certifications, and a null here means the row was
// never adjudicated. Lapsing is NOT a state: it is `validUntil < today`, evaluated at
// render time, because a stored `expired` flag would be wrong between nightly ticks.
export const OrganizationCertificationSchema = z
  .object({
    id: z.string(),
    standardName: z.string(),
    issuerName: z.string(),
    certificateNumber: z.string(),
    scopeSummary: z.string().nullable(),
    validFrom: z.string(),
    validUntil: z.string(),
    approvedAt: z.string().nullable(),
  })
  .strip();

export const SellerDeclaredProfileSchema = z
  .object({
    yearFounded: z.number().int().nullable(),
    factoryCount: z.number().int().nullable(),
    totalStaffCount: z.number().int().nullable(),
    productionLineCount: z.number().int().nullable(),
    factoryAreaSquareMetres: z.number().int().nullable(),
    businessType: z.enum(SELLER_BUSINESS_TYPES).nullable(),
    visitPolicy: z.enum(VISIT_POLICIES).nullable(),
    acceptingCustomOrders: z.boolean(),
    publicSummary: z.string().nullable(),
    // The seller's own estimate. The MEASURED figure is
    // `measuredMetrics.measuredResponseTimeHours` and lives in the other object.
    declaredResponseTimeHours: z.number().int().nullable(),
    media: z.array(OrganizationMediaSchema),
    siteAccess: z.array(OrganizationSiteAccessSchema),
    stakeholders: z.array(OrganizationStakeholderSchema),
    capabilities: z.array(OrganizationCapabilitySchema),
    certifications: z.array(OrganizationCertificationSchema),
  })
  .strip();

// --- Measured metrics — what the platform observed ---------------------------

// Each rate ships with its own sample size, and a rate is `null` below the backend's
// minimum sample. Null means ABSENCE OF EVIDENCE — render "not enough data yet", never
// zero and never an invented number. The thresholds themselves are deliberately off the
// wire, so do not render a countdown to one.
export const OrganizationMeasuredMetricsSchema = z
  .object({
    onTimeShipmentRate: z.number().nullable(),
    onTimeSampleSize: z.number().int(),
    completedOrderCount: z.number().int(),
    reorderRate: z.number().nullable(),
    reorderSampleSize: z.number().int(),
    measuredResponseTimeHours: z.number().nullable(),
    responseSampleSize: z.number().int(),
  })
  .strip();

// --- Catalog ----------------------------------------------------------------

export const StoreSellerSummarySchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    countryCode: z.string(),
    logoUrl: z.string().nullable(),
    summary: z.string().nullable(),
  })
  .strip();

export const StoreProductCardSchema = z
  .object({
    id: z.string(),
    publicSlug: z.string(),
    title: z.string(),
    brand: z.string().nullable(),
    currency: z.string(),
    priceInCents: z.number().int(),
    compareAtPriceInCents: z.number().int().nullable(),
    minimumOrderQuantity: z.number().int().nullable(),
    stockState: z.enum(STORE_STOCK_STATES),
    // True means `priceInCents` is a "from" price and the buyer must choose a variant
    // before the line can be added to a cart — not inferable from the price alone.
    hasVariants: z.boolean(),
    variantCount: z.number().int(),
    condition: z.enum(PRODUCT_CONDITIONS),
    samplePolicy: z.enum(PRODUCT_SAMPLE_POLICIES),
    leadTimeMinDays: z.number().int().nullable(),
    leadTimeMaxDays: z.number().int().nullable(),
    mainImageUrl: z.string().nullable(),
    seller: StoreSellerSummarySchema,
    category: z.object({ id: z.string(), slug: z.string(), name: z.string() }).strip(),
    reviewMetrics: z
      .object({ averageRating: z.number().nullable(), reviewCount: z.number().int() })
      .strip(),
  })
  .strip();

// --- Storefront -------------------------------------------------------------

export const StoreOrganizationStorefrontSchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    summary: z.string().nullable(),
    countryCode: z.string(),
    logoUrl: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    // Null when this organization has never described itself — NOT an empty object.
    // "We have no profile for this seller" and "this seller filled in the form and left
    // it blank" are different facts, and only one is worth an empty state.
    declaredProfile: SellerDeclaredProfileSchema.nullable(),
    // Never null: an organization with no orders still has measured metrics, and they
    // are zeros and nulls with honest sample sizes.
    measuredMetrics: OrganizationMeasuredMetricsSchema,
    products: z
      .object({
        items: z.array(StoreProductCardSchema),
        page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }).strip(),
      })
      .strip(),
  })
  .strip();

// The response envelope every store controller returns.
export const StorefrontEnvelopeSchema = z
  .object({ data: StoreOrganizationStorefrontSchema })
  .strip();

export type OrganizationMedia = z.infer<typeof OrganizationMediaSchema>;
export type OrganizationSiteAccess = z.infer<typeof OrganizationSiteAccessSchema>;
export type OrganizationStakeholder = z.infer<typeof OrganizationStakeholderSchema>;
export type OrganizationCapability = z.infer<typeof OrganizationCapabilitySchema>;
export type OrganizationCertification = z.infer<typeof OrganizationCertificationSchema>;
export type SellerDeclaredProfile = z.infer<typeof SellerDeclaredProfileSchema>;
export type OrganizationMeasuredMetrics = z.infer<typeof OrganizationMeasuredMetricsSchema>;
export type StoreProductCard = z.infer<typeof StoreProductCardSchema>;
export type StoreOrganizationStorefront = z.infer<typeof StoreOrganizationStorefrontSchema>;

// --- Frontend-only profile --------------------------------------------------
//
// EVERYTHING HERE IS UNBACKED. `commerce_seller_profile` has no column for any of it,
// so it is deliberately NOT part of `StoreOrganizationStorefrontSchema` — a future
// backend cannot start filling these with something that means something else, because
// the parser would strip it. It exists only on the mock, and is `null` the moment a
// real response is parsed. Each field names the backend column it would need.
//
// See the follow-up section of the plan: registered capital, factory-visit schedule and
// fee, and a per-site table carrying each factory's address.

export type FactorySite = {
  id: string;
  /** Would need a `commerce_organization_site` table — the backend has only a count. */
  name: string;
  city: string;
  countryLabel: string;
  addressLine: string;
  floorAreaSquareMetres: number;
  productionLineCount: number;
  yearEstablished: number;
};

export type FactoryTourPolicy = {
  /** Would need `commerce_seller_profile.visit_available_days`. */
  availableDays: string;
  /** Would need `commerce_seller_profile.visit_hours`. */
  visitingHours: string;
  /** Would need `commerce_seller_profile.visit_booking_lead_days`. */
  bookingLeadDays: number;
  /**
   * Would need `commerce_seller_profile.visit_fee_in_cents` (+ currency). Integer
   * cents, never a formatted string — a client cannot compare "US $120".
   * Zero is free; that is a real answer, unlike null.
   */
  feeInCents: number;
  currency: string;
  /** Would need a `commerce_organization_visit_inclusion` table. */
  inclusions: string[];
  /** Would need `commerce_seller_profile.visit_languages`. */
  interpreterLanguages: string[];
};

export type FrontendOnlySellerProfile = {
  /** Would need `commerce_seller_profile.registered_capital_in_cents` (+ currency). */
  registeredCapitalInCents: number;
  registeredCapitalCurrency: string;
  /** Would need `commerce_seller_profile.business_registration_number`. */
  businessRegistrationNumber: string;
  factorySites: FactorySite[];
  factoryTour: FactoryTourPolicy;
};

/**
 * What the page actually renders: the parsed contract, plus the unbacked extras when
 * (and only when) the data came from the mock. A real parsed response carries
 * `frontendOnlyProfile: null`, and every section that reads it degrades to the subset
 * the backend genuinely has.
 */
export type OrganizationStorefrontView = StoreOrganizationStorefront & {
  frontendOnlyProfile: FrontendOnlySellerProfile | null;
};

// --- Display maps -----------------------------------------------------------
//
// These live in src/lib rather than src/mocks because they are NOT data: they survive
// every phase, whereas a mock is deleted the moment its route is wired. English copy is
// a web-client concern — the wire carries the enum value and each client localizes it.

export const BUSINESS_TYPE_LABELS: Record<SellerBusinessType, string> = {
  manufacturer: "Manufacturer",
  trading_company: "Trading company",
  manufacturer_trading: "Manufacturer & trading company",
  agent: "Agent",
  distributor: "Distributor",
};

export const MEDIA_KIND_LABELS: Record<OrganizationMediaKind, string> = {
  factory: "Factory",
  office: "Office",
  warehouse: "Warehouse",
  production_line: "Production line",
  showcase: "Showcase",
};

export const SITE_ACCESS_MODE_LABELS: Record<SiteAccessMode, string> = {
  road: "Road freight",
  sea: "Sea freight",
  air: "Air freight",
  rail: "Rail freight",
};

export const SITE_ACCESS_MODE_ICONS: Record<SiteAccessMode, string> = {
  road: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  sea: "directions_boat_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  air: "flight_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  rail: "train_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
};

export const CAPABILITY_KIND_LABELS: Record<OrganizationCapabilityKind, string> = {
  oem: "OEM",
  odm: "ODM",
  customization: "Full customization",
  in_house_inspection: "In-house inspection",
  in_house_rnd: "In-house R&D",
  sample_production: "Sample production",
};

export const CAPABILITY_KIND_ICONS: Record<OrganizationCapabilityKind, string> = {
  oem: "factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  odm: "category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  customization: "category_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
  in_house_inspection: "fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  in_house_rnd: "science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  sample_production: "workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
};

export const VISIT_POLICY_LABELS: Record<VisitPolicy, string> = {
  welcome: "Buyers welcome on site",
  by_appointment: "Visits by appointment only",
  not_available: "Site visits not available",
};

export type StoreStockState = (typeof STORE_STOCK_STATES)[number];
export type ProductSamplePolicy = (typeof PRODUCT_SAMPLE_POLICIES)[number];

export const STOCK_STATE_LABELS: Record<StoreStockState, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  made_to_order: "Made to order",
  unavailable: "Unavailable",
};

export const SAMPLE_POLICY_LABELS: Record<ProductSamplePolicy, string> = {
  unavailable: "No samples",
  paid: "Paid sample",
  refundable: "Refundable sample",
};

// --- Formatters -------------------------------------------------------------

export function formatPercentageLabel(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// Money crosses the wire as integer cents and is formatted only at the edge — the
// division happens here and nowhere else, so no arithmetic is ever done on the result.
export function formatCentsLabel(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

export function formatSquareMetresLabel(squareMetres: number): string {
  return `${squareMetres.toLocaleString("en-US")} m²`;
}

export function countryLabelFromCode(countryCode: string): string {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  return displayNames.of(countryCode.toUpperCase()) ?? countryCode;
}
