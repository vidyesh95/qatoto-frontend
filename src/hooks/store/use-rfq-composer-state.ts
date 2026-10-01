import { useState } from "react";
import type { ProviderKind } from "@/lib/store/shared.schemas";
import { PROVIDER_KINDS } from "@/lib/store/shared.schemas";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import {
  RFQ_VISIBILITIES,
  RFQ_VISIBILITY_LABELS,
  type CreateDraftRfqInput,
  type RfqProductLineInput,
  type RfqServiceLineInput,
  type RfqVisibility,
} from "@/lib/store/rfqs.schemas";
import {
  buildRequirementDetailInput,
  EMPTY_RFQ_REQUIREMENT_DRAFT,
  type RfqRequirementDraft,
} from "@/lib/store/rfq-requirement-draft";
import {
  toOptionalCountryCode,
  toOptionalIsoInstant,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import { useCreateDraftRfq } from "@/hooks/store/rfqs";
import { useAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";

export const COMPOSER_STEPS = [
  { id: "basics", label: "Basics" },
  { id: "delivery", label: "Delivery" },
  { id: "goods", label: "Goods" },
  { id: "services", label: "Services" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
] as const;

export type ComposerStepId = (typeof COMPOSER_STEPS)[number]["id"];

export interface GoodsLineDraft {
  readonly localId: string;
  readonly productId: string | null;
  requestedTitle: string;
  requestedSpecificationSnapshot: string;
  quantity: string;
  unitLabel: string;
}

export interface ServiceLineDraft {
  readonly localId: string;
  providerKind: ProviderKind;
  readonly serviceOfferingId: string | null;
  requirementSummary: string;
  linkedGoodsLineIndex: number | null;
  requirement: RfqRequirementDraft;
}

export interface RfqComposerDraft {
  title: string;
  description: string;
  visibility: RfqVisibility;
  responseDeadlineLocal: string;
  settlementCurrency: string;
  desiredDeliveryStartsLocal: string;
  desiredDeliveryEndsLocal: string;
  destinationCountryCode: string;
  destinationLocality: string;
  attachedDocumentIds: readonly string[];
  goodsLines: readonly GoodsLineDraft[];
  serviceLines: readonly ServiceLineDraft[];
}

export interface RfqGoodsLineSeed {
  readonly productId: string;
  readonly requestedTitle: string;
  readonly requestedSpecificationSnapshot: string;
  readonly quantity: string;
  readonly unitLabel: string;
}

export interface RfqServiceLineSeed {
  readonly serviceOfferingId: string;
  readonly providerKind: ProviderKind;
  readonly requirementSummary: string;
}

export const VISIBILITY_OPTIONS = RFQ_VISIBILITIES.map((visibility) => ({
  value: visibility,
  label: RFQ_VISIBILITY_LABELS[visibility],
}));

export const PROVIDER_KIND_OPTIONS = PROVIDER_KINDS.map((kind) => ({
  value: kind,
  label: PROVIDER_KIND_LABELS[kind],
}));

let nextLocalId = 1;
export function mintLocalId(prefix: "goods" | "service"): string {
  const identifier = `${prefix}-${nextLocalId}`;
  nextLocalId += 1;
  return identifier;
}

export function buildInitialDraft(
  seededGoodsLine: RfqGoodsLineSeed | null,
  seededServiceLine: RfqServiceLineSeed | null,
): RfqComposerDraft {
  return {
    title:
      seededGoodsLine !== null
        ? `Request for ${seededGoodsLine.requestedTitle}`
        : seededServiceLine !== null
          ? `Request for ${PROVIDER_KIND_LABELS[seededServiceLine.providerKind].toLowerCase()}`
          : "",
    description: "",
    visibility: "invited_only",
    responseDeadlineLocal: "",
    settlementCurrency: "USD",
    desiredDeliveryStartsLocal: "",
    desiredDeliveryEndsLocal: "",
    destinationCountryCode: "",
    destinationLocality: "",
    attachedDocumentIds: [],
    goodsLines:
      seededGoodsLine === null ? [] : [{ localId: mintLocalId("goods"), ...seededGoodsLine }],
    serviceLines:
      seededServiceLine === null
        ? []
        : [
            {
              localId: mintLocalId("service"),
              ...seededServiceLine,
              linkedGoodsLineIndex: null,
              requirement: { ...EMPTY_RFQ_REQUIREMENT_DRAFT },
            },
          ],
  };
}

export const SERVICES_STEP_INDEX = COMPOSER_STEPS.findIndex((step) => step.id === "services");

export function remapLinkedIndex(linkedIndex: number | null, removedIndex: number): number | null {
  if (linkedIndex === null) return null;
  if (linkedIndex === removedIndex) return null;
  return linkedIndex > removedIndex ? linkedIndex - 1 : linkedIndex;
}

export function isDeliveryWindowHalfFilled(draft: RfqComposerDraft): boolean {
  const hasStart = draft.desiredDeliveryStartsLocal.trim() !== "";
  const hasEnd = draft.desiredDeliveryEndsLocal.trim() !== "";
  return hasStart !== hasEnd;
}

export function buildCreateDraftRfqInput(draft: RfqComposerDraft): CreateDraftRfqInput | null {
  const title = toOptionalText(draft.title);
  const responseDeadlineAt = toOptionalIsoInstant(draft.responseDeadlineLocal);
  const settlementCurrency = draft.settlementCurrency.trim().toUpperCase();
  if (title === undefined || responseDeadlineAt === undefined) return null;
  if (!/^[A-Z]{3}$/.test(settlementCurrency)) return null;

  const productLines: RfqProductLineInput[] = [];
  for (const [goodsLineIndex, goodsLine] of draft.goodsLines.entries()) {
    const requestedTitle = toOptionalText(goodsLine.requestedTitle);
    const requestedSpecificationSnapshot = toOptionalText(goodsLine.requestedSpecificationSnapshot);
    const unitLabel = toOptionalText(goodsLine.unitLabel);
    const quantity = Number(goodsLine.quantity.trim());
    if (
      requestedTitle === undefined ||
      requestedSpecificationSnapshot === undefined ||
      unitLabel === undefined ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return null;
    }
    productLines.push({
      ...(goodsLine.productId === null ? {} : { productId: goodsLine.productId }),
      requestedTitle,
      requestedSpecificationSnapshot,
      quantity,
      unitLabel,
      siblingOrder: goodsLineIndex,
    });
  }

  const serviceLines: RfqServiceLineInput[] = [];
  for (const [serviceLineIndex, serviceLine] of draft.serviceLines.entries()) {
    const requirementSummary = toOptionalText(serviceLine.requirementSummary);
    const requirementDetail = buildRequirementDetailInput(
      serviceLine.providerKind,
      serviceLine.requirement,
    );
    if (requirementSummary === undefined || requirementDetail === null) return null;
    serviceLines.push({
      providerKind: serviceLine.providerKind,
      requirementSummary,
      siblingOrder: serviceLineIndex,
      requirementDetail,
      ...(serviceLine.serviceOfferingId === null
        ? {}
        : { serviceOfferingId: serviceLine.serviceOfferingId }),
      ...(serviceLine.linkedGoodsLineIndex === null
        ? {}
        : { linkedProductLineSiblingOrder: serviceLine.linkedGoodsLineIndex }),
    });
  }

  if (productLines.length === 0 && serviceLines.length === 0) return null;

  const description = toOptionalText(draft.description);
  const destinationCountryCode = toOptionalCountryCode(draft.destinationCountryCode);
  const destinationLocality = toOptionalText(draft.destinationLocality);

  const desiredDeliveryStartsAt = toOptionalIsoInstant(draft.desiredDeliveryStartsLocal);
  const desiredDeliveryEndsAt = toOptionalIsoInstant(draft.desiredDeliveryEndsLocal);
  const hasCompleteDeliveryWindow =
    desiredDeliveryStartsAt !== undefined && desiredDeliveryEndsAt !== undefined;

  return {
    title,
    visibility: draft.visibility,
    responseDeadlineAt,
    settlementCurrency,
    productLines,
    serviceLines,
    ...(description === undefined ? {} : { description }),
    ...(destinationCountryCode === undefined ? {} : { destinationCountryCode }),
    ...(destinationLocality === undefined ? {} : { destinationLocality }),
    ...(hasCompleteDeliveryWindow ? { desiredDeliveryStartsAt, desiredDeliveryEndsAt } : {}),
    ...(draft.attachedDocumentIds.length === 0 ? {} : { documentIds: draft.attachedDocumentIds }),
  };
}

export function collectMissingRequirements(draft: RfqComposerDraft): string[] {
  const missing: string[] = [];
  if (toOptionalText(draft.title) === undefined) missing.push("A title.");
  if (toOptionalIsoInstant(draft.responseDeadlineLocal) === undefined) {
    missing.push("A date quotes are due by.");
  }
  if (!/^[A-Z]{3}$/.test(draft.settlementCurrency.trim().toUpperCase())) {
    missing.push("A three-letter settlement currency.");
  }
  if (draft.goodsLines.length === 0 && draft.serviceLines.length === 0) {
    missing.push("At least one goods line or service line.");
  }

  for (const [goodsLineIndex, goodsLine] of draft.goodsLines.entries()) {
    const quantity = Number(goodsLine.quantity.trim());
    if (
      toOptionalText(goodsLine.requestedTitle) === undefined ||
      toOptionalText(goodsLine.requestedSpecificationSnapshot) === undefined ||
      toOptionalText(goodsLine.unitLabel) === undefined ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      missing.push(
        `Goods line ${goodsLineIndex + 1} needs a title, a specification, a whole-number quantity above zero, and a unit.`,
      );
    }
  }

  for (const [serviceLineIndex, serviceLine] of draft.serviceLines.entries()) {
    if (toOptionalText(serviceLine.requirementSummary) === undefined) {
      missing.push(`Service line ${serviceLineIndex + 1} needs a description of what you need.`);
    }
    if (buildRequirementDetailInput(serviceLine.providerKind, serviceLine.requirement) === null) {
      missing.push(
        `Service line ${serviceLineIndex + 1} (${PROVIDER_KIND_LABELS[serviceLine.providerKind]}) is missing a required field for that kind of provider.`,
      );
    }
  }

  return missing;
}

export function useRfqComposerState({
  seededGoodsLine = null,
  seededServiceLine = null,
}: {
  readonly seededGoodsLine?: RfqGoodsLineSeed | null;
  readonly seededServiceLine?: RfqServiceLineSeed | null;
} = {}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(
    seededServiceLine !== null && seededGoodsLine === null ? SERVICES_STEP_INDEX : 0,
  );
  const [draft, setDraft] = useState<RfqComposerDraft>(() =>
    buildInitialDraft(seededGoodsLine, seededServiceLine),
  );

  const getIdempotencyKey = useAttemptIdempotencyKey();
  const createDraftRfq = useCreateDraftRfq();

  const applyDraftPatch = (draftPatch: Partial<RfqComposerDraft>) => {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  };

  const addGoodsLine = () => {
    applyDraftPatch({
      goodsLines: [
        ...draft.goodsLines,
        {
          localId: mintLocalId("goods"),
          productId: null,
          requestedTitle: "",
          requestedSpecificationSnapshot: "",
          quantity: "",
          unitLabel: "",
        },
      ],
    });
  };

  const patchGoodsLine = (localId: string, patch: Partial<GoodsLineDraft>) => {
    applyDraftPatch({
      goodsLines: draft.goodsLines.map((goodsLine) =>
        goodsLine.localId === localId ? { ...goodsLine, ...patch } : goodsLine,
      ),
    });
  };

  const removeGoodsLine = (localId: string) => {
    const removedIndex = draft.goodsLines.findIndex((goodsLine) => goodsLine.localId === localId);
    applyDraftPatch({
      goodsLines: draft.goodsLines.filter((goodsLine) => goodsLine.localId !== localId),
      serviceLines: draft.serviceLines.map((serviceLine) => ({
        ...serviceLine,
        linkedGoodsLineIndex: remapLinkedIndex(serviceLine.linkedGoodsLineIndex, removedIndex),
      })),
    });
  };

  const addServiceLine = () => {
    applyDraftPatch({
      serviceLines: [
        ...draft.serviceLines,
        {
          localId: mintLocalId("service"),
          providerKind: "freight_forwarder",
          serviceOfferingId: null,
          requirementSummary: "",
          linkedGoodsLineIndex: null,
          requirement: { ...EMPTY_RFQ_REQUIREMENT_DRAFT },
        },
      ],
    });
  };

  const patchServiceLine = (localId: string, patch: Partial<ServiceLineDraft>) => {
    applyDraftPatch({
      serviceLines: draft.serviceLines.map((serviceLine) =>
        serviceLine.localId === localId ? { ...serviceLine, ...patch } : serviceLine,
      ),
    });
  };

  const removeServiceLine = (localId: string) => {
    applyDraftPatch({
      serviceLines: draft.serviceLines.filter((serviceLine) => serviceLine.localId !== localId),
    });
  };

  const input = buildCreateDraftRfqInput(draft);

  const handleSubmit = () => {
    if (input === null) return;
    createDraftRfq.mutate({ input, idempotencyKey: getIdempotencyKey() });
  };

  const goToPreviousStep = () => setCurrentStepIndex(currentStepIndex - 1);
  const goToNextStep = () => setCurrentStepIndex(currentStepIndex + 1);
  const isLastStep = currentStepIndex === COMPOSER_STEPS.length - 1;

  return {
    currentStepIndex,
    setCurrentStepIndex,
    goToPreviousStep,
    goToNextStep,
    isLastStep,
    draft,
    applyDraftPatch,
    addGoodsLine,
    patchGoodsLine,
    removeGoodsLine,
    addServiceLine,
    patchServiceLine,
    removeServiceLine,
    input,
    createDraftRfq,
    handleSubmit,
  };
}
