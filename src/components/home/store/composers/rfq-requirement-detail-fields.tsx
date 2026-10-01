// TRANSPORT: props-only — a controlled form over one requirement draft. Sends nothing.
"use client";

// THE FOURTH NINE-ARM SWITCH ON THIS SURFACE, and the first one that WRITES.
//
// The three read-side unions render what a server sent. This one builds what the server will store, which
// changes the failure mode entirely: a wrong field name on a read is a missing value on screen, and a wrong
// field name here is a 422 from a `.strict()` schema — or worse, a field that parses and stores a claim the
// buyer never made.
//
// EVERY BOOLEAN IN THIS FORM IS TRI-STATE, and that is the single most important thing about the file.
// `RequirementDetailSchema` declares them `.optional()`, so "not specified" is a real, storable answer that
// means the buyer did not ask. A checkbox has no way to express it — an unchecked box would send `false` and
// tell the backend the buyer does NOT need consolidation, which filters out every provider who offers it.
//
// The draft type keeps STRINGS and `TriStateAnswer`s. Conversion to wire types happens once, in
// `buildRequirementDetailInput`, where a blank field becomes an omitted key rather than a zero.
//
// FIELD NAMES ARE NOT SHARED WITH THE OFFERING COMPOSER. `importRequired` here is `importSupported` there;
// `commoditySummary` here is `commodityCoverageSummary` there; `bondedStatusRequired` here is `bondedStatus`
// there. Two `.strict()` schemas, two vocabularies — see `providers.schemas.ts`.

import {
  ChipMultiSelectField,
  TextAreaField,
  TextField,
  TokenListField,
  TriStateBooleanField,
} from "@/components/commerce/composer/composer-fields";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import type { RfqRequirementDraft } from "@/lib/store/rfq-requirement-draft";
import { FREIGHT_TRANSPORT_MODES, type ProviderKind } from "@/lib/store/shared.schemas";

const TRANSPORT_MODE_OPTIONS = FREIGHT_TRANSPORT_MODES.map((mode) => ({
  value: mode,
  label: FREIGHT_TRANSPORT_MODE_LABELS[mode],
}));

export default function RfqRequirementDetailFields({
  providerKind,
  draft,
  onDraftChange,
}: {
  providerKind: ProviderKind;
  draft: RfqRequirementDraft;
  onDraftChange: (draftPatch: Partial<RfqRequirementDraft>) => void;
}) {
  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator":
      return (
        <div className="space-y-3">
          <ChipMultiSelectField
            label="Transport modes"
            hint="At least one. This is the only required field for a freight line."
            selectedValues={draft.transportModes}
            options={TRANSPORT_MODE_OPTIONS}
            onSelectedValuesChange={(transportModes) =>
              onDraftChange({ transportModes: [...transportModes] })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="From (country code)"
              hint="Two letters, e.g. CN."
              value={draft.originCountryCode}
              onValueChange={(originCountryCode) => onDraftChange({ originCountryCode })}
              maxLength={2}
            />
            <TextField
              label="To (country code)"
              hint="Two letters, e.g. NL."
              value={draft.destinationCountryCode}
              onValueChange={(destinationCountryCode) => onDraftChange({ destinationCountryCode })}
              maxLength={2}
            />
          </div>
          <TriStateBooleanField
            label="Do you need consolidation?"
            hint="Leave unspecified if it does not matter — saying No filters out forwarders who offer it."
            value={draft.requiresConsolidation}
            onValueChange={(requiresConsolidation) => onDraftChange({ requiresConsolidation })}
          />
          <TriStateBooleanField
            label="Does the cargo include hazardous goods?"
            hint="A provider who cannot carry dangerous goods needs to know before quoting."
            value={draft.requiresHazardousGoodsSupport}
            onValueChange={(requiresHazardousGoodsSupport) =>
              onDraftChange({ requiresHazardousGoodsSupport })
            }
          />
          <TextAreaField
            label="Cargo description"
            value={draft.cargoDescription}
            onValueChange={(cargoDescription) => onDraftChange({ cargoDescription })}
            maxLength={4000}
          />
        </div>
      );

    case "customs_broker":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Jurisdictions"
            hint="Where clearance is needed. At least one."
            values={draft.jurisdictions}
            onValuesChange={(jurisdictions) => onDraftChange({ jurisdictions: [...jurisdictions] })}
            placeholder="Netherlands"
            maxEntries={50}
          />
          <TriStateBooleanField
            label="Import clearance needed?"
            value={draft.importRequired}
            onValueChange={(importRequired) => onDraftChange({ importRequired })}
          />
          <TriStateBooleanField
            label="Export clearance needed?"
            value={draft.exportRequired}
            onValueChange={(exportRequired) => onDraftChange({ exportRequired })}
          />
          <TextAreaField
            label="What is being cleared"
            value={draft.commoditySummary}
            onValueChange={(commoditySummary) => onDraftChange({ commoditySummary })}
            maxLength={2000}
          />
        </div>
      );

    case "insurance_provider":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Cover classes"
            hint="What the cargo insurance has to cover. At least one."
            values={draft.cargoCoverageClasses}
            onValuesChange={(cargoCoverageClasses) =>
              onDraftChange({ cargoCoverageClasses: [...cargoCoverageClasses] })
            }
            placeholder="All risks"
            maxEntries={50}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Cover limit"
              hint="Leave blank if you want the insurer to propose one. Blank is not zero."
              value={draft.coverageLimitMajorUnits}
              onValueChange={(coverageLimitMajorUnits) =>
                onDraftChange({ coverageLimitMajorUnits })
              }
            />
            <TextField
              label="Currency of that limit"
              hint="Three letters, e.g. USD."
              value={draft.coverageCurrency}
              onValueChange={(coverageCurrency) => onDraftChange({ coverageCurrency })}
              maxLength={3}
            />
          </div>
        </div>
      );

    case "inspection_agency":
      return (
        <div className="space-y-3">
          {/* THE ONLY ARM WITH NO REQUIRED FIELD. Leaving all four unspecified is legal, and the prose
              summary on the line is then the whole requirement. */}
          <p className="text-xs leading-4 text-muted-foreground">
            Every stage below is optional. Leaving one unspecified means you have not asked about it
            — it does not mean No.
          </p>
          <TriStateBooleanField
            label="Pre-production inspection"
            value={draft.preProduction}
            onValueChange={(preProduction) => onDraftChange({ preProduction })}
          />
          <TriStateBooleanField
            label="During production"
            value={draft.duringProduction}
            onValueChange={(duringProduction) => onDraftChange({ duringProduction })}
          />
          <TriStateBooleanField
            label="Pre-shipment"
            value={draft.preShipment}
            onValueChange={(preShipment) => onDraftChange({ preShipment })}
          />
          <TriStateBooleanField
            label="Container loading supervision"
            value={draft.loadingSupervision}
            onValueChange={(loadingSupervision) => onDraftChange({ loadingSupervision })}
          />
        </div>
      );

    case "testing_certification_lab":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Standards to test against"
            hint="At least one. Add them one at a time — a standard reference can contain a comma."
            values={draft.standards}
            onValuesChange={(standards) => onDraftChange({ standards: [...standards] })}
            placeholder="EN 71-3"
            maxEntries={50}
          />
          <TextField
            label="Preferred laboratory location"
            hint="One preference, not a list — the wire field here is a single string."
            value={draft.laboratoryLocationPreference}
            onValueChange={(laboratoryLocationPreference) =>
              onDraftChange({ laboratoryLocationPreference })
            }
            maxLength={200}
          />
        </div>
      );

    case "marketing_agency":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Channels"
            hint="At least one."
            values={draft.channels}
            onValuesChange={(channels) => onDraftChange({ channels: [...channels] })}
            placeholder="Trade press"
            maxEntries={50}
          />
          <TokenListField
            label="Target regions"
            values={draft.targetRegions}
            onValuesChange={(targetRegions) => onDraftChange({ targetRegions: [...targetRegions] })}
            placeholder="Benelux"
            maxEntries={50}
          />
          <TokenListField
            label="Languages needed"
            values={draft.languageCapabilities}
            onValuesChange={(languageCapabilities) =>
              onDraftChange({ languageCapabilities: [...languageCapabilities] })
            }
            placeholder="Dutch"
            maxEntries={50}
          />
        </div>
      );

    case "warehouse_provider":
      return (
        <div className="space-y-3">
          <TokenListField
            label="Storage types"
            hint="At least one."
            values={draft.storageTypes}
            onValuesChange={(storageTypes) => onDraftChange({ storageTypes: [...storageTypes] })}
            placeholder="Bonded"
            maxEntries={50}
          />
          <TriStateBooleanField
            label="Temperature controlled?"
            value={draft.temperatureControlled}
            onValueChange={(temperatureControlled) => onDraftChange({ temperatureControlled })}
          />
          <TriStateBooleanField
            label="Bonded status required?"
            value={draft.bondedStatusRequired}
            onValueChange={(bondedStatusRequired) => onDraftChange({ bondedStatusRequired })}
          />
          <TextField
            label="How much space"
            hint="In your own units — e.g. 120 pallets."
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
            label="Currency pairs"
            hint="At least one, e.g. USD/INR."
            values={draft.currencyPairs}
            onValuesChange={(currencyPairs) => onDraftChange({ currencyPairs: [...currencyPairs] })}
            placeholder="USD/INR"
            maxEntries={100}
          />
          <TokenListField
            label="Settlement rails you can use"
            values={draft.settlementRails}
            onValuesChange={(settlementRails) =>
              onDraftChange({ settlementRails: [...settlementRails] })
            }
            placeholder="SWIFT"
            maxEntries={50}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Approximate notional"
              hint="Blank means you have not said. It does not mean zero."
              value={draft.notionalMajorUnits}
              onValueChange={(notionalMajorUnits) => onDraftChange({ notionalMajorUnits })}
            />
            <TextField
              label="Currency of that notional"
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
