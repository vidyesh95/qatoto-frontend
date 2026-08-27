// TRANSPORT: props-only — a controlled form over one quoted service detail. Sends nothing.
"use client";

// THE MIRROR OF `rfq-requirement-detail-fields.tsx`, AND NOT A COPY OF IT. Read this list before
// editing either file, because the two look interchangeable and are not:
//
//  1. THE WIRE KEY IS `kind`, NOT `providerKind`. The RFQ requirement union discriminates on
//     `providerKind`; this one discriminates on `kind`. It is the third spelling of the same idea on
//     this wire and `quotes.schemas.ts` warns about it too. Copying the RFQ builder wholesale sends
//     `providerKind` into a `.strict()` body and every service line 422s.
//
//  2. THERE IS NO KIND PICKER. The server requires `serviceDetail.kind` to equal the RFQ service
//     line's `providerKind`, so the kind is READ OFF THE LINE being answered. That deletes the
//     hardest control in the RFQ composer — the select that had to set the kind in two places at
//     once — and it is why `providerKind` is a prop here rather than draft state.
//
//  3. THERE IS NO TRI-STATE, ANYWHERE. Exactly one boolean exists in the whole union —
//     `warehouse_provider.temperatureControlled` — and it is REQUIRED. This is the inverse of the
//     RFQ form and it is the case `composer-fields.tsx` already documents: a buyer who did not
//     answer has not said "no", but a PROVIDER quoting a price is answering. `false` here is a real
//     commercial statement, so it is a plain checkbox with two positions.
//
//  4. THE GATE IS MUCH THINNER. Only `transportModes` is `.min(1)` and only the FX rate must parse,
//     so `buildQuoteServiceDetailInput` returns `null` in TWO cases where the RFQ builder returns it
//     in six. Every other array is a required key that may legally hold `[]` — an empty one gets a
//     hint, not a refusal, because a provider genuinely may quote a customs filing without listing
//     jurisdictions.
//
// FIELD NAMES DIFFER FROM THE RFQ REQUIREMENT IN ALMOST EVERY ARM. `cargoCoverageClasses` there is
// `coverageClasses` here; `laboratoryLocationPreference` is `laboratoryLocation`; `currencyPairs`
// (an array) is `currencyPair` (ONE string). The inspection arm is the sharpest reversal: four
// booleans there become free-text `includedStages` here, because a quote says what the provider is
// including, in their words.

import {
  CheckboxField,
  ChipMultiSelectField,
  TextAreaField,
  TextField,
  TokenListField,
} from "@/components/commerce/composer/composer-fields";
import {
  toFixedPointRate,
  toOptionalCountryCode,
  toOptionalMoneyWithCurrency,
  toOptionalNonNegativeInteger,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import type { QuoteServiceDetailInput } from "@/lib/store/quotes.schemas";
import {
  FREIGHT_TRANSPORT_MODES,
  type FreightTransportMode,
  type ProviderKind,
} from "@/lib/store/shared.schemas";

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

const TRANSPORT_MODE_OPTIONS = FREIGHT_TRANSPORT_MODES.map((transportMode) => ({
  value: transportMode,
  label: FREIGHT_TRANSPORT_MODE_LABELS[transportMode],
}));

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

export default function QuoteServiceDetailFields({
  providerKind,
  draft,
  onDraftChange,
}: {
  providerKind: ProviderKind;
  draft: QuoteServiceDetailDraft;
  onDraftChange: (nextDraft: QuoteServiceDetailDraft) => void;
}) {
  const patchDraft = (patch: Partial<QuoteServiceDetailDraft>) => {
    onDraftChange({ ...draft, ...patch });
  };

  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator":
      return (
        <div className="space-y-3">
          <ChipMultiSelectField
            label="Transport modes you are quoting"
            hint="At least one. This is the only part of a freight quote the server insists on."
            selectedValues={draft.transportModes}
            options={TRANSPORT_MODE_OPTIONS}
            onSelectedValuesChange={(nextModes) => patchDraft({ transportModes: [...nextModes] })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Origin country"
              hint="Two-letter code, such as CN."
              value={draft.originCountryCode}
              onValueChange={(nextValue) => patchDraft({ originCountryCode: nextValue })}
              maxLength={2}
            />
            <TextField
              label="Destination country"
              hint="Two-letter code, such as IN."
              value={draft.destinationCountryCode}
              onValueChange={(nextValue) => patchDraft({ destinationCountryCode: nextValue })}
              maxLength={2}
            />
          </div>
          <TextField
            label="Estimated transit days"
            hint="Leave blank rather than guessing — a blank is omitted, a zero promises same-day."
            value={draft.estimatedTransitDays}
            onValueChange={(nextValue) => patchDraft({ estimatedTransitDays: nextValue })}
          />
        </div>
      );

    case "customs_broker":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Jurisdictions you will file in"
            values={draft.jurisdictions}
            onValuesChange={(nextValues) => patchDraft({ jurisdictions: [...nextValues] })}
            placeholder="IN — Nhava Sheva"
            maxEntries={50}
          />
          <TextAreaField
            label="What the filing covers"
            value={draft.filingSummary}
            onValueChange={(nextValue) => patchDraft({ filingSummary: nextValue })}
            maxLength={4000}
          />
        </div>
      );

    case "insurance_provider":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Coverage classes"
            values={draft.coverageClasses}
            onValuesChange={(nextValues) => patchDraft({ coverageClasses: [...nextValues] })}
            placeholder="All-risk marine cargo"
            maxEntries={50}
          />
          {/* BOTH OR NEITHER, stated above the pair rather than discovered as a 422. */}
          <p className="text-[11px] leading-4 text-muted-foreground">
            A coverage limit needs its currency, and a currency needs its limit. Fill both or leave
            both blank — half a pair is refused.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Coverage limit"
              hint="Major units, such as 250000."
              value={draft.coverageLimitMajorUnits}
              onValueChange={(nextValue) => patchDraft({ coverageLimitMajorUnits: nextValue })}
            />
            <TextField
              label="Coverage currency"
              hint="Three-letter code."
              value={draft.coverageCurrency}
              onValueChange={(nextValue) => patchDraft({ coverageCurrency: nextValue })}
              maxLength={3}
            />
          </div>
        </div>
      );

    case "inspection_agency":
      return (
        <TokenListField
          label="Stages included in this price"
          hint="Your words, not a checklist. The buyer asked with four boxes; you answer with what you are actually doing."
          values={draft.includedStages}
          onValuesChange={(nextValues) => patchDraft({ includedStages: [...nextValues] })}
          placeholder="Pre-shipment inspection"
          maxEntries={20}
        />
      );

    case "testing_certification_lab":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Standards you will test against"
            values={draft.standards}
            onValuesChange={(nextValues) => patchDraft({ standards: [...nextValues] })}
            placeholder="EN 71-3"
            maxEntries={50}
          />
          <TextField
            label="Laboratory location"
            value={draft.laboratoryLocation}
            onValueChange={(nextValue) => patchDraft({ laboratoryLocation: nextValue })}
            maxLength={200}
          />
        </div>
      );

    case "marketing_agency":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Channels"
            values={draft.channels}
            onValuesChange={(nextValues) => patchDraft({ channels: [...nextValues] })}
            placeholder="Paid search"
            maxEntries={50}
          />
          <TextAreaField
            label="What you will deliver"
            value={draft.deliverablesSummary}
            onValueChange={(nextValue) => patchDraft({ deliverablesSummary: nextValue })}
            maxLength={4000}
          />
        </div>
      );

    case "warehouse_provider":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Storage types"
            values={draft.storageTypes}
            onValuesChange={(nextValues) => patchDraft({ storageTypes: [...nextValues] })}
            placeholder="Palletised racking"
            maxEntries={50}
          />
          <TextField
            label="Capacity units"
            hint="How you are pricing the space — pallets, square metres, containers."
            value={draft.capacityUnits}
            onValueChange={(nextValue) => patchDraft({ capacityUnits: nextValue })}
            maxLength={80}
          />
          {/* The only boolean in the eight arms, and it is REQUIRED — so a plain checkbox, no third
              position. Unchecked is a published statement that the space is not temperature
              controlled, which is exactly what a buyer filtering on it needs it to mean. */}
          <CheckboxField
            label="Temperature controlled"
            hint="Required. Leaving it unchecked states that this space is not temperature controlled."
            isChecked={draft.isTemperatureControlled}
            onCheckedChange={(nextChecked) => patchDraft({ isTemperatureControlled: nextChecked })}
          />
        </div>
      );

    case "foreign_exchange_facilitator":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Currency you are selling"
              hint="Three-letter code."
              value={draft.baseCurrencyCode}
              onValueChange={(nextValue) => patchDraft({ baseCurrencyCode: nextValue })}
              maxLength={3}
            />
            <TextField
              label="Currency you are buying"
              hint="Three-letter code."
              value={draft.quoteCurrencyCode}
              onValueChange={(nextValue) => patchDraft({ quoteCurrencyCode: nextValue })}
              maxLength={3}
            />
          </div>
          <TextField
            label="Rate"
            hint="Type it exactly as you are quoting it. Trailing zeros are kept — 1.0840 is not 1.084."
            value={draft.decimalRate}
            onValueChange={(nextValue) => patchDraft({ decimalRate: nextValue })}
            placeholder="1.0840"
          />
          <TextField
            label="Settlement rail"
            value={draft.settlementRail}
            onValueChange={(nextValue) => patchDraft({ settlementRail: nextValue })}
            maxLength={80}
          />
          <p className="text-[11px] leading-4 text-muted-foreground">
            A notional amount needs its currency, and a currency needs its amount. Fill both or
            leave both blank.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Notional amount"
              hint="Major units."
              value={draft.notionalMajorUnits}
              onValueChange={(nextValue) => patchDraft({ notionalMajorUnits: nextValue })}
            />
            <TextField
              label="Notional currency"
              hint="Three-letter code."
              value={draft.notionalCurrency}
              onValueChange={(nextValue) => patchDraft({ notionalCurrency: nextValue })}
              maxLength={3}
            />
          </div>
        </div>
      );

    default: {
      const exhaustiveCheck: never = providerKind;
      return exhaustiveCheck;
    }
  }
}
