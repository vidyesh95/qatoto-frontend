// TRANSPORT: props-only — renders the typed extension it was handed, fetches nothing.
//
// THE NINE-ARM SWITCH. Every provider kind carries a different set of facts, and this is the one
// place that knows which.
//
// IT SWITCHES ON `detail.kind`, NOT ON `providerKind`. STORE_STRUCTURE §9.2's example switches on
// `offering.providerKind`, which holds the same value but gives TypeScript no narrowing over
// `detail` — so every arm would then have to reach into a union it has not discriminated, and the
// compiler would let a customs field be read on an insurance detail. `detail.kind` is the
// discriminant the backend actually typed.
//
// THE `never` DEFAULT IS THE POINT OF THE WHOLE FILE. A tenth provider kind seeded in
// `commerce_provider_kind` becomes a COMPILE ERROR here rather than a silently blank panel, which
// is what CLAUDE.md Pattern 1 buys: the illegal state — a kind whose facts nobody renders — cannot
// be represented.
//
// `freight_forwarder` and `logistics_operator` share one body because the backend gives them one
// shape. They are two cases falling through to one renderer rather than one case with two labels,
// because the union declares them separately (see `providers.schemas.ts` for why).

import DefinitionList, {
  type DefinitionListItem,
} from "@/components/commerce/shared/definition-list";
import { formatCentsRangeLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import type { ServiceOfferingDetail } from "@/lib/store/providers.schemas";

/**
 * A boolean capability as words, never a bare tick or a blank.
 *
 * "No" is a real answer and a useful one — a buyer shipping lithium cells needs to see
 * "Hazardous goods: No" rather than an absent row they might read as "not stated". An unchecked
 * checkbox and an unanswered question look identical; these do not.
 */
function capabilityLabel(isSupported: boolean): string {
  return isSupported ? "Yes" : "No";
}

/** A list of free-text values, or `null` so `DefinitionList` renders its own absence. */
function listLabel(values: readonly string[]): string | null {
  return values.length === 0 ? null : values.join(" · ");
}

export default function ServiceOfferingDetailPanel({ detail }: { detail: ServiceOfferingDetail }) {
  return <DefinitionList items={buildDetailItems(detail)} />;
}

function buildDetailItems(detail: ServiceOfferingDetail): DefinitionListItem[] {
  switch (detail.kind) {
    // One body for two kinds — the backend types them identically.
    case "freight_forwarder":
    case "logistics_operator":
      return [
        {
          term: "Transport modes",
          value: listLabel(
            detail.transportModes.map((mode) => FREIGHT_TRANSPORT_MODE_LABELS[mode]),
          ),
        },
        { term: "Consolidation", value: capabilityLabel(detail.supportsConsolidation) },
        { term: "Containers", value: capabilityLabel(detail.supportsContainers) },
        // A claim, not a clearance. The provider says it handles dangerous goods; whether it may
        // legally carry them on a given lane is a compliance question this field does not answer.
        {
          term: "Hazardous goods",
          value: capabilityLabel(detail.supportsHazardousGoods),
        },
      ];

    case "customs_broker":
      return [
        { term: "Jurisdictions", value: listLabel(detail.jurisdictions) },
        { term: "Import clearance", value: capabilityLabel(detail.importSupported) },
        { term: "Export clearance", value: capabilityLabel(detail.exportSupported) },
        // `?: string` on the wire, so ABSENT rather than null. `?? null` hands the absence to
        // `DefinitionList`, which prints "Not provided" — and never the string "undefined".
        { term: "Commodity coverage", value: detail.commodityCoverageSummary ?? null },
      ];

    case "insurance_provider":
      return [
        { term: "Cover classes", value: listLabel(detail.cargoCoverageClasses) },
        {
          term: "Limit range",
          // The currency is optional alongside the limits, and a limit without one cannot be
          // formatted — so both ends and the currency have to be present together.
          value:
            detail.currency === undefined
              ? null
              : formatCentsRangeLabel(
                  detail.coverageLimitMinInCents ?? null,
                  detail.coverageLimitMaxInCents ?? null,
                  detail.currency,
                ),
        },
        // A document REFERENCE, not a link: the exclusions document is not a public object and
        // there is no route that serves it. Printing the reference lets a buyer ask for it by name.
        { term: "Exclusions document", value: detail.exclusionsDocumentReference ?? null },
      ];

    case "inspection_agency":
      return [
        { term: "Pre-production", value: capabilityLabel(detail.preProduction) },
        { term: "During production", value: capabilityLabel(detail.duringProduction) },
        { term: "Pre-shipment", value: capabilityLabel(detail.preShipment) },
        { term: "Loading supervision", value: capabilityLabel(detail.loadingSupervision) },
      ];

    case "testing_certification_lab":
      return [
        { term: "Standards", value: listLabel(detail.standards) },
        // Accreditation bodies are the laboratory's own claim about who accredits it. The platform
        // has not checked them, so this is a list and not a badge.
        { term: "Accredited by", value: listLabel(detail.accreditationBodies) },
        { term: "Laboratories", value: listLabel(detail.laboratoryLocations) },
      ];

    case "marketing_agency":
      return [
        { term: "Channels", value: listLabel(detail.channels) },
        { term: "Target regions", value: listLabel(detail.targetRegions) },
        { term: "Languages", value: listLabel(detail.languageCapabilities) },
        { term: "Engagement model", value: detail.engagementModel ?? null },
      ];

    case "warehouse_provider":
      return [
        { term: "Storage types", value: listLabel(detail.storageTypes) },
        { term: "Temperature controlled", value: capabilityLabel(detail.temperatureControlled) },
        // Bonded status is a customs fact with commercial consequences — duty deferment — so it is
        // stated either way rather than shown only when true.
        { term: "Bonded", value: capabilityLabel(detail.bondedStatus) },
        { term: "Capacity", value: detail.capacityUnits ?? null },
      ];

    case "foreign_exchange_facilitator":
      return [
        { term: "Currency pairs", value: listLabel(detail.currencyPairs) },
        { term: "Settlement rails", value: listLabel(detail.settlementRails) },
        {
          term: "Notional range",
          value:
            detail.notionalCurrency === undefined
              ? null
              : formatCentsRangeLabel(
                  detail.minimumNotionalInCents ?? null,
                  detail.maximumNotionalInCents ?? null,
                  detail.notionalCurrency,
                ),
        },
      ];

    default: {
      const exhaustiveCheck: never = detail;
      return exhaustiveCheck;
    }
  }
}
