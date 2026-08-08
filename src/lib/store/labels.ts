/**
 * Wire enums and their display labels for the store catalog.
 *
 * Values stay snake_case because they are Postgres `pgEnum` labels sent verbatim in both
 * directions (CLAUDE.md wire-casing). The English strings are a WEB-CLIENT concern — the
 * backend never sends prose, so each client maps the enum to its own copy.
 *
 * Every `Record<TheEnumType, string>` below is deliberate: adding a member to a tuple is a
 * compile error until its label exists.
 */

/** Derived server-side from stock quantity + lead time. The client never recomputes it. */
export const STOCK_STATES = ["in_stock", "low_stock", "made_to_order", "unavailable"] as const;
export type StockState = (typeof STOCK_STATES)[number];

/** `product_sample_policy`. */
export const SAMPLE_POLICIES = ["unavailable", "paid", "refundable"] as const;
export type SamplePolicy = (typeof SAMPLE_POLICIES)[number];

/**
 * The ONLY sort the backend accepts on `/store/search`.
 *
 * This tuple used to also carry `newest`, `price_asc`, `price_desc` and
 * `minimum_order_quantity_asc`. None of them exist: the query schema is
 * `z.enum(["relevance"])` under `.strict()`, so sending any of the other four was a 422
 * that took the whole search page down.
 */
export const STORE_SEARCH_SORTS = ["relevance"] as const;
export type StoreSearchSort = (typeof STORE_SEARCH_SORTS)[number];

/** `store_search_document_kind` — a search hit is a product OR a provider offering. */
export const STORE_SEARCH_DOCUMENT_KINDS = ["product", "provider_offering"] as const;
export type StoreSearchDocumentKind = (typeof STORE_SEARCH_DOCUMENT_KINDS)[number];

/** `store_merchandising_entity_kind` — what a hero slide or placement points at. */
export const STORE_MERCHANDISING_ENTITY_KINDS = [
  "product",
  "category",
  "organization",
  "provider_offering",
] as const;
export type StoreMerchandisingEntityKind = (typeof STORE_MERCHANDISING_ENTITY_KINDS)[number];

/** `store_rail_strategy`. `trending_placeholder` always returns an empty list — by design. */
export const STORE_RAIL_STRATEGIES = ["curated", "newest", "trending_placeholder"] as const;
export type StoreRailStrategy = (typeof STORE_RAIL_STRATEGIES)[number];

/** `commerce_provider_kind_slug` — the nine connector kinds. */
export const COMMERCE_PROVIDER_KINDS = [
  "freight_forwarder",
  "logistics_operator",
  "customs_broker",
  "insurance_provider",
  "inspection_agency",
  "testing_certification_lab",
  "marketing_agency",
  "warehouse_provider",
  "foreign_exchange_facilitator",
] as const;
export type CommerceProviderKind = (typeof COMMERCE_PROVIDER_KINDS)[number];

/** `commerce_provider_verification_state`. Profile-level, NOT per-kind (STORE_STRUCTURE §9.1). */
export const PROVIDER_VERIFICATION_STATES = [
  "unverified",
  "documents_pending",
  "verified",
  "rejected",
  "suspended",
] as const;
export type ProviderVerificationState = (typeof PROVIDER_VERIFICATION_STATES)[number];

/** `commerce_service_pricing_model`. */
export const SERVICE_PRICING_MODELS = [
  "quote_only",
  "fixed_fee",
  "per_unit",
  "subscription",
] as const;
export type ServicePricingModel = (typeof SERVICE_PRICING_MODELS)[number];

const STOCK_STATE_LABELS: Record<StockState, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  made_to_order: "Made to order",
  unavailable: "Unavailable",
};

const SAMPLE_POLICY_LABELS: Record<SamplePolicy, string> = {
  unavailable: "Samples unavailable",
  paid: "Paid sample",
  refundable: "Refundable sample",
};

const SEARCH_SORT_LABELS: Record<StoreSearchSort, string> = {
  relevance: "Relevance",
};

const SEARCH_DOCUMENT_KIND_LABELS: Record<StoreSearchDocumentKind, string> = {
  product: "Products",
  provider_offering: "Services",
};

const PROVIDER_KIND_LABELS: Record<CommerceProviderKind, string> = {
  freight_forwarder: "Freight forwarder",
  logistics_operator: "Logistics operator",
  customs_broker: "Customs broker",
  insurance_provider: "Insurance provider",
  inspection_agency: "Inspection agency",
  testing_certification_lab: "Testing & certification lab",
  marketing_agency: "Marketing agency",
  warehouse_provider: "Warehouse provider",
  foreign_exchange_facilitator: "Foreign exchange facilitator",
};

/**
 * Deliberately cautious wording.
 *
 * This is the ORGANIZATION's provider-profile state, not approval for any particular
 * connector kind — per-kind verification lives on `commerce_provider_kind_link` and is not
 * in the public projection. A bare "Verified" badge here would claim something the backend
 * has not said.
 */
const PROVIDER_VERIFICATION_STATE_LABELS: Record<ProviderVerificationState, string> = {
  unverified: "Profile not verified",
  documents_pending: "Documents under review",
  verified: "Profile verified",
  rejected: "Profile rejected",
  suspended: "Profile suspended",
};

const SERVICE_PRICING_MODEL_LABELS: Record<ServicePricingModel, string> = {
  quote_only: "Quote only",
  fixed_fee: "Fixed fee",
  per_unit: "Per unit",
  subscription: "Subscription",
};

/** Facet group keys returned by `/store/categories/:slug`, in display order. */
export const STORE_FACET_GROUP_LABELS = {
  sellerCountryCodes: "Seller country",
  stockStates: "Availability",
  samplePolicies: "Samples",
} as const;

export function stockStateLabel(stockState: StockState): string {
  return STOCK_STATE_LABELS[stockState];
}

export function samplePolicyLabel(samplePolicy: SamplePolicy): string {
  return SAMPLE_POLICY_LABELS[samplePolicy];
}

export function storeSearchSortLabel(sort: StoreSearchSort): string {
  return SEARCH_SORT_LABELS[sort];
}

export function storeSearchDocumentKindLabel(documentKind: StoreSearchDocumentKind): string {
  return SEARCH_DOCUMENT_KIND_LABELS[documentKind];
}

export function providerKindLabel(providerKind: CommerceProviderKind): string {
  return PROVIDER_KIND_LABELS[providerKind];
}

export function providerVerificationStateLabel(state: ProviderVerificationState): string {
  return PROVIDER_VERIFICATION_STATE_LABELS[state];
}

export function servicePricingModelLabel(pricingModel: ServicePricingModel): string {
  return SERVICE_PRICING_MODEL_LABELS[pricingModel];
}

/**
 * A provider-kind label from a value the wire types only as `string`.
 *
 * `StoreSearchHit.providerKind` is `string | null` on the backend rather than the enum, so
 * an unrecognized value is possible. Fall back to the raw value made readable instead of
 * dropping it — the hit is real either way.
 */
export function providerKindLabelFromUnknown(providerKind: string): string {
  const knownKind = COMMERCE_PROVIDER_KINDS.find((candidate) => candidate === providerKind);
  return knownKind === undefined
    ? providerKind.replace(/_/g, " ")
    : PROVIDER_KIND_LABELS[knownKind];
}

/** Facet bucket labels. Stock and sample buckets carry enum values; countries carry ISO codes. */
export function storeFacetValueLabel(groupKey: string, facetValue: string): string {
  if (groupKey === "stockStates") {
    const stockState = STOCK_STATES.find((candidate) => candidate === facetValue);
    return stockState === undefined ? facetValue : STOCK_STATE_LABELS[stockState];
  }
  if (groupKey === "samplePolicies") {
    const samplePolicy = SAMPLE_POLICIES.find((candidate) => candidate === facetValue);
    return samplePolicy === undefined ? facetValue : SAMPLE_POLICY_LABELS[samplePolicy];
  }
  return facetValue;
}
