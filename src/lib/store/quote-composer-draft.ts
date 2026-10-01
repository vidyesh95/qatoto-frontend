import {
  toOptionalCents,
  toOptionalCurrencyCode,
  toOptionalIsoInstant,
  toOptionalNonNegativeInteger,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import {
  buildQuoteServiceDetailInput,
  collectMissingServiceDetailFields,
  EMPTY_QUOTE_SERVICE_DETAIL_DRAFT,
  type QuoteServiceDetailDraft,
} from "@/lib/store/quote-service-draft";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import type {
  AppendQuoteRevisionInput,
  QuoteIncoterm,
  QuoteProductLineInput,
  QuoteServiceLineInput,
  QuoteStatus,
} from "@/lib/store/quotes.schemas";
import type { RfqDetail } from "@/lib/store/rfqs.schemas";

export const COMPOSER_STEPS = [
  { id: "goods", label: "Goods" },
  { id: "services", label: "Services" },
  { id: "terms", label: "Terms" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
] as const;

export type ComposerStepId = (typeof COMPOSER_STEPS)[number]["id"];

export const MUTABLE_QUOTE_STATUSES: readonly QuoteStatus[] = ["draft", "submitted"];

export const DEFAULT_VALIDITY_DAYS = 30;
export const SHORT_VALIDITY_WARNING_HOURS = 24;

export type ValidityDeadlineStanding = "unset" | "past" | "short" | "ample";

export function classifyValidityDeadline(
  rawLocalDateTime: string,
  nowEpochMs: number,
): ValidityDeadlineStanding {
  const isoInstant = toOptionalIsoInstant(rawLocalDateTime);
  if (isoInstant === undefined) return "unset";
  const millisecondsRemaining = Date.parse(isoInstant) - nowEpochMs;
  if (millisecondsRemaining <= 0) return "past";
  return millisecondsRemaining <= SHORT_VALIDITY_WARNING_HOURS * 60 * 60 * 1000 ? "short" : "ample";
}

export interface ProductLineDraft {
  isQuoted: boolean;
  quantity: string;
  unitPriceMajorUnits: string;
  titleSnapshot: string;
  specificationSnapshot: string;
  leadTimeDays: string;
  exclusionsSnapshot: string;
}

export interface DeliverableDraft {
  title: string;
  isRequired: boolean;
  dueAtLocal: string;
}

export interface ServiceLineDraft {
  isQuoted: boolean;
  feeMajorUnits: string;
  titleSnapshot: string;
  scopeSnapshot: string;
  leadTimeDays: string;
  exclusionsSnapshot: string;
  deliverableSnapshot: string;
  deliverables: DeliverableDraft[];
  serviceDetail: QuoteServiceDetailDraft;
}

export interface QuoteDraft {
  currency: string;
  validityDeadlineLocal: string;
  taxMajorUnits: string;
  serviceFeeMajorUnits: string;
  shippingMajorUnits: string;
  discountMajorUnits: string;
  paymentTerms: string;
  incoterm: QuoteIncoterm | "";
  notes: string;
  productLines: Record<string, ProductLineDraft>;
  serviceLines: Record<string, ServiceLineDraft>;
  attachedDocumentIds: string[];
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function buildDefaultValidityDeadlineLocal(
  fromEpochMs: number,
  daysFromNow: number,
): string {
  const deadline = new Date(fromEpochMs + daysFromNow * 24 * 60 * 60 * 1000);
  return `${deadline.getFullYear()}-${padTwoDigits(deadline.getMonth() + 1)}-${padTwoDigits(deadline.getDate())}T${padTwoDigits(deadline.getHours())}:${padTwoDigits(deadline.getMinutes())}`;
}

export function buildInitialDraft(rfq: RfqDetail): QuoteDraft {
  const productLines: Record<string, ProductLineDraft> = {};
  for (const rfqProductLine of rfq.productLines) {
    productLines[rfqProductLine.id] = {
      isQuoted: false,
      quantity: String(rfqProductLine.quantity),
      unitPriceMajorUnits: "",
      titleSnapshot: rfqProductLine.requestedTitle,
      specificationSnapshot: rfqProductLine.requestedSpecificationSnapshot,
      leadTimeDays: "",
      exclusionsSnapshot: "",
    };
  }

  const serviceLines: Record<string, ServiceLineDraft> = {};
  for (const rfqServiceLine of rfq.serviceLines) {
    serviceLines[rfqServiceLine.id] = {
      isQuoted: false,
      feeMajorUnits: "",
      titleSnapshot: PROVIDER_KIND_LABELS[rfqServiceLine.providerKind],
      scopeSnapshot: rfqServiceLine.requirementSummary,
      leadTimeDays: "",
      exclusionsSnapshot: "",
      deliverableSnapshot: "",
      deliverables: [],
      serviceDetail: { ...EMPTY_QUOTE_SERVICE_DETAIL_DRAFT },
    };
  }

  return {
    currency: rfq.settlementCurrency,
    validityDeadlineLocal: "",
    taxMajorUnits: "",
    serviceFeeMajorUnits: "",
    shippingMajorUnits: "",
    discountMajorUnits: "",
    paymentTerms: "",
    incoterm: "",
    notes: "",
    productLines,
    serviceLines,
    attachedDocumentIds: [],
  };
}

export function buildAppendQuoteRevisionInput(
  rfq: RfqDetail,
  draft: QuoteDraft,
): AppendQuoteRevisionInput | null {
  const currency = toOptionalCurrencyCode(draft.currency);
  const validityDeadlineAt = toOptionalIsoInstant(draft.validityDeadlineLocal);
  if (currency === undefined || validityDeadlineAt === undefined) return null;
  if (Date.parse(validityDeadlineAt) <= Date.now()) return null;

  const productLines: QuoteProductLineInput[] = [];
  for (const rfqProductLine of rfq.productLines) {
    const lineDraft = draft.productLines[rfqProductLine.id];
    if (lineDraft === undefined || !lineDraft.isQuoted) continue;

    const quantity = toOptionalNonNegativeInteger(lineDraft.quantity);
    const unitPriceInCents = toOptionalCents(lineDraft.unitPriceMajorUnits);
    const titleSnapshot = toOptionalText(lineDraft.titleSnapshot);
    const specificationSnapshot = toOptionalText(lineDraft.specificationSnapshot);
    if (
      quantity === undefined ||
      quantity <= 0 ||
      unitPriceInCents === undefined ||
      titleSnapshot === undefined ||
      specificationSnapshot === undefined
    ) {
      return null;
    }

    const leadTimeDays = toOptionalNonNegativeInteger(lineDraft.leadTimeDays);
    const exclusionsSnapshot = toOptionalText(lineDraft.exclusionsSnapshot);
    productLines.push({
      rfqProductLineId: rfqProductLine.id,
      quantity,
      unitPriceInCents,
      titleSnapshot,
      specificationSnapshot,
      siblingOrder: productLines.length,
      ...(leadTimeDays === undefined ? {} : { leadTimeDays }),
      ...(exclusionsSnapshot === undefined ? {} : { exclusionsSnapshot }),
    });
  }

  const serviceLines: QuoteServiceLineInput[] = [];
  for (const rfqServiceLine of rfq.serviceLines) {
    const lineDraft = draft.serviceLines[rfqServiceLine.id];
    if (lineDraft === undefined || !lineDraft.isQuoted) continue;

    const feeInCents = toOptionalCents(lineDraft.feeMajorUnits);
    const titleSnapshot = toOptionalText(lineDraft.titleSnapshot);
    const scopeSnapshot = toOptionalText(lineDraft.scopeSnapshot);
    const serviceDetail = buildQuoteServiceDetailInput(
      rfqServiceLine.providerKind,
      lineDraft.serviceDetail,
    );
    if (
      feeInCents === undefined ||
      titleSnapshot === undefined ||
      scopeSnapshot === undefined ||
      serviceDetail === null
    ) {
      return null;
    }

    const leadTimeDays = toOptionalNonNegativeInteger(lineDraft.leadTimeDays);
    const exclusionsSnapshot = toOptionalText(lineDraft.exclusionsSnapshot);
    const deliverableSnapshot = toOptionalText(lineDraft.deliverableSnapshot);

    const deliverables = lineDraft.deliverables.flatMap((deliverable, deliverableIndex) => {
      const title = toOptionalText(deliverable.title);
      if (title === undefined) return [];
      const dueAt = toOptionalIsoInstant(deliverable.dueAtLocal);
      return [
        {
          sequence: deliverableIndex,
          title,
          isRequired: deliverable.isRequired,
          ...(dueAt === undefined ? {} : { dueAt }),
        },
      ];
    });

    serviceLines.push({
      rfqServiceLineId: rfqServiceLine.id,
      feeInCents,
      titleSnapshot,
      scopeSnapshot,
      deliverables,
      siblingOrder: serviceLines.length,
      serviceDetail,
      ...(leadTimeDays === undefined ? {} : { leadTimeDays }),
      ...(exclusionsSnapshot === undefined ? {} : { exclusionsSnapshot }),
      ...(deliverableSnapshot === undefined ? {} : { deliverableSnapshot }),
    });
  }

  if (productLines.length === 0 && serviceLines.length === 0) return null;

  const paymentTerms = toOptionalText(draft.paymentTerms);
  const notes = toOptionalText(draft.notes);

  return {
    currency,
    validityDeadlineAt,
    taxInCents: toOptionalCents(draft.taxMajorUnits) ?? 0,
    serviceFeeInCents: toOptionalCents(draft.serviceFeeMajorUnits) ?? 0,
    shippingInCents: toOptionalCents(draft.shippingMajorUnits) ?? 0,
    discountInCents: toOptionalCents(draft.discountMajorUnits) ?? 0,
    productLines,
    serviceLines,
    ...(paymentTerms === undefined ? {} : { paymentTerms }),
    ...(draft.incoterm === "" ? {} : { incoterm: draft.incoterm }),
    ...(notes === undefined ? {} : { notes }),
    ...(draft.attachedDocumentIds.length === 0 ? {} : { documentIds: draft.attachedDocumentIds }),
  };
}

export function collectMissingRequirements(
  rfq: RfqDetail,
  draft: QuoteDraft,
  validityDeadlineStanding: ValidityDeadlineStanding,
): readonly string[] {
  const missing: string[] = [];

  if (toOptionalCurrencyCode(draft.currency) === undefined) {
    missing.push("A three-letter currency code.");
  }

  if (validityDeadlineStanding === "unset") {
    missing.push("A date this quote stays valid until.");
  } else if (validityDeadlineStanding === "past") {
    missing.push("A validity deadline in the future — the one set has already passed.");
  }

  let quotedLineCount = 0;

  for (const rfqProductLine of rfq.productLines) {
    const lineDraft = draft.productLines[rfqProductLine.id];
    if (lineDraft === undefined || !lineDraft.isQuoted) continue;
    quotedLineCount += 1;
    const label = rfqProductLine.requestedTitle;
    const quantity = toOptionalNonNegativeInteger(lineDraft.quantity);
    if (quantity === undefined || quantity <= 0)
      missing.push(`${label}: a quantity of at least one.`);
    if (toOptionalCents(lineDraft.unitPriceMajorUnits) === undefined) {
      missing.push(`${label}: a unit price.`);
    }
    if (toOptionalText(lineDraft.titleSnapshot) === undefined) missing.push(`${label}: a title.`);
    if (toOptionalText(lineDraft.specificationSnapshot) === undefined) {
      missing.push(`${label}: a specification.`);
    }
  }

  for (const rfqServiceLine of rfq.serviceLines) {
    const lineDraft = draft.serviceLines[rfqServiceLine.id];
    if (lineDraft === undefined || !lineDraft.isQuoted) continue;
    quotedLineCount += 1;
    const label = PROVIDER_KIND_LABELS[rfqServiceLine.providerKind];
    if (toOptionalCents(lineDraft.feeMajorUnits) === undefined) missing.push(`${label}: a fee.`);
    if (toOptionalText(lineDraft.titleSnapshot) === undefined) missing.push(`${label}: a title.`);
    if (toOptionalText(lineDraft.scopeSnapshot) === undefined) missing.push(`${label}: a scope.`);
    for (const missingDetailField of collectMissingServiceDetailFields(
      rfqServiceLine.providerKind,
      lineDraft.serviceDetail,
    )) {
      missing.push(`${label}: ${missingDetailField}.`);
    }
  }

  if (quotedLineCount === 0) {
    missing.push("At least one item or service you are quoting for.");
  }

  return missing;
}

export type QuoteComposerState =
  | { status: "loadingRequest" }
  | { status: "requestUnavailable"; message: string }
  | { status: "notQuotable"; reason: "callerIsBuyer" | "requestNotOpen"; rfqTitle: string }
  | { status: "loadingExistingQuote" }
  | { status: "quoteClosed"; quoteId: string; quoteStatus: QuoteStatus }
  | {
      status: "resumeUnsubmittedRevision";
      quoteId: string;
      rfqTitle: string;
      revisionNumber: number;
      validityDeadlineAt: string;
      totalInCents: number;
      currency: string;
    }
  | { status: "composing"; rfq: RfqDetail; quoteId: string | null };
