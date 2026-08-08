// TRANSPORT: props-only — display copy, no network.
//
// CROSS-DOMAIN LABELS ONLY. An enum keyed by three or more store domains gets its tuple
// in `shared.schemas.ts` and its copy here; anything narrower keeps tuple + label map +
// icon map adjacent inside its own `*.schemas.ts`, the way `organizations.schemas.ts`
// already does. One label file for the whole domain would reach a thousand lines and
// make every schema edit touch two files.
//
// These live in `src/lib` and not `src/mocks` because they are NOT data: they survive
// every phase, whereas a fixture is deleted the moment its route is wired. English copy
// is a web-client concern — the wire carries the enum value and each client localizes it.

import type {
  FreightTransportMode,
  MerchandisingEntityKind,
  ProviderKind,
  RailStrategy,
} from "@/lib/store/shared.schemas";

/**
 * The nine connector kinds, in the wording a buyer searches with.
 *
 * Used by the provider directory, offering detail, search hits, RFQ service lines, the
 * RFQ composer, quote service lines, quote comparison, engagements, and both studio
 * provider surfaces — thirteen places, which is why it is here and not in
 * `providers.schemas.ts`.
 */
export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  freight_forwarder: "Freight forwarder",
  logistics_operator: "Logistics operator",
  customs_broker: "Customs broker",
  insurance_provider: "Cargo insurance",
  inspection_agency: "Inspection agency",
  testing_certification_lab: "Testing & certification lab",
  marketing_agency: "Marketing agency",
  warehouse_provider: "Warehousing",
  foreign_exchange_facilitator: "Foreign exchange",
};

/**
 * Icon per connector kind, as a bare filename under `public/icons/`.
 *
 * PAIRED WITH THE LABEL, NEVER ALONE. Nine kinds cannot be told apart by glyph — a
 * shield reads as "insurance" only to someone who already knows the list — and
 * verification is recorded per kind, so a lone icon beside a tick would imply an approval
 * that may not exist for that kind.
 */
export const PROVIDER_KIND_ICONS: Record<ProviderKind, string> = {
  freight_forwarder: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  logistics_operator: "package_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  customs_broker: "description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  insurance_provider: "shield_person_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  inspection_agency: "fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  testing_certification_lab: "science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  marketing_agency: "analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  warehouse_provider: "home_storage_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  foreign_exchange_facilitator: "paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
};

export const FREIGHT_TRANSPORT_MODE_LABELS: Record<FreightTransportMode, string> = {
  air: "Air",
  sea: "Sea",
  land: "Road",
  rail: "Rail",
  multimodal: "Multimodal",
};

export const FREIGHT_TRANSPORT_MODE_ICONS: Record<FreightTransportMode, string> = {
  air: "flight_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  sea: "directions_boat_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  land: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  rail: "train_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  multimodal: "package_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
};

export const MERCHANDISING_ENTITY_KIND_LABELS: Record<MerchandisingEntityKind, string> = {
  product: "Product",
  category: "Category",
  organization: "Seller",
  provider_offering: "Service",
};

/**
 * How a rail's selection is described to a visitor, where it is described at all.
 *
 * `curated` is deliberately blank: "chosen by Qatoto" is the honest label and it is also
 * the one a merchandiser does not want on every editorial rail, so the rail's own title
 * carries the meaning instead. `trending_placeholder` is blank because a rail carrying it
 * returns nothing and renders nothing — there is no strip to caption.
 *
 * `recommended` says "for you" and NOT "picked for you by AI": the backend reranks
 * eligible candidates and the claim stops there.
 */
export const RAIL_STRATEGY_LABELS: Record<RailStrategy, string> = {
  curated: "",
  newest: "Newest listings",
  trending_placeholder: "",
  trending: "Trending this week",
  recommended: "For you",
};

/**
 * Presentation accent → Tailwind classes, resolved on the client.
 *
 * The API returns a semantic token and NEVER a class name (§9), so the mapping lives here. The five
 * keys are `store_presentation_accent` verbatim — `amber | slate | emerald | sky | rose`, defaulting
 * to `slate` in the column.
 *
 * The lookup still tolerates an unknown token rather than using `z.enum` at the boundary: a sixth
 * accent seeded backend-side should tint a card wrong, not fail the whole page's parse. That is the
 * same forward-compatibility `.strip()` buys on every other field.
 */
const ACCENT_SURFACE_CLASSES: Record<string, string> = {
  amber: "bg-amber-50",
  slate: "bg-slate-100",
  emerald: "bg-emerald-50",
  sky: "bg-sky-50",
  rose: "bg-rose-50",
};

const FALLBACK_ACCENT_SURFACE_CLASS = "bg-muted";

export function accentSurfaceClass(accentToken: string): string {
  return ACCENT_SURFACE_CLASSES[accentToken] ?? FALLBACK_ACCENT_SURFACE_CLASS;
}
