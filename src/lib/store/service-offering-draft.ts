// TRANSPORT: props-only — draft types and builders for service offering details.

import {
  toOptionalCents,
  toOptionalCurrencyCode,
  toOptionalPairedRange,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import type {
  CargoCoverageClassCode,
  ServiceOfferingDetailInput,
} from "@/lib/store/providers.schemas";
import type { FreightTransportMode, ProviderKind } from "@/lib/store/shared.schemas";

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
  coverageClassCodes: CargoCoverageClassCode[];
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
  coverageClassCodes: [],
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
        // Optional and additive: none ticked sends nothing, and the backend defaults it to none.
        ...(draft.coverageClassCodes.length === 0
          ? {}
          : { coverageClassCodes: draft.coverageClassCodes }),
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
