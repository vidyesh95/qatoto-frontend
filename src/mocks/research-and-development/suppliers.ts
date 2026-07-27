import type {
  LaunchReadinessItem,
  ProjectLaunchReadiness,
  SupplierCapability,
  SupplierProfile,
} from "@/types/research-and-development";

// Supplier / ODM directory and the derived launch-readiness checklist for the
// /research-and-development/go-to-market stage page (R_AND_D_STRUCTURE.md
// §4c.4, backend §11i). Static mocks only — the real directory is a curated,
// moderator-written catalogue and readiness is computed server-side on read.
//
// Authored in the §11 wire format from the start, so nothing here lands on the
// §12 migration list:
// - `leadTimeDays` / `minimumOrderQuantity` / `observedCount` are integers, not
//   "12 days" or "500 units". The client composes every sentence.
// - Enum values are snake_case, matching the wire.
// - There is deliberately NO money field on a supplier: currency derives from
//   the project and a supplier belongs to none. A quote belongs to an
//   engagement, priced in that project's currency.
// - `verificationState` is platform-assigned. It is not something a supplier
//   claims, and a new listing is always `unverified`.

// The seeded capability vocabulary behind the directory's filter chips. Slugs
// are the match key — never the display label, so a "casting" chip can never
// substring-match "broadcasting".
export const MOCK_SUPPLIER_CAPABILITIES: SupplierCapability[] = [
  { slug: "injection-molding", displayLabel: "Injection molding", kind: "manufacturing" },
  {
    slug: "sheet-metal-fabrication",
    displayLabel: "Sheet metal fabrication",
    kind: "manufacturing",
  },
  { slug: "pcb-assembly", displayLabel: "PCB assembly", kind: "manufacturing" },
  { slug: "insulated-packaging", displayLabel: "Insulated packaging", kind: "manufacturing" },
  { slug: "industrial-design", displayLabel: "Industrial design", kind: "odm" },
  { slug: "turnkey-odm", displayLabel: "Turnkey ODM", kind: "odm" },
  { slug: "tooling-and-molds", displayLabel: "Tooling & molds", kind: "odm" },
  { slug: "cold-chain-freight", displayLabel: "Cold-chain freight", kind: "logistics" },
  { slug: "last-mile-distribution", displayLabel: "Last-mile distribution", kind: "logistics" },
  { slug: "customs-brokerage", displayLabel: "Customs brokerage", kind: "logistics" },
  { slug: "ce-certification", displayLabel: "CE certification", kind: "certification" },
  { slug: "iso-13485-audit", displayLabel: "ISO 13485 audit", kind: "certification" },
];

function capabilityBySlug(slug: string): SupplierCapability {
  const matchingCapability = MOCK_SUPPLIER_CAPABILITIES.find(
    (capability) => capability.slug === slug,
  );
  if (!matchingCapability) throw new Error(`Unknown supplier capability slug: ${slug}`);
  return matchingCapability;
}

export const MOCK_SUPPLIER_PROFILES: SupplierProfile[] = [
  {
    slug: "kisumu-precision-works",
    name: "Kisumu Precision Works",
    summary:
      "Sheet-metal enclosures and evaporator frames for off-grid cooling hardware. Runs short pilot batches before a production commitment.",
    regionSlug: "east-africa",
    regionDisplayLabel: "East Africa",
    verificationState: "verified",
    contactPolicy: "open",
    websiteUrl: "https://example.com/kisumu-precision-works",
    leadTimeDays: 21,
    minimumOrderQuantity: 25,
    capabilities: [
      capabilityBySlug("sheet-metal-fabrication"),
      capabilityBySlug("tooling-and-molds"),
    ],
  },
  {
    slug: "penang-thermal-systems",
    name: "Penang Thermal Systems",
    summary:
      "Turnkey ODM for insulated shipping containers and phase-change packaging. Holds ISO 13485 for medical-grade lines.",
    regionSlug: "southeast-asia",
    regionDisplayLabel: "Southeast Asia",
    verificationState: "verified",
    contactPolicy: "open",
    websiteUrl: "https://example.com/penang-thermal-systems",
    leadTimeDays: 34,
    minimumOrderQuantity: 500,
    capabilities: [
      capabilityBySlug("insulated-packaging"),
      capabilityBySlug("turnkey-odm"),
      capabilityBySlug("iso-13485-audit"),
    ],
  },
  {
    slug: "accra-circuit-assembly",
    name: "Accra Circuit Assembly",
    summary:
      "Low-volume PCB assembly and board-level rework, set up for recovered-component reuse rather than virgin stock only.",
    regionSlug: "west-africa",
    regionDisplayLabel: "West Africa",
    verificationState: "verified",
    contactPolicy: "request_only",
    websiteUrl: "https://example.com/accra-circuit-assembly",
    leadTimeDays: 18,
    minimumOrderQuantity: 100,
    capabilities: [capabilityBySlug("pcb-assembly"), capabilityBySlug("industrial-design")],
  },
  {
    slug: "cebu-polymer-molding",
    name: "Cebu Polymer Molding",
    summary:
      "Injection molding for housing panel connectors and drone airframe parts. Tooling built in-house, amortized across runs.",
    regionSlug: "southeast-asia",
    regionDisplayLabel: "Southeast Asia",
    verificationState: "unverified",
    contactPolicy: "open",
    websiteUrl: "https://example.com/cebu-polymer-molding",
    leadTimeDays: 45,
    minimumOrderQuantity: 1000,
    capabilities: [capabilityBySlug("injection-molding"), capabilityBySlug("tooling-and-molds")],
  },
  {
    slug: "nairobi-coldlink-logistics",
    name: "Nairobi ColdLink Logistics",
    summary:
      "Refrigerated freight and last-mile distribution across the northern corridor, with temperature logging per consignment.",
    regionSlug: "east-africa",
    regionDisplayLabel: "East Africa",
    verificationState: "verified",
    contactPolicy: "open",
    websiteUrl: null,
    leadTimeDays: 7,
    minimumOrderQuantity: null,
    capabilities: [
      capabilityBySlug("cold-chain-freight"),
      capabilityBySlug("last-mile-distribution"),
    ],
  },
  {
    slug: "gujarat-modular-forms",
    name: "Gujarat Modular Forms",
    summary:
      "Prefabricated panel casting and formwork at building scale. Ships flat-packed; site assembly is the buyer's.",
    regionSlug: "south-asia",
    regionDisplayLabel: "South Asia",
    verificationState: "unverified",
    contactPolicy: "request_only",
    websiteUrl: "https://example.com/gujarat-modular-forms",
    leadTimeDays: null,
    minimumOrderQuantity: 40,
    capabilities: [capabilityBySlug("tooling-and-molds"), capabilityBySlug("turnkey-odm")],
  },
  {
    slug: "rotterdam-compliance-partners",
    name: "Rotterdam Compliance Partners",
    summary:
      "CE marking, technical file preparation and customs brokerage for hardware entering the EU single market.",
    regionSlug: "europe",
    regionDisplayLabel: "Europe",
    verificationState: "verified",
    contactPolicy: "open",
    websiteUrl: "https://example.com/rotterdam-compliance-partners",
    leadTimeDays: 60,
    minimumOrderQuantity: null,
    capabilities: [capabilityBySlug("ce-certification"), capabilityBySlug("customs-brokerage")],
  },
  {
    slug: "bogota-drone-integration",
    name: "Bogotá Drone Integration",
    summary:
      "Airframe assembly and payload integration for agricultural survey kits. Listing suspended pending a re-audit.",
    regionSlug: "latin-america",
    regionDisplayLabel: "Latin America",
    verificationState: "suspended",
    contactPolicy: "closed",
    websiteUrl: null,
    leadTimeDays: 28,
    minimumOrderQuantity: 10,
    capabilities: [capabilityBySlug("industrial-design"), capabilityBySlug("pcb-assembly")],
  },
];

// Six derived items, computed server-side from project stage, project stats,
// the pie-bake event, the project's supplier engagements and whether an active
// store listing exists. A `NULL` stat reads as `not_met` with a count of 0 —
// "no job has run" must stay distinguishable from "the job ran and found
// nothing", and coercing it would report a pipeline gap as a finding about the
// project.
//
// `waived` appears nowhere below on purpose: a waiver is a recorded decision by
// a named person, and nobody has granted one.
const MEDICAL_COLD_CHAIN_READINESS_ITEMS: LaunchReadinessItem[] = [
  { key: "stage_is_go_to_market", state: "met", observedCount: 1 },
  { key: "verified_effort_recorded", state: "met", observedCount: 214_320 },
  { key: "equity_allocated", state: "met", observedCount: 9_400 },
  { key: "cap_table_baked", state: "met", observedCount: 1 },
  { key: "supplier_engaged", state: "met", observedCount: 3 },
  { key: "store_listing_exists", state: "not_met", observedCount: 0 },
];

const PREFAB_HOUSING_READINESS_ITEMS: LaunchReadinessItem[] = [
  { key: "stage_is_go_to_market", state: "not_met", observedCount: 0 },
  { key: "verified_effort_recorded", state: "met", observedCount: 158_760 },
  { key: "equity_allocated", state: "met", observedCount: 8_150 },
  { key: "cap_table_baked", state: "not_met", observedCount: 0 },
  { key: "supplier_engaged", state: "met", observedCount: 1 },
  { key: "store_listing_exists", state: "not_met", observedCount: 0 },
];

export const MOCK_LAUNCH_READINESS_BY_PROJECT_ID: Record<string, ProjectLaunchReadiness> = {
  "medical-cold-chain-packaging": {
    projectId: "medical-cold-chain-packaging",
    items: MEDICAL_COLD_CHAIN_READINESS_ITEMS,
    asOf: "2026-07-26T04:00:00Z",
  },
  "prefab-housing-panels": {
    projectId: "prefab-housing-panels",
    items: PREFAB_HOUSING_READINESS_ITEMS,
    asOf: "2026-07-26T04:00:00Z",
  },
};
