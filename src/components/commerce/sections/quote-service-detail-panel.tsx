// TRANSPORT: props-only — renders the quoted service detail, no network.
//
// THE THIRD NINE-ARM SWITCH ON THIS SURFACE, discriminating on `kind` — like the service offering, unlike
// the RFQ requirement, which uses `providerKind`. Three tables written in three phases; each field name is
// what its own endpoint sends and none may be harmonised.
//
// The three unions also differ in what they MEAN, which changes the rendering:
//   an OFFERING says what a provider can do — `false` is a real answer, printed.
//   a REQUIREMENT says what a buyer needs — an absent field is "not asked", printed as an absence.
//   a QUOTE says what the provider is COMMITTING TO for this job — and it is the only one of the three
//   that becomes part of an immutable order, so nothing here may be softened or inferred.
//
// THE FX ARM IS THE ONE THAT CAN GO BADLY WRONG. `rateFixedPoint` and `rateScale` are two integers
// because floating point is forbidden for exchange rates. Rendering `rateFixedPoint` directly shows a rate
// wrong by `rateScale` orders of magnitude, and `.toFixed()` without the scale drops trailing digits that
// are part of what was agreed.

import DefinitionList, {
  type DefinitionListItem,
} from "@/components/commerce/shared/definition-list";
import { countryLabelFromCode, formatCentsLabel } from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import { formatFixedPointRateLabel, type QuoteServiceDetail } from "@/lib/store/quotes.schemas";

/** A list, or `null` so an empty one renders as an absence rather than a blank line. */
function listValue(values: readonly string[]): string | null {
  return values.length === 0 ? null : values.join(" · ");
}

function countryValue(countryCode: string | undefined): string | null {
  return countryCode === undefined ? null : countryLabelFromCode(countryCode);
}

/** An amount needs its currency present too, or it cannot be formatted at all. */
function moneyValue(
  amountInCents: number | undefined,
  currency: string | undefined,
): string | null {
  if (amountInCents === undefined || currency === undefined) return null;
  return formatCentsLabel(amountInCents, currency);
}

export default function QuoteServiceDetailPanel({ detail }: { detail: QuoteServiceDetail }) {
  return <DefinitionList items={buildDetailItems(detail)} />;
}

function buildDetailItems(detail: QuoteServiceDetail): DefinitionListItem[] {
  switch (detail.kind) {
    case "freight_forwarder":
    case "logistics_operator":
      return [
        {
          term: "Modes quoted",
          value: listValue(
            detail.transportModes.map((mode) => FREIGHT_TRANSPORT_MODE_LABELS[mode]),
          ),
        },
        { term: "From", value: countryValue(detail.originCountryCode) },
        { term: "To", value: countryValue(detail.destinationCountryCode) },
        {
          term: "Transit",
          // The provider's own estimate for this job — not a booked date, and not a promise the platform
          // is standing behind.
          value:
            detail.estimatedTransitDays === undefined
              ? null
              : `about ${detail.estimatedTransitDays} days`,
        },
      ];

    case "customs_broker":
      return [
        { term: "Jurisdictions", value: listValue(detail.jurisdictions) },
        { term: "Filing", value: detail.filingSummary ?? null },
      ];

    case "insurance_provider":
      return [
        { term: "Cover classes", value: listValue(detail.coverageClasses) },
        {
          term: "Cover limit",
          value: moneyValue(detail.coverageLimitInCents, detail.currency),
        },
      ];

    case "inspection_agency":
      // FREE-TEXT STAGES, not the four booleans the RFQ requirement and the offering both use. The provider
      // says what they are including, in their words, so it is rendered verbatim.
      return [{ term: "Stages included", value: listValue(detail.includedStages) }];

    case "testing_certification_lab":
      return [
        { term: "Standards", value: listValue(detail.standards) },
        { term: "Laboratory", value: detail.laboratoryLocation ?? null },
      ];

    case "marketing_agency":
      return [
        { term: "Channels", value: listValue(detail.channels) },
        { term: "Deliverables", value: detail.deliverablesSummary ?? null },
      ];

    case "warehouse_provider":
      return [
        { term: "Storage types", value: listValue(detail.storageTypes) },
        // REQUIRED on a quote, optional on the requirement. A provider must state it, so `false` here is a
        // commitment ("not temperature controlled") rather than a silence.
        { term: "Temperature controlled", value: detail.temperatureControlled ? "Yes" : "No" },
        { term: "Capacity", value: detail.capacityUnits ?? null },
      ];

    case "foreign_exchange_facilitator":
      return [
        { term: "Currency pair", value: detail.currencyPair },
        {
          term: "Quoted rate",
          // THE DIVISION HAPPENS IN THE FORMATTER AND NOWHERE ELSE, and it keeps every digit of the scale:
          // 88.4250 is a different agreed rate from 88.425.
          value: `${detail.currencyPair} at ${formatFixedPointRateLabel(
            detail.rateFixedPoint,
            detail.rateScale,
          )}`,
        },
        { term: "Settlement rail", value: detail.settlementRail ?? null },
        {
          term: "Notional",
          value: moneyValue(detail.notionalAmountInCents, detail.notionalCurrency),
        },
      ];

    default: {
      const exhaustiveCheck: never = detail;
      return exhaustiveCheck;
    }
  }
}
