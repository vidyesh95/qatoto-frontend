// TRANSPORT: props-only — renders the typed requirement it was handed, no network.
//
// THE SECOND NINE-ARM SWITCH ON THIS SURFACE, and it discriminates on `providerKind` — NOT on `kind`,
// which is what the service-offering union in `service-offering-detail-panel.tsx` uses. Same nine kinds,
// two field names, because they are two tables written in two phases. Neither name is wrong and neither
// may be "harmonised": each is what its own endpoint sends, and a `.strict()` write body would 422.
//
// THE DIFFERENCE THAT CHANGES THE RENDERING: an OFFERING says what a provider CAN do, so a `false` there
// is a real answer worth printing ("Hazardous goods: No"). A REQUIREMENT says what a buyer NEEDS, and
// almost every field is optional — so an ABSENT field means "not asked for", which is not the same as
// asking and saying no. Printing "No" for an unasked requirement would tell a provider the buyer
// considered and rejected something they never mentioned.
//
// So: booleans render only when PRESENT, and their absence is silence rather than a negative.

import DefinitionList, {
  type DefinitionListItem,
} from "@/components/commerce/shared/definition-list";
import { formatCentsLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import { countryLabelFromCode } from "@/lib/store/format";
import type { RfqRequirementDetail } from "@/lib/store/rfqs.schemas";

/**
 * An optional boolean as a requirement.
 *
 * `undefined` → `null`, which `DefinitionList` renders as "Not provided" — the honest reading of "the
 * buyer did not ask". `false` → "Not required", which is a stated preference. The two are different
 * facts and this is the only place that distinction is made.
 */
function requirementFlagValue(flag: boolean | undefined): string | null {
  if (flag === undefined) return null;
  return flag ? "Required" : "Not required";
}

/** A list, or `null` so the absence renders as an absence rather than an empty line. */
function listValue(values: readonly string[]): string | null {
  return values.length === 0 ? null : values.join(" · ");
}

/** A country code, or null. `?: string | null` means both absent and null are possible. */
function countryValue(countryCode: string | null | undefined): string | null {
  if (countryCode === null || countryCode === undefined) return null;
  return countryLabelFromCode(countryCode);
}

/** An optional-and-nullable amount needs its currency present too, or it cannot be formatted. */
function moneyValue(
  amountInCents: number | null | undefined,
  currency: string | undefined,
): string | null {
  if (amountInCents === null || amountInCents === undefined) return null;
  if (currency === undefined) return null;
  return formatCentsLabel(amountInCents, currency);
}

export default function RfqRequirementPanel({
  requirement,
}: {
  requirement: RfqRequirementDetail;
}) {
  return <DefinitionList items={buildRequirementItems(requirement)} />;
}

function buildRequirementItems(requirement: RfqRequirementDetail): DefinitionListItem[] {
  switch (requirement.providerKind) {
    // One body for two kinds — the backend gives them one shape.
    case "freight_forwarder":
    case "logistics_operator":
      return [
        {
          term: "Modes wanted",
          value: listValue(
            requirement.transportModes.map((mode) => FREIGHT_TRANSPORT_MODE_LABELS[mode]),
          ),
        },
        { term: "From", value: countryValue(requirement.originCountryCode) },
        { term: "To", value: countryValue(requirement.destinationCountryCode) },
        { term: "Consolidation", value: requirementFlagValue(requirement.requiresConsolidation) },
        {
          term: "Hazardous goods",
          value: requirementFlagValue(requirement.requiresHazardousGoodsSupport),
        },
        { term: "Cargo", value: requirement.cargoDescription ?? null },
      ];

    case "customs_broker":
      return [
        { term: "Jurisdictions", value: listValue(requirement.jurisdictions) },
        { term: "Import clearance", value: requirementFlagValue(requirement.importRequired) },
        { term: "Export clearance", value: requirementFlagValue(requirement.exportRequired) },
        { term: "Commodities", value: requirement.commoditySummary ?? null },
      ];

    case "insurance_provider":
      return [
        { term: "Cover classes", value: listValue(requirement.cargoCoverageClasses) },
        {
          term: "Cover needed",
          value: moneyValue(requirement.coverageLimitInCents, requirement.currency),
        },
      ];

    case "inspection_agency":
      // ALL FOUR OPTIONAL, unlike the offering side where they are required booleans. A buyer asking for
      // pre-shipment only has said nothing about pre-production, and the panel stays silent on it.
      return [
        { term: "Pre-production", value: requirementFlagValue(requirement.preProduction) },
        { term: "During production", value: requirementFlagValue(requirement.duringProduction) },
        { term: "Pre-shipment", value: requirementFlagValue(requirement.preShipment) },
        {
          term: "Loading supervision",
          value: requirementFlagValue(requirement.loadingSupervision),
        },
      ];

    case "testing_certification_lab":
      return [
        { term: "Standards", value: listValue(requirement.standards) },
        {
          term: "Laboratory location",
          value: requirement.laboratoryLocationPreference ?? null,
        },
      ];

    case "marketing_agency":
      return [
        { term: "Channels", value: listValue(requirement.channels) },
        { term: "Target regions", value: listValue(requirement.targetRegions) },
        { term: "Languages", value: listValue(requirement.languageCapabilities) },
      ];

    case "warehouse_provider":
      return [
        { term: "Storage types", value: listValue(requirement.storageTypes) },
        {
          term: "Temperature controlled",
          value: requirementFlagValue(requirement.temperatureControlled),
        },
        { term: "Bonded", value: requirementFlagValue(requirement.bondedStatusRequired) },
        { term: "Capacity", value: requirement.capacityUnits ?? null },
      ];

    case "foreign_exchange_facilitator":
      return [
        { term: "Currency pairs", value: listValue(requirement.currencyPairs) },
        { term: "Settlement rails", value: listValue(requirement.settlementRails) },
        {
          term: "Notional",
          value: moneyValue(requirement.notionalAmountInCents, requirement.notionalCurrency),
        },
      ];

    default: {
      const exhaustiveCheck: never = requirement;
      return exhaustiveCheck;
    }
  }
}
