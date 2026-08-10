// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `factory-profile.api.ts` and `admin-site-audits.api.ts` swap
// `resolveMockRead` for `getJson`.
//
// EVERY FIXTURE IS EXPLICITLY ANNOTATED, never `satisfies`.
//
// WHAT THIS SET COVERS:
//
//   · a production line with a stated capacity beside one with `monthlyCapacityUnits: null` and a
//     unit label anyway — the pair that shows why the unit is required even when the number is not;
//   · TWO SITES WHOSE AREAS DO NOT SUM TO THE ORGANIZATION'S OWN `factoryAreaSquareMetres`
//     (18,400 on the directory card against 12,900 + 4,100 = 17,000 here). That gap is deliberate.
//     Both figures are seller-declared, the read publishes both, and a renderer that summed or
//     reconciled them would assert something neither party said (§16.3);
//   · a sample fee that is a REAL NUMBER, so the terms editor's "unstated versus free" distinction
//     has something to sit against;
//   · a site audit that was RECORDED and one that was WITHDRAWN with a reason, because a console
//     showing only live audits hides the act it most needs to be reviewable.

import type {
  FactoryProductionLine,
  FactorySite,
  FactorySiteAudit,
  FactoryTerms,
} from "@/lib/store/factories.schemas";

// --- Production lines --------------------------------------------------------

export const MOCK_FACTORY_PRODUCTION_LINE_LIST: { productionLines: FactoryProductionLine[] } = {
  productionLines: [
    {
      id: "line_hz_injection",
      name: "Injection moulding",
      processSummary: "Twelve presses, 80–450 tonne. Hot runner on eight of them.",
      monthlyCapacityUnits: 420_000,
      unitLabel: "pieces",
    },
    {
      id: "line_hz_finishing",
      name: "Finishing",
      processSummary: "Pad printing, ultrasonic welding, manual deburring.",
      // GENUINELY UNMEASURED — and the unit is still here. A capacity with no unit cannot be
      // compared against an order, so the editor collects the unit whether or not a number exists.
      monthlyCapacityUnits: null,
      unitLabel: "pieces",
    },
  ],
};

// --- Sites -------------------------------------------------------------------

export const MOCK_FACTORY_SITE_LIST: { sites: FactorySite[] } = {
  sites: [
    {
      id: "site_hz_main",
      label: "Xiaoshan plant",
      countryCode: "CN",
      locality: "Hangzhou, Zhejiang",
      floorAreaSquareMetres: 12_900,
      productionStaffCount: 210,
    },
    {
      id: "site_hz_toolroom",
      label: "Tool room and sample shop",
      countryCode: "CN",
      locality: "Hangzhou, Zhejiang",
      floorAreaSquareMetres: 4_100,
      // Unmeasured, not zero. Nobody counted the people in this building.
      productionStaffCount: null,
    },
  ],
};

// --- Terms -------------------------------------------------------------------

export const MOCK_FACTORY_TERMS: FactoryTerms = {
  organizationId: "org_factory_hangzhou_precision",
  samplePolicy: {
    offersSamples: true,
    sampleLeadTimeDays: 12,
    // A REAL FEE, so the editor's three-way control — unstated, free, priced — has a priced case.
    sampleFeeInCents: 45_000,
    currency: "USD",
  },
  minimumOrderQuantity: 2_000,
  minimumOrderQuantityUnitLabel: "pieces",
  minimumLeadTimeDays: 35,
  maximumLeadTimeDays: 60,
  acceptingInquiries: true,
};

// --- Site audits -------------------------------------------------------------

/**
 * `GET /commerce/admin/organizations/:organizationId/site-audits`.
 *
 * TWO ROWS BECAUSE A WITHDRAWAL HAS TO BE VISIBLE. An audit that vanishes when retracted leaves
 * the console unable to show that the platform once made a claim and then took it back, which is
 * the exact thing a reviewer of this surface would come looking for.
 *
 * NONE OF THIS REACHES A BUYER. The public detail read projects `lastAuditedAt` and nothing else —
 * an auditor's name and the scope they walked is a disclosure about a third party.
 */
export const MOCK_FACTORY_SITE_AUDIT_LIST: { audits: FactorySiteAudit[] } = {
  audits: [
    {
      id: "audit_hz_2026_02",
      organizationId: "org_factory_hangzhou_precision",
      state: "recorded",
      auditedAt: "2026-02-17",
      auditorName: "Bureau Veritas — Shanghai office",
      scopeSummary:
        "Full-day visit. Press floor, tool room, incoming goods and the finishing line. Reviewed the QC log against three live jobs.",
      coveredSiteIds: ["site_hz_main", "site_hz_toolroom"],
      auditEntryId: "staff_entry_01JQY7T4",
      withdrawnAt: null,
      withdrawnReason: null,
      createdAt: "2026-02-18T09:00:00.000Z",
    },
    {
      id: "audit_hz_2024_11",
      organizationId: "org_factory_hangzhou_precision",
      state: "withdrawn",
      auditedAt: "2024-11-05",
      auditorName: "Independent contractor — G. Alvarez",
      scopeSummary: "Half-day walkthrough of the press floor only.",
      // EMPTY MEANS THE AUDIT COVERED THE ORGANIZATION, not a named site. It is not a missing join.
      coveredSiteIds: [],
      auditEntryId: "staff_entry_01JN2K9B",
      withdrawnAt: "2025-03-02T14:20:00.000Z",
      withdrawnReason:
        "Auditor could not produce the site photographs the record cites. Retracted rather than left standing on an unverifiable report.",
      createdAt: "2024-11-06T10:15:00.000Z",
    },
  ],
};

export const MOCK_FACTORY_SITE_AUDIT_LIST_EMPTY: { audits: FactorySiteAudit[] } = {
  audits: [],
};
