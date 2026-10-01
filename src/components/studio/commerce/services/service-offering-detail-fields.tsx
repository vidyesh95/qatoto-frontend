// TRANSPORT: props-only — rendered inside ServiceOfferingComposer.
"use client";

import type { ServiceOfferingDetailDraft } from "@/lib/store/service-offering-draft";
import type { ProviderKind } from "@/lib/store/shared.schemas";
import {
  CustomsBrokerFields,
  ForexFacilitatorFields,
  FreightAndLogisticsFields,
  InspectionAgencyFields,
  InsuranceProviderFields,
  MarketingAgencyFields,
  TestingLabFields,
  WarehouseProviderFields,
} from "./service-offering-kind-fields";

export default function ServiceOfferingDetailFields({
  providerKind,
  draft,
  onDraftChange,
}: {
  readonly providerKind: ProviderKind;
  readonly draft: ServiceOfferingDetailDraft;
  readonly onDraftChange: (draftPatch: Partial<ServiceOfferingDetailDraft>) => void;
}) {
  switch (providerKind) {
    case "freight_forwarder":
    case "logistics_operator":
      return <FreightAndLogisticsFields draft={draft} onDraftChange={onDraftChange} />;
    case "customs_broker":
      return <CustomsBrokerFields draft={draft} onDraftChange={onDraftChange} />;
    case "insurance_provider":
      return <InsuranceProviderFields draft={draft} onDraftChange={onDraftChange} />;
    case "inspection_agency":
      return <InspectionAgencyFields draft={draft} onDraftChange={onDraftChange} />;
    case "testing_certification_lab":
      return <TestingLabFields draft={draft} onDraftChange={onDraftChange} />;
    case "marketing_agency":
      return <MarketingAgencyFields draft={draft} onDraftChange={onDraftChange} />;
    case "warehouse_provider":
      return <WarehouseProviderFields draft={draft} onDraftChange={onDraftChange} />;
    case "foreign_exchange_facilitator":
      return <ForexFacilitatorFields draft={draft} onDraftChange={onDraftChange} />;
    default: {
      const exhaustiveCheck: never = providerKind;
      return exhaustiveCheck;
    }
  }
}
