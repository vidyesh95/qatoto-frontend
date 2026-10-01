// TRANSPORT: props-only — draft types and builders for RFQ requirement details.
import type { TriStateAnswer } from "@/components/commerce/composer/composer-fields";
import {
  toOptionalBoolean,
  toOptionalCents,
  toOptionalCountryCode,
  toOptionalCurrencyCode,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import type { RfqRequirementDetailInput } from "@/lib/store/rfqs.schemas";
import type { FreightTransportMode, ProviderKind } from "@/lib/store/shared.schemas";

/**
 * ONE draft shape covering all nine kinds, rather than nine draft types.
 *
 * A union here would throw away every answer on each kind change, and switching kind to check a field is
 * something people do while composing. So the draft is a superset and `buildRequirementDetailInput` reads
 * ONLY the fields belonging to the chosen kind — a jurisdiction typed under "customs broker" and then
 * abandoned for "insurance provider" is never sent, because the insurance arm does not look at it.
 */
export interface RfqRequirementDraft {
  transportModes: FreightTransportMode[];
  originCountryCode: string;
  destinationCountryCode: string;
  requiresConsolidation: TriStateAnswer;
  requiresHazardousGoodsSupport: TriStateAnswer;
  cargoDescription: string;

  jurisdictions: string[];
  importRequired: TriStateAnswer;
  exportRequired: TriStateAnswer;
  commoditySummary: string;

  cargoCoverageClasses: string[];
  coverageLimitMajorUnits: string;
  coverageCurrency: string;

  preProduction: TriStateAnswer;
  duringProduction: TriStateAnswer;
  preShipment: TriStateAnswer;
  loadingSupervision: TriStateAnswer;

  standards: string[];
  laboratoryLocationPreference: string;

  channels: string[];
  targetRegions: string[];
  languageCapabilities: string[];

  storageTypes: string[];
  temperatureControlled: TriStateAnswer;
  bondedStatusRequired: TriStateAnswer;
  capacityUnits: string;

  currencyPairs: string[];
  settlementRails: string[];
  notionalMajorUnits: string;
  notionalCurrency: string;
}

export const EMPTY_RFQ_REQUIREMENT_DRAFT: RfqRequirementDraft = {
  transportModes: [],
  originCountryCode: "",
  destinationCountryCode: "",
  requiresConsolidation: "unspecified",
  requiresHazardousGoodsSupport: "unspecified",
  cargoDescription: "",
  jurisdictions: [],
  importRequired: "unspecified",
  exportRequired: "unspecified",
  commoditySummary: "",
  cargoCoverageClasses: [],
  coverageLimitMajorUnits: "",
  coverageCurrency: "",
  preProduction: "unspecified",
  duringProduction: "unspecified",
  preShipment: "unspecified",
  loadingSupervision: "unspecified",
  standards: [],
  laboratoryLocationPreference: "",
  channels: [],
  targetRegions: [],
  languageCapabilities: [],
  storageTypes: [],
  temperatureControlled: "unspecified",
  bondedStatusRequired: "unspecified",
  capacityUnits: "",
  currencyPairs: [],
  settlementRails: [],
  notionalMajorUnits: "",
  notionalCurrency: "",
};

/**
 * The draft for one kind, as the wire wants it. `null` when the kind's REQUIRED fields are not filled.
 *
 * Returning `null` rather than a partial object is what stops a half-built requirement reaching the server.
 * Five of the nine arms have a mandatory array (`transportModes` is `.min(1)`; `jurisdictions`, `standards`,
 * `channels` and the rest are `.max(n)` arrays the service also treats as the substance of the requirement),
 * and a service line with an empty one says nothing a provider can quote against.
 *
 * The inspection arm is the exception: all four of its fields are optional booleans, so an inspection
 * requirement with nothing specified is VALID on the wire. The prose summary carries it — which is exactly
 * why `requirementSummary` is mandatory on every service line.
 */
export function buildRequirementDetailInput(
  providerKind: ProviderKind,
  draft: RfqRequirementDraft,
): RfqRequirementDetailInput | null {
  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator": {
      if (draft.transportModes.length === 0) return null;
      const originCountryCode = toOptionalCountryCode(draft.originCountryCode);
      const destinationCountryCode = toOptionalCountryCode(draft.destinationCountryCode);
      const requiresConsolidation = toOptionalBoolean(draft.requiresConsolidation);
      const requiresHazardousGoodsSupport = toOptionalBoolean(draft.requiresHazardousGoodsSupport);
      const cargoDescription = toOptionalText(draft.cargoDescription);
      return {
        providerKind,
        transportModes: draft.transportModes,
        ...(originCountryCode === undefined ? {} : { originCountryCode }),
        ...(destinationCountryCode === undefined ? {} : { destinationCountryCode }),
        ...(requiresConsolidation === undefined ? {} : { requiresConsolidation }),
        ...(requiresHazardousGoodsSupport === undefined ? {} : { requiresHazardousGoodsSupport }),
        ...(cargoDescription === undefined ? {} : { cargoDescription }),
      };
    }

    case "customs_broker": {
      if (draft.jurisdictions.length === 0) return null;
      const importRequired = toOptionalBoolean(draft.importRequired);
      const exportRequired = toOptionalBoolean(draft.exportRequired);
      const commoditySummary = toOptionalText(draft.commoditySummary);
      return {
        providerKind,
        jurisdictions: draft.jurisdictions,
        ...(importRequired === undefined ? {} : { importRequired }),
        ...(exportRequired === undefined ? {} : { exportRequired }),
        ...(commoditySummary === undefined ? {} : { commoditySummary }),
      };
    }

    case "insurance_provider": {
      if (draft.cargoCoverageClasses.length === 0) return null;
      const coverageLimitInCents = toOptionalCents(draft.coverageLimitMajorUnits);
      const currency = toOptionalCurrencyCode(draft.coverageCurrency);
      return {
        providerKind,
        cargoCoverageClasses: draft.cargoCoverageClasses,
        ...(coverageLimitInCents === undefined ? {} : { coverageLimitInCents }),
        ...(currency === undefined ? {} : { currency }),
      };
    }

    case "inspection_agency": {
      // NO REQUIRED FIELD. Four optional booleans, so "not specified" on all four is a legal requirement —
      // the prose summary on the service line is what a provider reads.
      const preProduction = toOptionalBoolean(draft.preProduction);
      const duringProduction = toOptionalBoolean(draft.duringProduction);
      const preShipment = toOptionalBoolean(draft.preShipment);
      const loadingSupervision = toOptionalBoolean(draft.loadingSupervision);
      return {
        providerKind,
        ...(preProduction === undefined ? {} : { preProduction }),
        ...(duringProduction === undefined ? {} : { duringProduction }),
        ...(preShipment === undefined ? {} : { preShipment }),
        ...(loadingSupervision === undefined ? {} : { loadingSupervision }),
      };
    }

    case "testing_certification_lab": {
      if (draft.standards.length === 0) return null;
      const laboratoryLocationPreference = toOptionalText(draft.laboratoryLocationPreference);
      return {
        providerKind,
        standards: draft.standards,
        ...(laboratoryLocationPreference === undefined ? {} : { laboratoryLocationPreference }),
      };
    }

    case "marketing_agency": {
      if (draft.channels.length === 0) return null;
      // `targetRegions` and `languageCapabilities` are REQUIRED KEYS holding possibly-empty arrays — the
      // backend types them `z.array(...).max(50)` with no `.optional()`, so they must be present. An empty
      // array is a legal value; omitting the key is a 422.
      return {
        providerKind,
        channels: draft.channels,
        targetRegions: draft.targetRegions,
        languageCapabilities: draft.languageCapabilities,
      };
    }

    case "warehouse_provider": {
      if (draft.storageTypes.length === 0) return null;
      const temperatureControlled = toOptionalBoolean(draft.temperatureControlled);
      const bondedStatusRequired = toOptionalBoolean(draft.bondedStatusRequired);
      const capacityUnits = toOptionalText(draft.capacityUnits);
      return {
        providerKind,
        storageTypes: draft.storageTypes,
        ...(temperatureControlled === undefined ? {} : { temperatureControlled }),
        ...(bondedStatusRequired === undefined ? {} : { bondedStatusRequired }),
        ...(capacityUnits === undefined ? {} : { capacityUnits }),
      };
    }

    case "foreign_exchange_facilitator": {
      if (draft.currencyPairs.length === 0) return null;
      const notionalAmountInCents = toOptionalCents(draft.notionalMajorUnits);
      const notionalCurrency = toOptionalCurrencyCode(draft.notionalCurrency);
      return {
        providerKind,
        currencyPairs: draft.currencyPairs,
        settlementRails: draft.settlementRails,
        ...(notionalAmountInCents === undefined ? {} : { notionalAmountInCents }),
        ...(notionalCurrency === undefined ? {} : { notionalCurrency }),
      };
    }

    default: {
      const exhaustiveCheck: never = providerKind;
      return exhaustiveCheck;
    }
  }
}
