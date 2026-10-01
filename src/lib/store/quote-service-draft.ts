// TRANSPORT: props-only — draft types and builders for quote service details.
import {
  toFixedPointRate,
  toOptionalCountryCode,
  toOptionalMoneyWithCurrency,
  toOptionalNonNegativeInteger,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import type { QuoteServiceDetailInput } from "@/lib/store/quotes.schemas";
import type { FreightTransportMode, ProviderKind } from "@/lib/store/shared.schemas";

/**
 * ONE draft shape covering all eight arms, for the same reason the RFQ draft is a superset: the
 * builder reads only the fields belonging to the chosen kind, so an abandoned answer is never sent.
 *
 * Here the kind cannot change — it is fixed by the RFQ line — so the superset buys less than it does
 * on the RFQ side. It is still the right shape: one flat record of strings keeps the conversion to
 * wire types in one place, which is the rule `composer-input.ts` exists to enforce.
 */
export interface QuoteServiceDetailDraft {
  transportModes: FreightTransportMode[];
  originCountryCode: string;
  destinationCountryCode: string;
  estimatedTransitDays: string;

  jurisdictions: string[];
  filingSummary: string;

  coverageClasses: string[];
  coverageLimitMajorUnits: string;
  coverageCurrency: string;

  includedStages: string[];

  standards: string[];
  laboratoryLocation: string;

  channels: string[];
  deliverablesSummary: string;

  storageTypes: string[];
  capacityUnits: string;
  isTemperatureControlled: boolean;

  // TWO fields, joined with `/` at build time. The wire wants ONE string matching
  // `^[A-Z]{3}/[A-Z]{3}$`, and a single free-text box against that regex is a 422 factory.
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  decimalRate: string;
  settlementRail: string;
  notionalMajorUnits: string;
  notionalCurrency: string;
}

export const EMPTY_QUOTE_SERVICE_DETAIL_DRAFT: QuoteServiceDetailDraft = {
  transportModes: [],
  originCountryCode: "",
  destinationCountryCode: "",
  estimatedTransitDays: "",
  jurisdictions: [],
  filingSummary: "",
  coverageClasses: [],
  coverageLimitMajorUnits: "",
  coverageCurrency: "",
  includedStages: [],
  standards: [],
  laboratoryLocation: "",
  channels: [],
  deliverablesSummary: "",
  storageTypes: [],
  capacityUnits: "",
  // `false` IS AN ANSWER HERE, not an unset. The field is required on the wire and a provider
  // publishing a warehouse price is stating whether it is temperature controlled.
  isTemperatureControlled: false,
  baseCurrencyCode: "",
  quoteCurrencyCode: "",
  decimalRate: "",
  settlementRail: "",
  notionalMajorUnits: "",
  notionalCurrency: "",
};

/**
 * The draft for one kind as the wire wants it, or `null` when a REQUIRED field is unfilled.
 *
 * TWO ARMS CAN REFUSE, and only two: freight needs at least one transport mode, and FX needs both a
 * well-formed currency pair and a parseable rate. Everything else always builds — see note 4 in the
 * header.
 *
 * `providerKind` COMES FROM THE RFQ LINE and is narrowed here to the eight the quote union accepts.
 * `ProviderKind` has one member the quote side has no arm for, so an unknown kind returns `null`
 * rather than being coerced into a neighbouring arm.
 */
export function buildQuoteServiceDetailInput(
  providerKind: ProviderKind,
  draft: QuoteServiceDetailDraft,
): QuoteServiceDetailInput | null {
  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator": {
      if (draft.transportModes.length === 0) return null;
      const originCountryCode = toOptionalCountryCode(draft.originCountryCode);
      const destinationCountryCode = toOptionalCountryCode(draft.destinationCountryCode);
      const estimatedTransitDays = toOptionalNonNegativeInteger(draft.estimatedTransitDays);
      return {
        kind: providerKind,
        transportModes: draft.transportModes,
        ...(originCountryCode === undefined ? {} : { originCountryCode }),
        ...(destinationCountryCode === undefined ? {} : { destinationCountryCode }),
        ...(estimatedTransitDays === undefined ? {} : { estimatedTransitDays }),
      };
    }

    case "customs_broker": {
      const filingSummary = toOptionalText(draft.filingSummary);
      return {
        kind: "customs_broker",
        jurisdictions: draft.jurisdictions,
        ...(filingSummary === undefined ? {} : { filingSummary }),
      };
    }

    case "insurance_provider": {
      // BOTH OR NEITHER. A coverage limit without its currency is a 422 naming the missing half.
      const coverage = toOptionalMoneyWithCurrency(
        draft.coverageLimitMajorUnits,
        draft.coverageCurrency,
      );
      return {
        kind: "insurance_provider",
        coverageClasses: draft.coverageClasses,
        ...(coverage === undefined
          ? {}
          : { coverageLimitInCents: coverage.amountInCents, currency: coverage.currency }),
      };
    }

    case "inspection_agency":
      return { kind: "inspection_agency", includedStages: draft.includedStages };

    case "testing_certification_lab": {
      const laboratoryLocation = toOptionalText(draft.laboratoryLocation);
      return {
        kind: "testing_certification_lab",
        standards: draft.standards,
        ...(laboratoryLocation === undefined ? {} : { laboratoryLocation }),
      };
    }

    case "marketing_agency": {
      const deliverablesSummary = toOptionalText(draft.deliverablesSummary);
      return {
        kind: "marketing_agency",
        channels: draft.channels,
        ...(deliverablesSummary === undefined ? {} : { deliverablesSummary }),
      };
    }

    case "warehouse_provider": {
      const capacityUnits = toOptionalText(draft.capacityUnits);
      return {
        kind: "warehouse_provider",
        storageTypes: draft.storageTypes,
        ...(capacityUnits === undefined ? {} : { capacityUnits }),
        temperatureControlled: draft.isTemperatureControlled,
      };
    }

    case "foreign_exchange_facilitator": {
      const baseCurrencyCode = draft.baseCurrencyCode.trim().toUpperCase();
      const quoteCurrencyCode = draft.quoteCurrencyCode.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(baseCurrencyCode)) return null;
      if (!/^[A-Z]{3}$/.test(quoteCurrencyCode)) return null;

      const fixedPointRate = toFixedPointRate(draft.decimalRate);
      if (fixedPointRate === undefined) return null;

      const settlementRail = toOptionalText(draft.settlementRail);
      const notional = toOptionalMoneyWithCurrency(
        draft.notionalMajorUnits,
        draft.notionalCurrency,
      );
      return {
        kind: "foreign_exchange_facilitator",
        currencyPair: `${baseCurrencyCode}/${quoteCurrencyCode}`,
        rateFixedPoint: fixedPointRate.rateFixedPoint,
        rateScale: fixedPointRate.rateScale,
        ...(settlementRail === undefined ? {} : { settlementRail }),
        ...(notional === undefined
          ? {}
          : {
              notionalAmountInCents: notional.amountInCents,
              notionalCurrency: notional.currency,
            }),
      };
    }

    // EXHAUSTIVE. All nine `ProviderKind` members are covered by the eight arms above, freight and
    // logistics sharing one. Adding a tenth kind to the enum becomes a compile error here rather
    // than a quote that silently builds nothing.
    default: {
      const exhaustiveCheck: never = providerKind;
      return exhaustiveCheck;
    }
  }
}

/**
 * What the seller must still supply for this line to be quotable, in their words.
 *
 * Separate from the builder returning `null`, because "it will not build" is not a sentence anyone
 * can act on. The review step collects these.
 */
export function collectMissingServiceDetailFields(
  providerKind: ProviderKind,
  draft: QuoteServiceDetailDraft,
): readonly string[] {
  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator":
      return draft.transportModes.length === 0 ? ["at least one transport mode"] : [];
    case "foreign_exchange_facilitator": {
      const missing: string[] = [];
      if (!/^[A-Z]{3}$/.test(draft.baseCurrencyCode.trim().toUpperCase())) {
        missing.push("the currency you are selling");
      }
      if (!/^[A-Z]{3}$/.test(draft.quoteCurrencyCode.trim().toUpperCase())) {
        missing.push("the currency you are buying");
      }
      if (toFixedPointRate(draft.decimalRate) === undefined) missing.push("a decimal rate");
      return missing;
    }
    case "customs_broker":
    case "insurance_provider":
    case "inspection_agency":
    case "testing_certification_lab":
    case "marketing_agency":
    case "warehouse_provider":
      // Nothing is required on these six. Their arrays are `.max(n)` with no `.min(1)`, so a quote
      // that lists no jurisdictions is a real quote — the line's own scope text carries it.
      return [];
    default: {
      const exhaustiveCheck: never = providerKind;
      return exhaustiveCheck;
    }
  }
}
