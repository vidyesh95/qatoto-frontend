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

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

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

/**
 * The tuple as a parser, so a `<select>` in the studio can NARROW its string value instead of
 * asserting it — the same shape `CommerceCategoryStateSchema` gives the category admin.
 */
export const ProductSamplePolicySchema = z.enum(PRODUCT_SAMPLE_POLICIES);

export const PRODUCT_CONDITIONS = ["new", "refurbished", "used"] as const;

/**
 * §21.2. Whether the SELLER still intends to sell this listing.
 *
 * ⚠️ NOT `stockState`, WHICH IS A MEASUREMENT. `unavailable` there means nothing is on hand right
 * now; `discontinued` here means it is not coming back. A listing can be `in_stock` and
 * `discontinued` at once — the seller is clearing the last of it — and collapsing the two would
 * lose that.
 *
 * Values are pgEnum labels and travel verbatim.
 */
export const PRODUCT_SELLING_STATES = ["selling", "paused", "discontinued"] as const;

/** The tuple as a parser, so a studio `<select>` narrows rather than asserts. */
export const ProductSellingStateSchema = z.enum(PRODUCT_SELLING_STATES);

export const ORGANIZATION_TRADE_STATES = ["pending", "active", "suspended", "closed"] as const;

/**
 * A37. Which of two very different rows a `pending` organization is.
 *
 * `auto_provisioned` is a shell the SERVER minted on the caller's first cart tap, holding no
 * claim anybody made. `self_declared` is an organization somebody described — and declaring a
 * country is the write that flips one into the other, because that write **is** the act of
 * asking to be reviewed. A moderation queue that could not tell them apart would drown in
 * shells.
 */
export const ORGANIZATION_PROVISIONING_ORIGINS = ["self_declared", "auto_provisioned"] as const;

export const ORGANIZATION_TYPES = [
  "company",
  "sole_proprietor",
  "cooperative",
  "government",
  "nonprofit",
] as const;

export const ORGANIZATION_VISIBILITIES = ["private", "public"] as const;

export const ORGANIZATION_MEMBER_ROLES = [
  "owner",
  "administrator",
  "buyer",
  "seller",
  "provider_operator",
  "finance",
  "support",
  "viewer",
] as const;

export const ORGANIZATION_MEMBER_STATES = ["invited", "active", "suspended", "left"] as const;

export type SellerBusinessType = (typeof SELLER_BUSINESS_TYPES)[number];
export type OrganizationMediaKind = (typeof ORGANIZATION_MEDIA_KINDS)[number];
export type SiteAccessMode = (typeof SITE_ACCESS_MODES)[number];
export type OrganizationCapabilityKind = (typeof ORGANIZATION_CAPABILITY_KINDS)[number];
export type VisitPolicy = (typeof VISIT_POLICIES)[number];
export type OrganizationTradeState = (typeof ORGANIZATION_TRADE_STATES)[number];
export type OrganizationProvisioningOrigin = (typeof ORGANIZATION_PROVISIONING_ORIGINS)[number];
export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];

// --- The caller's own commerce workspace ------------------------------------
//
// `GET /commerce/organizations/mine` — the ONE read that sees an organization the caller
// belongs to rather than one the public browses, and the only place `countryCode` is nullable.
//
// WHY THE NULL IS HERE AND NOWHERE ELSE. Phase 21 made `commerce_organization.country_code`
// nullable so an auto-provisioned shell can exist without the platform inventing a country it
// was never told (A37). `commerce_organization_country_pending_ck` confines that absence to
// `pending` rows, and every PUBLIC read — catalog, search, storefront, provider directory —
// filters `trade_state = 'active'` before projecting, so none of them can observe it. Their
// wire contracts are correspondingly non-null and the backend refuses to widen them
// (`commerce-organization-country.ts`). So `StoreSellerSummarySchema` and
// `StoreOrganizationStorefrontSchema` below keep `countryCode: z.string()` and that is
// correct — do not "fix" them to match this one.

/**
 * One organization the caller is an active member of.
 *
 * `countryCode` NULL is an unanswered question, never a blank field and never a default. Read
 * it beside `provisioningOrigin` — together they say whether this is a shell the server minted
 * or a company somebody described that has not named its country yet.
 */
export const MyCommerceOrganizationSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    legalName: z.string(),
    displayName: z.string(),
    summary: z.string().nullable(),
    organizationType: z.enum(ORGANIZATION_TYPES),
    tradeState: z.enum(ORGANIZATION_TRADE_STATES),
    visibility: z.enum(ORGANIZATION_VISIBILITIES),
    countryCode: z.string().nullable(),
    provisioningOrigin: z.enum(ORGANIZATION_PROVISIONING_ORIGINS),
    logoUrl: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strip();

/**
 * The row `GET /commerce/organizations/mine` returns — the organization AND the caller's
 * membership in it.
 *
 * The membership `role` is here because the read returns it, and for no other reason. It must
 * not become a client-side permission check: every route re-authorizes, and a `seller` role in
 * a component is one step from a UI that decides what the server is allowed to do. Use it to
 * decide what to OFFER, never what to allow.
 */
export const MyCommerceOrganizationMembershipSchema = z
  .object({
    organization: MyCommerceOrganizationSchema,
    membership: z
      .object({
        id: z.string(),
        role: z.enum(ORGANIZATION_MEMBER_ROLES),
        state: z.enum(ORGANIZATION_MEMBER_STATES),
      })
      .strip(),
  })
  .strip();

export const MyCommerceOrganizationListSchema = z.array(MyCommerceOrganizationMembershipSchema);

export type MyCommerceOrganization = z.infer<typeof MyCommerceOrganizationSchema>;
export type MyCommerceOrganizationMembership = z.infer<
  typeof MyCommerceOrganizationMembershipSchema
>;

/**
 * `PATCH /commerce/organizations/:organizationId`.
 *
 * `.strict()` on the backend and at least one key required, so an empty patch is a 422 rather
 * than a no-op. Four of the five fields are ordinary profile edits; `countryCode` is not — see
 * `updateCommerceOrganization` in the api module for what sending it means.
 *
 * `countryCode` IS NOT NULLABLE HERE even though the column is. A shell may never have declared
 * one; an organization that has may not un-declare it, because the row may already be trading
 * and the CHECK would refuse the write anyway.
 */
export interface UpdateCommerceOrganizationInput {
  readonly displayName?: string;
  readonly summary?: string | null;
  readonly websiteUrl?: string | null;
  readonly visibility?: (typeof ORGANIZATION_VISIBILITIES)[number];
  readonly countryCode?: string;
}

/**
 * How far the caller's buyer workspace is from being able to CONFIRM a checkout.
 *
 * WHY THIS EXISTS AT ALL. A37 made the buyer path start working for a brand-new account: the first
 * cart call mints a `pending` workspace, and the cart, `checkout/prepare`, RFQ drafting and
 * messaging all run on it. `checkout/confirm` does NOT — it keeps
 * `requireActiveBuyerCommerceOrganization`, because §14's rule is that a cart is a draft and an
 * order is not. So a buyer can fill a cart, price it, reserve stock, and then be refused with a
 * `403` at the last step, with nothing on the screen saying why or what to do.
 *
 * This is what the checkout renders instead of that silence.
 *
 * IT DECIDES WHAT TO OFFER, NEVER WHAT IS ALLOWED. `ready` does not mean the confirm will succeed —
 * the server re-authorizes every request and may refuse for reasons this read cannot see. It means
 * there is nothing useful to say in advance, so say nothing.
 */
export type BuyerWorkspaceReadiness =
  /** The read has not answered, or answered `401`. Render nothing rather than guessing. */
  | { status: "unknown" }
  /** At least one active membership. Nothing to prompt for. */
  | { status: "ready" }
  /** A `pending` workspace with no country yet — the one state the buyer can act on themselves. */
  | { status: "country_required"; organization: MyCommerceOrganization }
  /** A `pending` workspace that has declared a country. Now it is a moderator's decision. */
  | { status: "awaiting_review"; organization: MyCommerceOrganization }
  /** Every membership is `suspended` or `closed`. Not something a form fixes. */
  | { status: "blocked"; organizations: readonly MyCommerceOrganization[] }
  /** Signed in, belongs to nothing. The first cart write mints the shell — this read does not. */
  | { status: "none" };

/**
 * Reads the readiness off `GET /commerce/organizations/mine`.
 *
 * `country_required` IS PREFERRED OVER `awaiting_review` when the caller has several pending rows,
 * because one of those states has an action behind it and the other does not — showing the buyer
 * the waiting message while a form would have unblocked them is the worse of the two mistakes.
 *
 * WHICH ORGANIZATION IS NAMED IS A DISPLAY CHOICE, NOT A CLAIM about which one the server will use.
 * `requireProvisionedBuyerCommerceWorkspace` resolves the workspace from the session pointer and
 * the caller's buyer-capable memberships, and the client cannot and must not reproduce that. The
 * list arrives ordered `(displayName, id)` server-side, so picking the first match is at least
 * stable across reloads. In the case this was built for — a shell the server just minted — there is
 * exactly one row and the question does not arise.
 */
export function deriveBuyerWorkspaceReadiness(
  memberships: readonly MyCommerceOrganizationMembership[],
): BuyerWorkspaceReadiness {
  if (memberships.length === 0) return { status: "none" };

  const organizations = memberships.map((membership) => membership.organization);
  if (organizations.some((organization) => organization.tradeState === "active")) {
    return { status: "ready" };
  }

  const pending = organizations.filter((organization) => organization.tradeState === "pending");
  const undeclared = pending.find((organization) => organization.countryCode === null);
  if (undeclared !== undefined) return { status: "country_required", organization: undeclared };

  const declared = pending[0];
  if (declared !== undefined) return { status: "awaiting_review", organization: declared };

  return { status: "blocked", organizations };
}

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
    /**
     * §21.2. On the CARD, not just the detail, because a grid is where a buyer decides what to
     * open. `selling` is the ordinary case and renders nothing.
     */
    sellingState: z.enum(PRODUCT_SELLING_STATES),
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

// `StorefrontEnvelopeSchema` is GONE. It parsed the `{ data: … }` wrapper because the legacy
// `src/lib/store.ts` fetched with a bare `fetch` and got the whole envelope back. Every read now
// goes through `getJson`, which unwraps `envelope.data` once, centrally, and hands the payload to
// the schema — so a per-domain envelope schema is a second unwrapping that would silently never
// match.

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
export type ProductSellingState = (typeof PRODUCT_SELLING_STATES)[number];

export const STOCK_STATE_LABELS: Record<StoreStockState, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  made_to_order: "Made to order",
  unavailable: "Unavailable",
};

/**
 * §21.2. What a buyer is told. `selling` has NO label because it is never rendered — a listing
 * being for sale is the unremarkable case, and a badge saying so on every card would make the two
 * that matter invisible.
 */
export const SELLING_STATE_LABELS: Record<Exclude<ProductSellingState, "selling">, string> = {
  paused: "Paused by seller",
  discontinued: "Discontinued",
};

/**
 * §21.2. The FACET row needs all three, unlike the badge map above.
 *
 * A chip row renders whatever buckets the backend counted, and `selling` is one of them — so a map
 * that omitted it would render the raw wire value "selling" as a chip label. It reads "Currently
 * sold" rather than "Selling" because the row is answering "show me which", not describing a state.
 */
export const SELLING_STATE_FACET_LABELS: Record<ProductSellingState, string> = {
  selling: "Currently sold",
  paused: "Paused",
  discontinued: "Discontinued",
};

export const SAMPLE_POLICY_LABELS: Record<ProductSamplePolicy, string> = {
  unavailable: "No samples",
  paid: "Paid sample",
  refundable: "Refundable sample",
};

// --- Formatters -------------------------------------------------------------
//
// MOVED to `@/lib/store/format.ts` and re-exported here.
//
// They were defined in this file while the storefront was the only wired store surface.
// Eighteen surfaces need them now, and importing a formatter FROM A SCHEMA FILE teaches
// everyone to put formatters in schema files. The re-export keeps the fourteen
// `sections/organization/*` files importing from where they already do — a rename across
// them would be a diff with no behavior in it.
//
// New code should import from `@/lib/store/format.ts` directly.

export {
  countryLabelFromCode,
  formatCentsLabel,
  formatPercentageLabel,
  formatSquareMetresLabel,
} from "@/lib/store/format";
