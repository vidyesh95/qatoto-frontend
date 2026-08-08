// TRANSPORT: props-only — a controlled form over one capability draft. Sends nothing.
"use client";

// THE FIFTH NINE-ARM SWITCH, and the SECOND that writes. Read it beside
// `home/store/composers/rfq-requirement-detail-fields.tsx` and note what is deliberately NOT shared.
//
// EVERY BOOLEAN HERE IS A PLAIN CHECKBOX, where the RFQ's are tri-state. `OfferingDetailSchema` declares them
// REQUIRED, and that is the contract expressing a real difference: this form publishes what a provider CAN
// do, so `false` is an answer a buyer can act on — "we do not handle hazardous goods" is what stops a
// dangerous-goods shipment being quoted by someone who cannot legally carry it. Absent is not an option the
// wire admits, so it is not an option the form offers.
//
// THE FIELD NAMES DIFFER FROM THE RFQ'S, one union to the other, and the differences are not typos:
//
//   `importSupported`         here ← → `importRequired`         there
//   `commodityCoverageSummary`here ← → `commoditySummary`       there
//   `bondedStatus`            here ← → `bondedStatusRequired`   there
//   `supportsConsolidation`   here ← → `requiresConsolidation`  there
//   `coverageLimitMinInCents`/`…Max` here ← → `coverageLimitInCents` there (a range, not a figure)
//   `minimumNotionalInCents`/`…Max`  here ← → `notionalAmountInCents` there
//   `accreditationBodies` and `laboratoryLocations` (arrays) here ← → `laboratoryLocationPreference`
//     (one string) there
//   `engagementModel` and `exclusionsDocumentReference` exist ONLY here.
//
// A provider states capability RANGES because it serves many jobs; a buyer states ONE figure because they
// have one job. Merging the two unions would send the wrong field name to one of two `.strict()` schemas.

import {
  CheckboxField,
  ChipMultiSelectField,
  TextAreaField,
  TextField,
  TokenListField,
} from "@/components/commerce/composer/composer-fields";
import {
  toOptionalCents,
  toOptionalCurrencyCode,
  toOptionalPairedRange,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import type { ServiceOfferingDetailInput } from "@/lib/store/providers.schemas";
import {
  FREIGHT_TRANSPORT_MODES,
  type FreightTransportMode,
  type ProviderKind,
} from "@/lib/store/shared.schemas";

/** One superset draft across all nine kinds — same reasoning as the RFQ's requirement draft. */
export interface ServiceOfferingDetailDraft {
  transportModes: FreightTransportMode[];
  supportsConsolidation: boolean;
  supportsContainers: boolean;
  supportsHazardousGoods: boolean;

  jurisdictions: string[];
  importSupported: boolean;
  exportSupported: boolean;
  commodityCoverageSummary: string;

  cargoCoverageClasses: string[];
  coverageLimitMinMajorUnits: string;
  coverageLimitMaxMajorUnits: string;
  coverageCurrency: string;
  exclusionsDocumentReference: string;

  preProduction: boolean;
  duringProduction: boolean;
  preShipment: boolean;
  loadingSupervision: boolean;

  standards: string[];
  accreditationBodies: string[];
  laboratoryLocations: string[];

  channels: string[];
  targetRegions: string[];
  languageCapabilities: string[];
  engagementModel: string;

  storageTypes: string[];
  temperatureControlled: boolean;
  bondedStatus: boolean;
  capacityUnits: string;

  currencyPairs: string[];
  settlementRails: string[];
  minimumNotionalMajorUnits: string;
  maximumNotionalMajorUnits: string;
  notionalCurrency: string;
}

/**
 * Every boolean starts `false`.
 *
 * THAT IS CORRECT HERE AND WOULD BE WRONG ON THE RFQ. `false` is the honest default for a capability: a
 * provider has not claimed anything until they tick the box, and an unticked box publishes "we do not do
 * that" — which is exactly what an unfilled capability form means.
 */
export const EMPTY_SERVICE_OFFERING_DETAIL_DRAFT: ServiceOfferingDetailDraft = {
  transportModes: [],
  supportsConsolidation: false,
  supportsContainers: false,
  supportsHazardousGoods: false,
  jurisdictions: [],
  importSupported: false,
  exportSupported: false,
  commodityCoverageSummary: "",
  cargoCoverageClasses: [],
  coverageLimitMinMajorUnits: "",
  coverageLimitMaxMajorUnits: "",
  coverageCurrency: "",
  exclusionsDocumentReference: "",
  preProduction: false,
  duringProduction: false,
  preShipment: false,
  loadingSupervision: false,
  standards: [],
  accreditationBodies: [],
  laboratoryLocations: [],
  channels: [],
  targetRegions: [],
  languageCapabilities: [],
  engagementModel: "",
  storageTypes: [],
  temperatureControlled: false,
  bondedStatus: false,
  capacityUnits: "",
  currencyPairs: [],
  settlementRails: [],
  minimumNotionalMajorUnits: "",
  maximumNotionalMajorUnits: "",
  notionalCurrency: "",
};

const TRANSPORT_MODE_OPTIONS = FREIGHT_TRANSPORT_MODES.map((mode) => ({
  value: mode,
  label: FREIGHT_TRANSPORT_MODE_LABELS[mode],
}));

/**
 * The draft for one kind as the wire wants it, or `null` when a required field is missing.
 *
 * `transportModes` is the only `.min(1)` in the union; the rest of the arrays are `.max(n)` and may legally be
 * empty. But an offering that lists NO jurisdictions is a customs broker nobody can find — the directory
 * filters on exactly these fields — so the substantive array is treated as required here too. That is a
 * product decision, not a contract one, and it is a refusal to publish an unfindable listing rather than a
 * refusal the server would make.
 */
export function buildOfferingDetailInput(
  providerKind: ProviderKind,
  draft: ServiceOfferingDetailDraft,
): ServiceOfferingDetailInput | null {
  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator": {
      if (draft.transportModes.length === 0) return null;
      return {
        kind: providerKind,
        transportModes: draft.transportModes,
        // NOT conditionally spread. These three are REQUIRED, so `false` must be SENT — omitting it is a 422
        // and, if it parsed, would leave the capability unstated on a listing buyers filter.
        supportsConsolidation: draft.supportsConsolidation,
        supportsContainers: draft.supportsContainers,
        supportsHazardousGoods: draft.supportsHazardousGoods,
      };
    }

    case "customs_broker": {
      if (draft.jurisdictions.length === 0) return null;
      const commodityCoverageSummary = toOptionalText(draft.commodityCoverageSummary);
      return {
        kind: providerKind,
        jurisdictions: draft.jurisdictions,
        importSupported: draft.importSupported,
        exportSupported: draft.exportSupported,
        ...(commodityCoverageSummary === undefined ? {} : { commodityCoverageSummary }),
      };
    }

    case "insurance_provider": {
      if (draft.cargoCoverageClasses.length === 0) return null;
      // A PAIRED RANGE: both ends or neither, and an inverted pair is dropped rather than swapped. The
      // backend enforces this in `validatePairedRange` and again in a Postgres CHECK.
      const coverageLimitRange = toOptionalPairedRange(
        toOptionalCents(draft.coverageLimitMinMajorUnits),
        toOptionalCents(draft.coverageLimitMaxMajorUnits),
      );
      const currency = toOptionalCurrencyCode(draft.coverageCurrency);
      const exclusionsDocumentReference = toOptionalText(draft.exclusionsDocumentReference);
      return {
        kind: providerKind,
        cargoCoverageClasses: draft.cargoCoverageClasses,
        ...(coverageLimitRange === undefined
          ? {}
          : {
              coverageLimitMinInCents: coverageLimitRange.minimum,
              coverageLimitMaxInCents: coverageLimitRange.maximum,
            }),
        ...(currency === undefined ? {} : { currency }),
        ...(exclusionsDocumentReference === undefined ? {} : { exclusionsDocumentReference }),
      };
    }

    case "inspection_agency":
      // FOUR REQUIRED BOOLEANS AND NOTHING ELSE. All four `false` is a legal offering — a strange one, but
      // the form warns rather than refusing, because "we do none of these stages" is the provider's own
      // statement to make.
      return {
        kind: providerKind,
        preProduction: draft.preProduction,
        duringProduction: draft.duringProduction,
        preShipment: draft.preShipment,
        loadingSupervision: draft.loadingSupervision,
      };

    case "testing_certification_lab": {
      if (draft.standards.length === 0) return null;
      return {
        kind: providerKind,
        standards: draft.standards,
        // Required keys holding possibly-empty arrays: present, even when empty. Omitting the key is a 422.
        accreditationBodies: draft.accreditationBodies,
        laboratoryLocations: draft.laboratoryLocations,
      };
    }

    case "marketing_agency": {
      if (draft.channels.length === 0) return null;
      const engagementModel = toOptionalText(draft.engagementModel);
      return {
        kind: providerKind,
        channels: draft.channels,
        targetRegions: draft.targetRegions,
        languageCapabilities: draft.languageCapabilities,
        ...(engagementModel === undefined ? {} : { engagementModel }),
      };
    }

    case "warehouse_provider": {
      if (draft.storageTypes.length === 0) return null;
      const capacityUnits = toOptionalText(draft.capacityUnits);
      return {
        kind: providerKind,
        storageTypes: draft.storageTypes,
        temperatureControlled: draft.temperatureControlled,
        bondedStatus: draft.bondedStatus,
        ...(capacityUnits === undefined ? {} : { capacityUnits }),
      };
    }

    case "foreign_exchange_facilitator": {
      if (draft.currencyPairs.length === 0) return null;
      const notionalRange = toOptionalPairedRange(
        toOptionalCents(draft.minimumNotionalMajorUnits),
        toOptionalCents(draft.maximumNotionalMajorUnits),
      );
      const notionalCurrency = toOptionalCurrencyCode(draft.notionalCurrency);
      return {
        kind: providerKind,
        currencyPairs: draft.currencyPairs,
        settlementRails: draft.settlementRails,
        ...(notionalRange === undefined
          ? {}
          : {
              minimumNotionalInCents: notionalRange.minimum,
              maximumNotionalInCents: notionalRange.maximum,
            }),
        ...(notionalCurrency === undefined ? {} : { notionalCurrency }),
      };
    }

    default: {
      const exhaustiveCheck: never = providerKind;
      return exhaustiveCheck;
    }
  }
}

export default function ServiceOfferingDetailFields({
  providerKind,
  draft,
  onDraftChange,
}: {
  providerKind: ProviderKind;
  draft: ServiceOfferingDetailDraft;
  onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator":
      return (
        <div className="space-y-3">
          <ChipMultiSelectField
            label="Transport modes you operate"
            hint="At least one."
            selectedValues={draft.transportModes}
            options={TRANSPORT_MODE_OPTIONS}
            onSelectedValuesChange={(transportModes) =>
              onDraftChange({ transportModes: [...transportModes] })
            }
          />
          {/* Said once, above the checkboxes: an unticked box is a published "no", not a silence. */}
          <p className="text-[11px] leading-4 text-muted-foreground">
            Buyers filter on these. Leaving one unticked publishes that you do not offer it.
          </p>
          <CheckboxField
            label="We consolidate cargo"
            isChecked={draft.supportsConsolidation}
            onCheckedChange={(supportsConsolidation) => onDraftChange({ supportsConsolidation })}
          />
          <CheckboxField
            label="We handle full containers"
            isChecked={draft.supportsContainers}
            onCheckedChange={(supportsContainers) => onDraftChange({ supportsContainers })}
          />
          <CheckboxField
            label="We handle hazardous goods"
            hint="A capability claim, not a compliance clearance. Lane permissions are still checked per shipment."
            isChecked={draft.supportsHazardousGoods}
            onCheckedChange={(supportsHazardousGoods) => onDraftChange({ supportsHazardousGoods })}
          />
        </div>
      );

    case "customs_broker":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Jurisdictions you file in"
            hint="At least one — buyers search on these."
            values={draft.jurisdictions}
            onValuesChange={(jurisdictions) => onDraftChange({ jurisdictions: [...jurisdictions] })}
            placeholder="Netherlands"
            maxEntries={50}
          />
          <CheckboxField
            label="We file import declarations"
            isChecked={draft.importSupported}
            onCheckedChange={(importSupported) => onDraftChange({ importSupported })}
          />
          <CheckboxField
            label="We file export declarations"
            isChecked={draft.exportSupported}
            onCheckedChange={(exportSupported) => onDraftChange({ exportSupported })}
          />
          <TextAreaField
            label="Commodities you cover"
            value={draft.commodityCoverageSummary}
            onValueChange={(commodityCoverageSummary) =>
              onDraftChange({ commodityCoverageSummary })
            }
            maxLength={2000}
          />
        </div>
      );

    case "insurance_provider":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Cover classes you write"
            hint="At least one."
            values={draft.cargoCoverageClasses}
            onValuesChange={(cargoCoverageClasses) =>
              onDraftChange({ cargoCoverageClasses: [...cargoCoverageClasses] })
            }
            placeholder="All risks"
            maxEntries={50}
          />
          <p className="text-[11px] leading-4 text-muted-foreground">
            Give both ends of the cover limit or neither. One end alone is refused, and a maximum
            below the minimum is dropped rather than swapped.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label="Lowest limit"
              value={draft.coverageLimitMinMajorUnits}
              onValueChange={(coverageLimitMinMajorUnits) =>
                onDraftChange({ coverageLimitMinMajorUnits })
              }
            />
            <TextField
              label="Highest limit"
              value={draft.coverageLimitMaxMajorUnits}
              onValueChange={(coverageLimitMaxMajorUnits) =>
                onDraftChange({ coverageLimitMaxMajorUnits })
              }
            />
            <TextField
              label="Currency"
              hint="Three letters."
              value={draft.coverageCurrency}
              onValueChange={(coverageCurrency) => onDraftChange({ coverageCurrency })}
              maxLength={3}
            />
          </div>
          <TextField
            label="Where your exclusions are published"
            hint="A document reference buyers can ask for. Exclusions are why one premium is lower than another."
            value={draft.exclusionsDocumentReference}
            onValueChange={(exclusionsDocumentReference) =>
              onDraftChange({ exclusionsDocumentReference })
            }
            maxLength={200}
          />
        </div>
      );

    case "inspection_agency":
      return (
        <div className="space-y-3">
          <p className="text-[11px] leading-4 text-muted-foreground">
            Tick every stage you carry out. An unticked stage is published as one you do not offer.
          </p>
          <CheckboxField
            label="Pre-production inspection"
            isChecked={draft.preProduction}
            onCheckedChange={(preProduction) => onDraftChange({ preProduction })}
          />
          <CheckboxField
            label="During production"
            isChecked={draft.duringProduction}
            onCheckedChange={(duringProduction) => onDraftChange({ duringProduction })}
          />
          <CheckboxField
            label="Pre-shipment"
            isChecked={draft.preShipment}
            onCheckedChange={(preShipment) => onDraftChange({ preShipment })}
          />
          <CheckboxField
            label="Container loading supervision"
            isChecked={draft.loadingSupervision}
            onCheckedChange={(loadingSupervision) => onDraftChange({ loadingSupervision })}
          />
          {!draft.preProduction &&
            !draft.duringProduction &&
            !draft.preShipment &&
            !draft.loadingSupervision && (
              // A WARNING, NOT A BLOCK. All four false is a legal offering, and whether to publish an
              // inspection service that lists no stages is the provider's call to make.
              <p className="text-xs leading-4 text-amber-900">
                No stages are ticked, so this listing will say you carry out none of them.
              </p>
            )}
        </div>
      );

    case "testing_certification_lab":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Standards you test against"
            hint="At least one. Add them one at a time — a standard reference can contain a comma."
            values={draft.standards}
            onValuesChange={(standards) => onDraftChange({ standards: [...standards] })}
            placeholder="EN 71-3"
            maxEntries={50}
          />
          <TokenListField
            label="Accreditation bodies"
            values={draft.accreditationBodies}
            onValuesChange={(accreditationBodies) =>
              onDraftChange({ accreditationBodies: [...accreditationBodies] })
            }
            placeholder="UKAS"
            maxEntries={50}
          />
          <TokenListField
            label="Laboratory locations"
            hint="A list here, unlike a buyer's single preference — a lab serves many jobs."
            values={draft.laboratoryLocations}
            onValuesChange={(laboratoryLocations) =>
              onDraftChange({ laboratoryLocations: [...laboratoryLocations] })
            }
            placeholder="Rotterdam, Netherlands"
            maxEntries={50}
          />
        </div>
      );

    case "marketing_agency":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Channels you run"
            hint="At least one."
            values={draft.channels}
            onValuesChange={(channels) => onDraftChange({ channels: [...channels] })}
            placeholder="Trade press"
            maxEntries={50}
          />
          <TokenListField
            label="Regions you cover"
            values={draft.targetRegions}
            onValuesChange={(targetRegions) => onDraftChange({ targetRegions: [...targetRegions] })}
            placeholder="Benelux"
            maxEntries={50}
          />
          <TokenListField
            label="Languages you work in"
            values={draft.languageCapabilities}
            onValuesChange={(languageCapabilities) =>
              onDraftChange({ languageCapabilities: [...languageCapabilities] })
            }
            placeholder="Dutch"
            maxEntries={50}
          />
          <TextField
            label="How you engage"
            hint="Retainer, project, performance — only this side of the contract has this field."
            value={draft.engagementModel}
            onValueChange={(engagementModel) => onDraftChange({ engagementModel })}
            maxLength={200}
          />
        </div>
      );

    case "warehouse_provider":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Storage types you offer"
            hint="At least one."
            values={draft.storageTypes}
            onValuesChange={(storageTypes) => onDraftChange({ storageTypes: [...storageTypes] })}
            placeholder="Bonded"
            maxEntries={50}
          />
          <CheckboxField
            label="Temperature controlled space available"
            isChecked={draft.temperatureControlled}
            onCheckedChange={(temperatureControlled) => onDraftChange({ temperatureControlled })}
          />
          <CheckboxField
            label="Bonded warehouse"
            isChecked={draft.bondedStatus}
            onCheckedChange={(bondedStatus) => onDraftChange({ bondedStatus })}
          />
          <TextField
            label="Capacity"
            hint="In your own units — e.g. 4,000 pallets."
            value={draft.capacityUnits}
            onValueChange={(capacityUnits) => onDraftChange({ capacityUnits })}
            maxLength={80}
          />
        </div>
      );

    case "foreign_exchange_facilitator":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Currency pairs you quote"
            hint="At least one, e.g. USD/INR."
            values={draft.currencyPairs}
            onValuesChange={(currencyPairs) => onDraftChange({ currencyPairs: [...currencyPairs] })}
            placeholder="USD/INR"
            maxEntries={100}
          />
          <TokenListField
            label="Settlement rails"
            values={draft.settlementRails}
            onValuesChange={(settlementRails) =>
              onDraftChange({ settlementRails: [...settlementRails] })
            }
            placeholder="SWIFT"
            maxEntries={50}
          />
          <p className="text-[11px] leading-4 text-muted-foreground">
            Give both ends of the notional band or neither.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label="Smallest notional"
              value={draft.minimumNotionalMajorUnits}
              onValueChange={(minimumNotionalMajorUnits) =>
                onDraftChange({ minimumNotionalMajorUnits })
              }
            />
            <TextField
              label="Largest notional"
              value={draft.maximumNotionalMajorUnits}
              onValueChange={(maximumNotionalMajorUnits) =>
                onDraftChange({ maximumNotionalMajorUnits })
              }
            />
            <TextField
              label="Currency"
              hint="Three letters."
              value={draft.notionalCurrency}
              onValueChange={(notionalCurrency) => onDraftChange({ notionalCurrency })}
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
