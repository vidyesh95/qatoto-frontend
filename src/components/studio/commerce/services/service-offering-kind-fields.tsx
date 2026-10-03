"use client";

import {
  CheckboxField,
  ChipMultiSelectField,
  TextAreaField,
  TextField,
  TokenListField,
} from "@/components/commerce/composer/composer-fields";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";
import {
  CARGO_COVERAGE_CLASS_CODES,
  CARGO_COVERAGE_CLASS_LABELS,
} from "@/lib/store/providers.schemas";
import type { ServiceOfferingDetailDraft } from "@/lib/store/service-offering-draft";
import { FREIGHT_TRANSPORT_MODES } from "@/lib/store/shared.schemas";

const COVERAGE_CLASS_OPTIONS = CARGO_COVERAGE_CLASS_CODES.map((coverageClassCode) => ({
  value: coverageClassCode,
  label: CARGO_COVERAGE_CLASS_LABELS[coverageClassCode],
}));

const TRANSPORT_MODE_OPTIONS = FREIGHT_TRANSPORT_MODES.map((mode) => ({
  value: mode,
  label: FREIGHT_TRANSPORT_MODE_LABELS[mode],
}));

export function FreightAndLogisticsFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
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
      <p className="text-xs leading-4 text-muted-foreground">
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
}

export function CustomsBrokerFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
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
        onValueChange={(commodityCoverageSummary) => onDraftChange({ commodityCoverageSummary })}
        maxLength={2000}
      />
    </div>
  );
}

export function InsuranceProviderFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
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
      {/* THE FILTER, BESIDE THE WORDS ABOVE — the factory "Filterable code" precedent. The classes
          you type are what buyers read; these are what they can filter on. Optional. */}
      <ChipMultiSelectField
        label="Filterable cover types (optional)"
        hint="Buyers can filter insurers by these. If you write stock throughput, tick Goods in storage too: it covers goods while stored."
        selectedValues={draft.coverageClassCodes}
        options={COVERAGE_CLASS_OPTIONS}
        onSelectedValuesChange={(coverageClassCodes) =>
          onDraftChange({ coverageClassCodes: [...coverageClassCodes] })
        }
      />
      <p className="text-xs leading-4 text-muted-foreground">
        Give both ends of the cover limit or neither. One end alone is refused, and a maximum below
        the minimum is dropped rather than swapped.
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
}

export function InspectionAgencyFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-4 text-muted-foreground">
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
          <p className="text-xs leading-4 text-warning">
            No stages are ticked, so this listing will say you carry out none of them.
          </p>
        )}
    </div>
  );
}

export function TestingLabFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
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
}

export function MarketingAgencyFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
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
}

export function WarehouseProviderFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
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
}

export function ForexFacilitatorFields({
  draft,
  onDraftChange,
}: {
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
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
      <p className="text-xs leading-4 text-muted-foreground">
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
}
