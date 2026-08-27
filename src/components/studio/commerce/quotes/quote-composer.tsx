// TRANSPORT: client-query — reads the RFQ and this provider's quote, then writes up to three times.
"use client";

// THE ANSWER TO AN RFQ, and the half of procurement that had no frontend at all: a buyer could open a
// request and a provider could read it, and there the flow stopped.
//
// THREE CALLS, AND THEY ARE NOT THREE STEPS OF ONE SAVE:
//
//   1. `POST /commerce/rfqs/:rfqId/quotes` mints an empty SHELL. One per provider per RFQ, forever.
//   2. `POST /commerce/quotes/:quoteId/revisions` appends a priced REVISION. The server computes the
//      subtotal and total, so this call is the first honest price anybody sees.
//   3. `POST .../revisions/:revision/submit` FREEZES that revision and offers it to the buyer.
//
// FOUR BACKEND FACTS SHAPE EVERY DECISION BELOW. None is guessable from the route list:
//
//  A. CREATING THE SHELL TELLS THE BUYER YOU ANSWERED. It flips this provider's invitation to
//     `responded`, which the buyer's RFQ page renders as "Quoted". So the shell is minted on the
//     first real pricing attempt, NOT on mount — a shell created by opening a form would tell the
//     buyer they had been quoted while nothing existed.
//
//  B. ONE QUOTE PER RFQ, FOREVER. A second shell is a 409 regardless of the first quote's status, so
//     withdrawing does not free the slot. That 409 is therefore a RECOVERY here, not an error: the
//     composer re-reads, finds the existing id and appends to it.
//
//  C. APPEND IS A COMMITMENT, NOT A SAVE — but it is now REVERSIBLE. Only one unsubmitted revision
//     may exist at a time, so after appending the screen goes terminal rather than returning to a
//     form whose next press would 422. The two ways forward are submit and DISCARD
//     (`DELETE /commerce/quotes/:quoteId/revisions/:revision`), and discarding rolls the quote's
//     `latestRevisionNumber` back so the next append reuses the number just freed.
//
//  D. THE EXPIRY TRAP IS CLOSED, and this is why the discard control is not a convenience. Before it
//     existed, a revision whose `validityDeadlineAt` passed could not be submitted
//     (`QUOTE_EXPIRED`), could not be replaced by (C), and could not be restarted by (B) — the quote
//     was finished for that RFQ with no operator path out. The generous default deadline and the
//     short-deadline warning below are still worth keeping, but they are now advice rather than the
//     only thing standing between a provider and a dead quote.
//
// ONLY THE SHELL CALL CHECKS THE RFQ'S STATE. Append and submit look at the QUOTE's status alone, so a
// provider who already has a quote may keep revising after the buyer closes the RFQ. The "not open"
// gate below therefore applies to the FIRST quote only; applying it to a revision would block a
// legitimate one.
//
// NOTHING IS OPTIMISTIC. Every number on the confirmation comes from the server's append response, not
// from the draft that produced it.

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import {
  ComposerStepRail,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/commerce/composer/composer-fields";
import {
  toOptionalCents,
  toOptionalCurrencyCode,
  toOptionalIsoInstant,
  toOptionalNonNegativeInteger,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import MutationNotice from "@/components/home/store/shared/mutation-notice";
import TradeDocumentPicker from "@/components/commerce/trade-document-picker";
import QuoteServiceDetailFields, {
  EMPTY_QUOTE_SERVICE_DETAIL_DRAFT,
  buildQuoteServiceDetailInput,
  collectMissingServiceDetailFields,
  type QuoteServiceDetailDraft,
} from "@/components/studio/commerce/quotes/quote-service-detail-fields";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  useAbandonQuoteRevision,
  useAppendQuoteRevision,
  useCreateQuoteShell,
  useQuoteComparisonQuery,
  useQuoteQuery,
  useSubmitQuoteRevision,
} from "@/hooks/store/quotes";
import { useRfqQuery } from "@/hooks/store/rfqs";
import { formatCentsLabel } from "@/lib/store/format";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import {
  QUOTE_INCOTERMS,
  QUOTE_INCOTERM_LABELS,
  QUOTE_STATUS_LABELS,
  RevisionChangedDetailSchema,
  type AppendQuoteRevisionInput,
  type AppendedQuoteRevision,
  type QuoteIncoterm,
  type QuoteProductLineInput,
  type QuoteServiceLineInput,
  type QuoteStatus,
} from "@/lib/store/quotes.schemas";
import type { RfqDetail } from "@/lib/store/rfqs.schemas";

const COMPOSER_STEPS = [
  { id: "goods", label: "Goods" },
  { id: "services", label: "Services" },
  { id: "terms", label: "Terms" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
] as const;

type ComposerStepId = (typeof COMPOSER_STEPS)[number]["id"];

/** Quote statuses that still accept an appended revision. Everything else is a closed record. */
const MUTABLE_QUOTE_STATUSES: readonly QuoteStatus[] = ["draft", "submitted"];

const DEFAULT_VALIDITY_DAYS = 30;
const SHORT_VALIDITY_WARNING_HOURS = 24;

/**
 * How much room a chosen validity deadline leaves, decided ONCE when it is typed.
 *
 * Held as state rather than recomputed while rendering, because deciding it needs the clock. It is a
 * judgement about the moment the provider chose the date, which is exactly the moment worth judging.
 */
type ValidityDeadlineStanding = "unset" | "past" | "short" | "ample";

function classifyValidityDeadline(
  rawLocalDateTime: string,
  nowEpochMs: number,
): ValidityDeadlineStanding {
  const isoInstant = toOptionalIsoInstant(rawLocalDateTime);
  if (isoInstant === undefined) return "unset";
  const millisecondsRemaining = Date.parse(isoInstant) - nowEpochMs;
  if (millisecondsRemaining <= 0) return "past";
  return millisecondsRemaining <= SHORT_VALIDITY_WARNING_HOURS * 60 * 60 * 1000 ? "short" : "ample";
}

// --- Draft state --------------------------------------------------------------

/**
 * One RFQ product line, as the provider is answering it.
 *
 * `isQuoted` IS THE OPT-IN. A provider may answer a subset of what was asked — quoting three of five
 * items is a real, common bid — so every line starts unquoted and contributes nothing to the body
 * until it is switched on. That also keeps `rfqProductLineId` unique for free: one RFQ line yields at
 * most one quote line.
 *
 * The snapshots are SEEDED from the RFQ and then belong to the provider. What reaches the immutable
 * order line is whatever is left in the field, which is why a narrower specification here is a
 * feature rather than a mistake.
 */
interface ProductLineDraft {
  isQuoted: boolean;
  quantity: string;
  unitPriceMajorUnits: string;
  titleSnapshot: string;
  specificationSnapshot: string;
  leadTimeDays: string;
  exclusionsSnapshot: string;
}

interface DeliverableDraft {
  title: string;
  isRequired: boolean;
  dueAtLocal: string;
}

interface ServiceLineDraft {
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

interface QuoteDraft {
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
  /**
   * Ids of already-uploaded, already-SCANNED attachments riding on THIS revision.
   *
   * ⚠️ THEY BELONG TO THE REVISION, NOT THE QUOTE. A revision is the immutable offer, so a revised
   * offer carries its own documents and the superseded one keeps what it was judged on.
   */
  attachedDocumentIds: string[];
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * A `datetime-local` value `daysFromNow` days after `fromEpochMs`.
 *
 * THE INSTANT IS A PARAMETER, NOT `Date.now()` READ IN HERE. Every caller of this is an EVENT
 * HANDLER, which is the only place a clock may be read on this screen: reading one during render is
 * the impurity the React Compiler rejects and `cacheComponents` refuses during a prerender, and
 * reading one in an effect trades that for a cascading render. Same rule, and same reason, as
 * `useAttemptIdempotencyKey` minting its UUID lazily rather than in a `useState` initializer.
 *
 * THE DEFAULT IS GENEROUS ON PURPOSE — see fact (D) in the header. A provider who accepts it cannot
 * walk into the expiry trap; one who shortens it is warned.
 */
function buildDefaultValidityDeadlineLocal(fromEpochMs: number, daysFromNow: number): string {
  const deadline = new Date(fromEpochMs + daysFromNow * 24 * 60 * 60 * 1000);
  return `${deadline.getFullYear()}-${padTwoDigits(deadline.getMonth() + 1)}-${padTwoDigits(deadline.getDate())}T${padTwoDigits(deadline.getHours())}:${padTwoDigits(deadline.getMinutes())}`;
}

function buildInitialDraft(rfq: RfqDetail): QuoteDraft {
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
    // SEEDED FROM THE RFQ'S SETTLEMENT CURRENCY and editable. A quote may be priced in another
    // currency, which is a real commercial choice rather than a mismatch to prevent.
    currency: rfq.settlementCurrency,
    // BLANK, AND FILLED ON THE WAY INTO THE TERMS STEP. The default is a clock read, so it cannot
    // happen here — this function runs during render. Seeding it from the step-change handler keeps
    // the generous default without putting `Date.now()` in the render path.
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

// --- Draft → request body -------------------------------------------------------

/**
 * The request body, or `null` when something required is missing.
 *
 * NO SUBTOTAL AND NO TOTAL. The server computes both from the lines and a CHECK enforces the sum, so
 * they are absent from the body by construction — and a client-side total that disagreed with that
 * constraint would surface as a pricing dispute rather than as the bug it is.
 *
 * `siblingOrder` IS ASSIGNED FROM THE INCLUDED-LINES INDEX, not from the RFQ's own ordering, so
 * quoting lines 1 and 3 yields sibling orders 0 and 1 with no gap.
 */
function buildAppendQuoteRevisionInput(
  rfq: RfqDetail,
  draft: QuoteDraft,
): AppendQuoteRevisionInput | null {
  const currency = toOptionalCurrencyCode(draft.currency);
  const validityDeadlineAt = toOptionalIsoInstant(draft.validityDeadlineLocal);
  if (currency === undefined || validityDeadlineAt === undefined) return null;
  // Checked before the round trip because the server refuses a past deadline outright, and a filled
  // form is an expensive thing to lose to a date nobody re-read.
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
    // THE KIND IS READ OFF THE RFQ LINE. The server requires it to match, which is why there is no
    // picker and why a mismatch is structurally impossible here.
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
          // SEQUENCE FROM THE INDEX, so duplicates cannot be authored — the server refuses them
          // rather than renumbering, because a silently reordered plan is not the plan quoted.
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

  // The server refuses a revision with no lines at all. Catching it here keeps the review step able
  // to say so in a sentence rather than relaying a 422.
  if (productLines.length === 0 && serviceLines.length === 0) return null;

  const paymentTerms = toOptionalText(draft.paymentTerms);
  const notes = toOptionalText(draft.notes);

  return {
    currency,
    validityDeadlineAt,
    // A BLANK MONEY FIELD IS ZERO HERE, NOT OMITTED, and this is the one place that is right: all
    // four are REQUIRED on the wire, and "no tax on this quote" is a real answer a provider is
    // making. It is the opposite of the RFQ form's optional fields for a reason.
    taxInCents: toOptionalCents(draft.taxMajorUnits) ?? 0,
    serviceFeeInCents: toOptionalCents(draft.serviceFeeMajorUnits) ?? 0,
    shippingInCents: toOptionalCents(draft.shippingMajorUnits) ?? 0,
    discountInCents: toOptionalCents(draft.discountMajorUnits) ?? 0,
    productLines,
    serviceLines,
    ...(paymentTerms === undefined ? {} : { paymentTerms }),
    ...(draft.incoterm === "" ? {} : { incoterm: draft.incoterm }),
    ...(notes === undefined ? {} : { notes }),
    // Omitted when empty: the backend field is optional and an empty array says nothing it does not
    // already assume.
    ...(draft.attachedDocumentIds.length === 0 ? {} : { documentIds: draft.attachedDocumentIds }),
  };
}

/**
 * What is still missing, in the provider's words. `buildAppend…` returning null is not a sentence.
 *
 * THE DEADLINE'S STANDING IS PASSED IN rather than recomputed, because judging it needs a clock and
 * this runs during render. The build step re-checks the deadline against a live clock before
 * anything is sent, so a stale judgement here can only be conservative.
 */
function collectMissingRequirements(
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

// --- View state ----------------------------------------------------------------

type QuoteComposerState =
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

export default function QuoteComposer({ rfqId }: { rfqId: string }) {
  const rfqQuery = useRfqQuery(rfqId);
  // The provider's own quote on this RFQ, DRAFTS INCLUDED — that is what this read returns for a
  // provider, and it is how an abandoned shell is found instead of being duplicated.
  const quoteComparisonQuery = useQuoteComparisonQuery(rfqId);

  const existingQuoteId = quoteComparisonQuery.data?.success
    ? (quoteComparisonQuery.data.data[0]?.quoteId ?? null)
    : null;
  // Gated on a non-empty id, the same way `useRfqQuery` is: a dependent read that fired with `""`
  // would cache a 404 under the empty key.
  const existingQuoteQuery = useQuoteQuery(existingQuoteId ?? "");

  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  /**
   * How much room the chosen validity deadline leaves, decided when it is chosen.
   *
   * NOT DERIVED WHILE RENDERING, because deciding it needs the clock — and a clock read in the render
   * path is refused by the React Compiler and by `cacheComponents`, while a clock read in an effect
   * only trades that for a cascading render. The event that sets the date is the right place to judge
   * the date.
   */
  const [validityDeadlineStanding, setValidityDeadlineStanding] =
    useState<ValidityDeadlineStanding>("unset");
  const [appendedRevision, setAppendedRevision] = useState<AppendedQuoteRevision | null>(null);
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false);

  // THREE KEYS, NOT ONE. The middleware replays a key against the body it first saw, so a single key
  // shared across the three routes would make the second call return the first call's answer. Each is
  // reset only after its own success — never on failure, because a network error is exactly when the
  // retry must carry the original key.
  const shellAttempt = useResettableAttemptIdempotencyKey();
  const appendAttempt = useResettableAttemptIdempotencyKey();
  const submitAttempt = useResettableAttemptIdempotencyKey();
  const discardAttempt = useResettableAttemptIdempotencyKey();

  const [isDiscardConfirmVisible, setIsDiscardConfirmVisible] = useState(false);

  const createShellMutation = useCreateQuoteShell();
  const appendRevisionMutation = useAppendQuoteRevision();
  const submitRevisionMutation = useSubmitQuoteRevision();
  const abandonRevisionMutation = useAbandonQuoteRevision();

  const state = useMemo<QuoteComposerState>(() => {
    if (rfqQuery.isPending) return { status: "loadingRequest" };
    if (rfqQuery.data === undefined || !rfqQuery.data.success) {
      return {
        status: "requestUnavailable",
        message: rfqQuery.data?.error.message ?? "This request could not be loaded.",
      };
    }
    const rfq = rfqQuery.data.data;

    if (rfq.callerRelation === "buyer") {
      return { status: "notQuotable", reason: "callerIsBuyer", rfqTitle: rfq.title };
    }

    if (quoteComparisonQuery.isPending) return { status: "loadingExistingQuote" };

    if (existingQuoteId === null) {
      // ONLY THE FIRST QUOTE IS GATED ON THE RFQ BEING OPEN — the shell call is the only one of the
      // three that checks it. Applying this to a revision would block a legitimate one.
      if (rfq.state !== "open") {
        return { status: "notQuotable", reason: "requestNotOpen", rfqTitle: rfq.title };
      }
      return { status: "composing", rfq, quoteId: null };
    }

    if (existingQuoteQuery.isPending) return { status: "loadingExistingQuote" };
    if (existingQuoteQuery.data !== undefined && existingQuoteQuery.data.success) {
      const existingQuote = existingQuoteQuery.data.data;
      if (!MUTABLE_QUOTE_STATUSES.includes(existingQuote.status)) {
        return {
          status: "quoteClosed",
          quoteId: existingQuote.id,
          quoteStatus: existingQuote.status,
        };
      }
      // AN UNSUBMITTED REVISION BLOCKS THE FORM, because appending a second one is refused while it
      // stands. Offering the form here would be a trap: every press would 422. The panel offers the
      // two moves that actually exist — submit it, or discard it and price again.
      const latestRevision = existingQuote.latestRevision;
      if (latestRevision !== null && latestRevision.submittedAt === null) {
        return {
          status: "resumeUnsubmittedRevision",
          quoteId: existingQuote.id,
          rfqTitle: rfq.title,
          revisionNumber: latestRevision.revisionNumber,
          validityDeadlineAt: latestRevision.validityDeadlineAt,
          totalInCents: latestRevision.totalInCents,
          currency: latestRevision.currency,
        };
      }
    }

    return { status: "composing", rfq, quoteId: existingQuoteId };
  }, [
    rfqQuery.isPending,
    rfqQuery.data,
    quoteComparisonQuery.isPending,
    existingQuoteId,
    existingQuoteQuery.isPending,
    existingQuoteQuery.data,
  ]);

  const activeRfq = state.status === "composing" ? state.rfq : null;
  // Derived during render, and pure now that the deadline default no longer reads a clock.
  const activeDraft = draft ?? (activeRfq === null ? null : buildInitialDraft(activeRfq));

  function patchDraft(patch: Partial<QuoteDraft>) {
    if (activeDraft === null) return;
    setDraft({ ...activeDraft, ...patch });
  }

  /** The one place the deadline is typed, and therefore the one place it is judged. */
  function handleValidityDeadlineChange(nextLocalDateTime: string) {
    patchDraft({ validityDeadlineLocal: nextLocalDateTime });
    setValidityDeadlineStanding(classifyValidityDeadline(nextLocalDateTime, Date.now()));
  }

  /**
   * Moving between steps, and the moment the generous default is filled in.
   *
   * Seeding here rather than at draft-construction time is what keeps `Date.now()` out of the render
   * path. It only ever fills a BLANK field, so a provider who has already chosen a date keeps it.
   */
  function handleStepSelect(nextStepIndex: number) {
    if (activeDraft !== null && activeDraft.validityDeadlineLocal === "") {
      const seededDeadline = buildDefaultValidityDeadlineLocal(Date.now(), DEFAULT_VALIDITY_DAYS);
      patchDraft({ validityDeadlineLocal: seededDeadline });
      setValidityDeadlineStanding("ample");
    }
    setCurrentStepIndex(nextStepIndex);
  }

  function patchProductLine(rfqProductLineId: string, patch: Partial<ProductLineDraft>) {
    if (activeDraft === null) return;
    const lineDraft = activeDraft.productLines[rfqProductLineId];
    if (lineDraft === undefined) return;
    patchDraft({
      productLines: {
        ...activeDraft.productLines,
        [rfqProductLineId]: { ...lineDraft, ...patch },
      },
    });
  }

  function patchServiceLine(rfqServiceLineId: string, patch: Partial<ServiceLineDraft>) {
    if (activeDraft === null) return;
    const lineDraft = activeDraft.serviceLines[rfqServiceLineId];
    if (lineDraft === undefined) return;
    patchDraft({
      serviceLines: {
        ...activeDraft.serviceLines,
        [rfqServiceLineId]: { ...lineDraft, ...patch },
      },
    });
  }

  /**
   * Shell if needed, then append — chained rather than run in parallel, because the second needs the
   * first's id.
   *
   * IF THE SHELL SUCCEEDS AND THE APPEND FAILS the shell survives and the buyer already sees
   * "Quoted". That is recoverable and not a leak: the shell is unique by construction, so a retry
   * re-reads, finds it, and only appends.
   */
  async function handlePriceRevisionClick() {
    if (activeRfq === null || activeDraft === null) return;
    const input = buildAppendQuoteRevisionInput(activeRfq, activeDraft);
    if (input === null) return;

    let quoteId = state.status === "composing" ? state.quoteId : null;

    if (quoteId === null) {
      const shellResult = await createShellMutation.mutateAsync({
        rfqId,
        idempotencyKey: shellAttempt.getIdempotencyKey(),
      });
      if (!shellResult.success) {
        // A 409 here means a quote already exists — fact (B). Re-reading is the recovery, and the
        // comparison query invalidation in the hook has already asked for it.
        return;
      }
      shellAttempt.resetIdempotencyKey();
      quoteId = shellResult.data.id;
    }

    const appendResult = await appendRevisionMutation.mutateAsync({
      quoteId,
      rfqId,
      input,
      idempotencyKey: appendAttempt.getIdempotencyKey(),
    });
    if (!appendResult.success) return;
    appendAttempt.resetIdempotencyKey();
    setAppendedRevision(appendResult.data);
  }

  async function handleConfirmSubmitClick(quoteId: string, revisionNumber: number) {
    const submitResult = await submitRevisionMutation.mutateAsync({
      quoteId,
      rfqId,
      revisionNumber,
      idempotencyKey: submitAttempt.getIdempotencyKey(),
    });
    if (!submitResult.success) return;
    submitAttempt.resetIdempotencyKey();
    setIsSubmitConfirmVisible(false);
    setAppendedRevision(null);
  }

  /**
   * Discards the unsubmitted revision and returns to the form.
   *
   * THE DRAFT IS DELIBERATELY LEFT INTACT. The whole point of discarding is almost always a deadline
   * that ran out, and making the provider retype a priced quote to fix a date would be its own trap.
   * `appendedRevision` is cleared so the terminal panel gives way to the form, and the quote read is
   * invalidated by the hook so the composer re-derives from a `latestRevisionNumber` that has moved.
   */
  async function handleConfirmDiscardClick(quoteId: string, revisionNumber: number) {
    const discardResult = await abandonRevisionMutation.mutateAsync({
      quoteId,
      rfqId,
      revisionNumber,
      idempotencyKey: discardAttempt.getIdempotencyKey(),
    });
    if (!discardResult.success) return;
    discardAttempt.resetIdempotencyKey();
    setIsDiscardConfirmVisible(false);
    setAppendedRevision(null);
    setCurrentStepIndex(COMPOSER_STEPS.length - 1);
  }

  // A revision was just appended in this session: the form is behind us and only submit remains.
  if (appendedRevision !== null) {
    return (
      <AppendedRevisionPanel
        rfqId={rfqId}
        quoteId={appendedRevision.quoteId}
        revision={appendedRevision}
        isSubmitConfirmVisible={isSubmitConfirmVisible}
        onRequestConfirm={() => setIsSubmitConfirmVisible(true)}
        onCancelConfirm={() => setIsSubmitConfirmVisible(false)}
        onConfirmSubmit={() =>
          void handleConfirmSubmitClick(appendedRevision.quoteId, appendedRevision.revisionNumber)
        }
        isSubmitting={submitRevisionMutation.isPending}
        submitResult={submitRevisionMutation.data}
        hasSubmitThrown={submitRevisionMutation.isError}
        isDiscardConfirmVisible={isDiscardConfirmVisible}
        onRequestDiscard={() => setIsDiscardConfirmVisible(true)}
        onCancelDiscard={() => setIsDiscardConfirmVisible(false)}
        onConfirmDiscard={() =>
          void handleConfirmDiscardClick(appendedRevision.quoteId, appendedRevision.revisionNumber)
        }
        isDiscarding={abandonRevisionMutation.isPending}
        discardResult={abandonRevisionMutation.data}
        hasDiscardThrown={abandonRevisionMutation.isError}
      />
    );
  }

  switch (state.status) {
    case "loadingRequest":
    case "loadingExistingQuote":
      return <p className="text-sm text-muted-foreground">Loading this request…</p>;

    case "requestUnavailable":
      return (
        <PanelShell title="This request isn't available to you">
          {/* A 404 and a refusal are deliberately the same answer on this route, so no permission
              hint is inferred from it. */}
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <BackToRequestsLink />
        </PanelShell>
      );

    case "notQuotable":
      return (
        <PanelShell title={state.rfqTitle}>
          <p className="text-sm text-muted-foreground">
            {state.reason === "callerIsBuyer"
              ? "You raised this request, so you cannot quote against it. Providers you invited will answer here."
              : "This request is not open, so a first quote cannot be started. If you already have a quote on it, you can still revise that."}
          </p>
          <BackToRequestsLink />
        </PanelShell>
      );

    case "quoteClosed":
      return (
        <PanelShell title="This quote is closed">
          <p className="text-sm text-muted-foreground">
            Its status is {QUOTE_STATUS_LABELS[state.quoteStatus].toLowerCase()}, so no further
            revision can be appended. One quote exists per request, and that slot is spent.
          </p>
          <Link
            href={`/studio/quotes/${state.quoteId}`}
            className="text-sm font-medium text-primary underline"
          >
            Open the quote
          </Link>
        </PanelShell>
      );

    case "resumeUnsubmittedRevision":
      return (
        <PanelShell title={`Revision ${state.revisionNumber} is priced but not submitted`}>
          <p className="text-sm text-muted-foreground">
            You appended this revision and did not submit it. Only one unsubmitted revision can
            exist at a time, so it has to be submitted before another can be priced.
          </p>
          <dl className="mt-3 grid gap-1 text-sm">
            <SummaryRow
              label="Total"
              value={formatCentsLabel(state.totalInCents, state.currency)}
            />
            <SummaryRow
              label="Valid until"
              value={new Date(state.validityDeadlineAt).toLocaleString()}
            />
          </dl>
          <UnsubmittedRevisionRule />
          {isDiscardConfirmVisible ? (
            <DiscardConfirmation
              revisionNumber={state.revisionNumber}
              isDiscarding={abandonRevisionMutation.isPending}
              onConfirm={() => void handleConfirmDiscardClick(state.quoteId, state.revisionNumber)}
              onCancel={() => setIsDiscardConfirmVisible(false)}
            />
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={submitRevisionMutation.isPending}
                onClick={() => void handleConfirmSubmitClick(state.quoteId, state.revisionNumber)}
                className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {submitRevisionMutation.isPending
                  ? "Submitting…"
                  : `Submit revision ${state.revisionNumber}`}
              </button>
              {/* THE WAY OUT. Chiefly for a deadline that ran out — without this the quote would be
                  finished for this RFQ, because a second revision cannot be appended while this one
                  stands and a fresh quote cannot be started at all. */}
              <button
                type="button"
                onClick={() => setIsDiscardConfirmVisible(true)}
                className="cursor-pointer text-sm font-medium text-destructive underline"
              >
                Discard and price again
              </button>
            </div>
          )}
          <MutationNotice
            result={submitRevisionMutation.data}
            hasThrown={submitRevisionMutation.isError}
            fallbackMessage="The revision could not be submitted."
          />
          <RevisionChangedNotice result={submitRevisionMutation.data} />
          <MutationNotice
            result={abandonRevisionMutation.data}
            hasThrown={abandonRevisionMutation.isError}
            fallbackMessage="The revision could not be discarded."
          />
        </PanelShell>
      );

    case "composing": {
      if (activeDraft === null) return null;
      const missingRequirements = collectMissingRequirements(
        state.rfq,
        activeDraft,
        validityDeadlineStanding,
      );
      const isPricingBlocked = missingRequirements.length > 0;
      const isPricing = createShellMutation.isPending || appendRevisionMutation.isPending;
      const stepId = COMPOSER_STEPS[currentStepIndex]?.id ?? "goods";

      return (
        <div>
          <header className="pb-3">
            <h1 className="text-lg font-semibold text-foreground">{state.rfq.title}</h1>
            <p className="text-xs text-muted-foreground">
              {state.quoteId === null
                ? "Pricing this creates your quote. The buyer sees that you have answered as soon as it exists."
                : "You already have a quote on this request. Pricing this appends a new revision to it."}
            </p>
          </header>

          <ComposerStepRail
            steps={COMPOSER_STEPS}
            currentStepIndex={currentStepIndex}
            onStepSelect={handleStepSelect}
          />

          {renderStep(stepId, state.rfq, activeDraft)}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            {currentStepIndex < COMPOSER_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => handleStepSelect(currentStepIndex + 1)}
                className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={isPricingBlocked || isPricing}
                onClick={() => void handlePriceRevisionClick()}
                className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPricing ? "Pricing…" : "Price this revision"}
              </button>
            )}
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() => handleStepSelect(currentStepIndex - 1)}
                className="cursor-pointer text-sm font-medium text-foreground underline"
              >
                Back
              </button>
            )}
          </div>

          <MutationNotice
            result={createShellMutation.data}
            hasThrown={createShellMutation.isError}
            fallbackMessage="Your quote could not be started."
          />
          <MutationNotice
            result={appendRevisionMutation.data}
            hasThrown={appendRevisionMutation.isError}
            fallbackMessage="The revision could not be priced."
          />
        </div>
      );
    }

    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }

  function renderStep(stepId: ComposerStepId, rfq: RfqDetail, currentDraft: QuoteDraft) {
    switch (stepId) {
      case "goods":
        return rfq.productLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This request asks for no goods — only services.
          </p>
        ) : (
          <div className="space-y-4">
            {rfq.productLines.map((rfqProductLine) => {
              const lineDraft = currentDraft.productLines[rfqProductLine.id];
              if (lineDraft === undefined) return null;
              return (
                <fieldset key={rfqProductLine.id} className="rounded-xl border border-border p-4">
                  <legend className="px-1 text-sm font-medium text-foreground">
                    {rfqProductLine.requestedTitle}
                  </legend>
                  <p className="text-xs text-muted-foreground">
                    Asked for {rfqProductLine.quantity} {rfqProductLine.unitLabel}
                  </p>
                  <label className="mt-2 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lineDraft.isQuoted}
                      onChange={(changeEvent) =>
                        patchProductLine(rfqProductLine.id, {
                          isQuoted: changeEvent.target.checked,
                        })
                      }
                      className="size-4 cursor-pointer accent-primary"
                    />
                    <span className="text-sm text-foreground">I am quoting for this</span>
                  </label>
                  {lineDraft.isQuoted && (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="Quantity you are quoting"
                          value={lineDraft.quantity}
                          onValueChange={(nextValue) =>
                            patchProductLine(rfqProductLine.id, { quantity: nextValue })
                          }
                        />
                        <TextField
                          label="Unit price"
                          hint={`Major units, in ${currentDraft.currency || "your currency"}.`}
                          value={lineDraft.unitPriceMajorUnits}
                          onValueChange={(nextValue) =>
                            patchProductLine(rfqProductLine.id, {
                              unitPriceMajorUnits: nextValue,
                            })
                          }
                        />
                      </div>
                      <TextField
                        label="What you are supplying"
                        hint="Seeded from the request. Your words are what reach the order."
                        value={lineDraft.titleSnapshot}
                        onValueChange={(nextValue) =>
                          patchProductLine(rfqProductLine.id, { titleSnapshot: nextValue })
                        }
                        maxLength={200}
                      />
                      <TextAreaField
                        label="Specification"
                        value={lineDraft.specificationSnapshot}
                        onValueChange={(nextValue) =>
                          patchProductLine(rfqProductLine.id, {
                            specificationSnapshot: nextValue,
                          })
                        }
                        maxLength={10_000}
                      />
                      <TextField
                        label="Lead time in days"
                        hint="Leave blank rather than guessing — a zero promises same-day."
                        value={lineDraft.leadTimeDays}
                        onValueChange={(nextValue) =>
                          patchProductLine(rfqProductLine.id, { leadTimeDays: nextValue })
                        }
                      />
                      <TextAreaField
                        label="Exclusions"
                        hint="What this price does not cover. This is where a narrower scope gets said."
                        value={lineDraft.exclusionsSnapshot}
                        onValueChange={(nextValue) =>
                          patchProductLine(rfqProductLine.id, {
                            exclusionsSnapshot: nextValue,
                          })
                        }
                        maxLength={10_000}
                      />
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        );

      case "services":
        return rfq.serviceLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This request asks for no services — only goods.
          </p>
        ) : (
          <div className="space-y-4">
            {rfq.serviceLines.map((rfqServiceLine) => {
              const lineDraft = currentDraft.serviceLines[rfqServiceLine.id];
              if (lineDraft === undefined) return null;
              return (
                <fieldset key={rfqServiceLine.id} className="rounded-xl border border-border p-4">
                  <legend className="px-1 text-sm font-medium text-foreground">
                    {PROVIDER_KIND_LABELS[rfqServiceLine.providerKind]}
                  </legend>
                  <p className="text-xs text-muted-foreground">
                    {rfqServiceLine.requirementSummary}
                  </p>
                  <label className="mt-2 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lineDraft.isQuoted}
                      onChange={(changeEvent) =>
                        patchServiceLine(rfqServiceLine.id, {
                          isQuoted: changeEvent.target.checked,
                        })
                      }
                      className="size-4 cursor-pointer accent-primary"
                    />
                    <span className="text-sm text-foreground">I am quoting for this</span>
                  </label>
                  {lineDraft.isQuoted && (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="Fee"
                          hint={`Major units, in ${currentDraft.currency || "your currency"}.`}
                          value={lineDraft.feeMajorUnits}
                          onValueChange={(nextValue) =>
                            patchServiceLine(rfqServiceLine.id, { feeMajorUnits: nextValue })
                          }
                        />
                        <TextField
                          label="Lead time in days"
                          value={lineDraft.leadTimeDays}
                          onValueChange={(nextValue) =>
                            patchServiceLine(rfqServiceLine.id, { leadTimeDays: nextValue })
                          }
                        />
                      </div>
                      <TextField
                        label="Service title"
                        value={lineDraft.titleSnapshot}
                        onValueChange={(nextValue) =>
                          patchServiceLine(rfqServiceLine.id, { titleSnapshot: nextValue })
                        }
                        maxLength={200}
                      />
                      <TextAreaField
                        label="Scope"
                        hint="Seeded from what was asked. Say what you are actually undertaking."
                        value={lineDraft.scopeSnapshot}
                        onValueChange={(nextValue) =>
                          patchServiceLine(rfqServiceLine.id, { scopeSnapshot: nextValue })
                        }
                        maxLength={10_000}
                      />
                      <TextAreaField
                        label="Exclusions"
                        value={lineDraft.exclusionsSnapshot}
                        onValueChange={(nextValue) =>
                          patchServiceLine(rfqServiceLine.id, {
                            exclusionsSnapshot: nextValue,
                          })
                        }
                        maxLength={10_000}
                      />
                      <QuoteServiceDetailFields
                        providerKind={rfqServiceLine.providerKind}
                        draft={lineDraft.serviceDetail}
                        onDraftChange={(nextDetail) =>
                          patchServiceLine(rfqServiceLine.id, { serviceDetail: nextDetail })
                        }
                      />
                      <DeliverablePlanFields
                        deliverables={lineDraft.deliverables}
                        onDeliverablesChange={(nextDeliverables) =>
                          patchServiceLine(rfqServiceLine.id, {
                            deliverables: nextDeliverables,
                          })
                        }
                      />
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        );

      case "terms":
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Currency"
                hint="Seeded from the request's settlement currency. You may quote in another."
                value={currentDraft.currency}
                onValueChange={(nextValue) => patchDraft({ currency: nextValue })}
                maxLength={3}
              />
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Valid until</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">
                  A revision has to be submitted before its deadline. Past it you can still discard
                  and price again, but you lose the round trip — so leave yourself room.
                </span>
                <input
                  type="datetime-local"
                  value={currentDraft.validityDeadlineLocal}
                  onChange={(changeEvent) => handleValidityDeadlineChange(changeEvent.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>

            <ExpiryWarning standing={validityDeadlineStanding} />

            <p className="text-[11px] leading-4 text-muted-foreground">
              The subtotal and total are computed by the server from your lines and these four
              amounts. A blank field here means zero — that is a real answer on a quote, unlike on a
              request.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Tax"
                value={currentDraft.taxMajorUnits}
                onValueChange={(nextValue) => patchDraft({ taxMajorUnits: nextValue })}
              />
              <TextField
                label="Service fee"
                value={currentDraft.serviceFeeMajorUnits}
                onValueChange={(nextValue) => patchDraft({ serviceFeeMajorUnits: nextValue })}
              />
              <TextField
                label="Freight"
                value={currentDraft.shippingMajorUnits}
                onValueChange={(nextValue) => patchDraft({ shippingMajorUnits: nextValue })}
              />
              <TextField
                label="Discount"
                hint="Subtracted. A discount larger than everything else is refused by the server."
                value={currentDraft.discountMajorUnits}
                onValueChange={(nextValue) => patchDraft({ discountMajorUnits: nextValue })}
              />
            </div>

            <SelectField
              label="Incoterm"
              hint="Optional, and frozen on submit — pick the term you actually trade under."
              value={currentDraft.incoterm}
              options={[
                { value: "" as const, label: "Not stated" },
                ...QUOTE_INCOTERMS.map((incoterm) => ({
                  value: incoterm,
                  label: QUOTE_INCOTERM_LABELS[incoterm],
                })),
              ]}
              onValueChange={(nextValue) => patchDraft({ incoterm: nextValue })}
            />
            <TextAreaField
              label="Payment terms"
              value={currentDraft.paymentTerms}
              onValueChange={(nextValue) => patchDraft({ paymentTerms: nextValue })}
              maxLength={2000}
            />
            <TextAreaField
              label="Notes"
              value={currentDraft.notes}
              onValueChange={(nextValue) => patchDraft({ notes: nextValue })}
              maxLength={10_000}
            />
          </div>
        );

      case "review":
        return (
          <div className="space-y-3">
            {collectMissingRequirements(rfq, currentDraft, validityDeadlineStanding).length ===
            0 ? (
              <p className="text-sm text-muted-foreground">
                Ready to price. The server will compute the subtotal and total from your lines and
                show them before anything is submitted.
              </p>
            ) : (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">Still needed</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {collectMissingRequirements(rfq, currentDraft, validityDeadlineStanding).map(
                    (requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        );

      case "documents":
        return (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Attachments</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Drawings, certificates or a full specification supporting this offer. The buyer can
                open them alongside your prices.
              </p>
              {/*
                ⚠️ THEY RIDE ON THIS REVISION. The comment that used to sit here said documents
                could not be attached to a quote at all — true when written, and closed by
                `commerce_quote_revision_document`. Saying which revision matters: revise the offer
                and the superseded one keeps the documents it was judged on.
              */}
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                They attach to this revision. If you revise the quote, choose them again for the new
                one — the buyer keeps seeing the old set against the old prices.
              </p>
            </div>
            <TradeDocumentPicker
              selectedDocumentIds={activeDraft?.attachedDocumentIds ?? []}
              onSelectionChange={(attachedDocumentIds: string[]) =>
                patchDraft({ attachedDocumentIds })
              }
            />
          </div>
        );

      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  }
}

// --- Small pieces ---------------------------------------------------------------

function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-5">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function BackToRequestsLink() {
  return (
    <Link href="/studio/rfqs" className="text-sm font-medium text-primary underline">
      Back to requests to quote
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * One confirm press before discarding a priced revision.
 *
 * SOFTER THAN THE SUBMIT CONFIRMATION, on purpose. Submitting freezes terms a buyer can then accept
 * — irreversible, and the copy says so. Discarding throws away work that can be re-entered in the
 * next breath, and the draft is kept, so the risk is a mis-tap rather than a commitment. One press
 * is the right amount of friction; a typed confirmation would be theatre.
 */
function DiscardConfirmation({
  revisionNumber,
  isDiscarding,
  onConfirm,
  onCancel,
}: {
  revisionNumber: number;
  isDiscarding: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border p-4">
      <p className="text-sm font-medium text-foreground">Discard revision {revisionNumber}?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        The prices you entered are kept in the form, so you can change the validity date and price
        it again straight away. Nothing was ever offered to the buyer, and the next revision will
        reuse the number this one is giving up.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isDiscarding}
          onClick={onConfirm}
          className="cursor-pointer rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isDiscarding ? "Discarding…" : "Yes, discard it"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-sm font-medium text-foreground underline"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}

/**
 * The short-deadline warning — advice now, not a last line of defence.
 *
 * A deadline that passes before submit still costs the revision: it can no longer be submitted, and
 * the way forward is to discard it and price again. That is an annoyance rather than the dead end it
 * used to be, so the copy warns without alarming.
 */
function ExpiryWarning({ standing }: { standing: ValidityDeadlineStanding }) {
  if (standing !== "past" && standing !== "short") return null;
  return (
    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {standing === "past"
        ? "This deadline has already passed. Priced now, the revision could not be submitted at all — you would have to discard it and price it again."
        : "This deadline is less than a day away. If it passes before you submit, the revision can no longer be submitted and you will have to discard it and price again."}
    </p>
  );
}

/**
 * The same rule stated WITHOUT a clock, for the two screens that render a deadline the server sent.
 *
 * Judging those against "now" would mean reading a clock during render, and the sentence is true
 * whatever the time — so it is stated as a rule rather than computed as a warning.
 */
function UnsubmittedRevisionRule() {
  return (
    <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
      Only one revision can be open at a time, so this one has to be submitted or discarded before
      another can be priced. If its deadline passes first, discarding is the way on.
    </p>
  );
}

/**
 * `409 REVISION_CHANGED`, rendered as a FINDING.
 *
 * The server names the revision that now exists. Never retry with that number: it would submit terms
 * the provider has not just reviewed, which is the one thing an immutable commercial record must not
 * be built from.
 */
function RevisionChangedNotice({
  result,
}: {
  result:
    | { readonly success: boolean; readonly error?: { readonly details?: unknown } }
    | undefined;
}) {
  if (result === undefined || result.success) return null;
  const parsed = RevisionChangedDetailSchema.safeParse(result.error?.details);
  if (!parsed.success) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Revision {parsed.data.currentRevision} is now the latest on this quote. Nothing was submitted.
      Reload before trying again.
    </p>
  );
}

function DeliverablePlanFields({
  deliverables,
  onDeliverablesChange,
}: {
  deliverables: readonly DeliverableDraft[];
  onDeliverablesChange: (nextDeliverables: DeliverableDraft[]) => void;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">Deliverables</span>
      <span className="block text-[11px] leading-4 text-muted-foreground">
        Optional. Steps are numbered by their order here, so removing one renumbers the rest.
      </span>
      <div className="mt-2 space-y-2">
        {deliverables.map((deliverable, deliverableIndex) => (
          <div
            // Index-keyed deliberately: these rows carry no id of their own and their ORDER is the
            // data — `sequence` is assigned from this index at build time.
            key={deliverableIndex}
            className="rounded-lg border border-border p-3"
          >
            <TextField
              label={`Step ${deliverableIndex + 1}`}
              value={deliverable.title}
              onValueChange={(nextValue) =>
                onDeliverablesChange(
                  deliverables.map((existing, existingIndex) =>
                    existingIndex === deliverableIndex
                      ? { ...existing, title: nextValue }
                      : existing,
                  ),
                )
              }
              maxLength={200}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={deliverable.isRequired}
                onChange={(changeEvent) =>
                  onDeliverablesChange(
                    deliverables.map((existing, existingIndex) =>
                      existingIndex === deliverableIndex
                        ? { ...existing, isRequired: changeEvent.target.checked }
                        : existing,
                    ),
                  )
                }
                className="size-4 cursor-pointer accent-primary"
              />
              <span className="text-sm text-foreground">Required</span>
            </label>
            <button
              type="button"
              onClick={() =>
                onDeliverablesChange(
                  deliverables.filter((_, existingIndex) => existingIndex !== deliverableIndex),
                )
              }
              className="mt-2 cursor-pointer text-xs font-medium text-destructive underline"
            >
              Remove this step
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onDeliverablesChange([...deliverables, { title: "", isRequired: true, dueAtLocal: "" }])
          }
          className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border"
        >
          Add a deliverable
        </button>
      </div>
    </div>
  );
}

/**
 * The terminal screen after a successful append: the SERVER'S money, and the two-press submit.
 *
 * Every figure here comes from the append response. Rendering the draft that produced it would look
 * identical and prove nothing — the whole reason append exists as its own call is that the server is
 * the one that priced it.
 */
function AppendedRevisionPanel({
  rfqId,
  quoteId,
  revision,
  isSubmitConfirmVisible,
  onRequestConfirm,
  onCancelConfirm,
  onConfirmSubmit,
  isSubmitting,
  submitResult,
  hasSubmitThrown,
  isDiscardConfirmVisible,
  onRequestDiscard,
  onCancelDiscard,
  onConfirmDiscard,
  isDiscarding,
  discardResult,
  hasDiscardThrown,
}: {
  rfqId: string;
  quoteId: string;
  revision: AppendedQuoteRevision;
  isSubmitConfirmVisible: boolean;
  onRequestConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
  isDiscardConfirmVisible: boolean;
  onRequestDiscard: () => void;
  onCancelDiscard: () => void;
  onConfirmDiscard: () => void;
  isDiscarding: boolean;
  discardResult:
    | {
        readonly success: boolean;
        readonly error?: { readonly message: string; readonly details?: unknown };
      }
    | undefined;
  hasDiscardThrown: boolean;
  submitResult:
    | {
        readonly success: boolean;
        readonly error?: { readonly message: string; readonly details?: unknown };
      }
    | undefined;
  hasSubmitThrown: boolean;
}) {
  return (
    <PanelShell title={`Revision ${revision.revisionNumber} is priced`}>
      <p className="text-sm text-muted-foreground">
        These figures were computed by the server from the lines you sent. Nothing has been offered
        to the buyer yet.
      </p>
      <dl className="mt-3 grid gap-1 text-sm">
        <SummaryRow
          label="Subtotal"
          value={formatCentsLabel(revision.subtotalInCents, revision.currency)}
        />
        <SummaryRow label="Tax" value={formatCentsLabel(revision.taxInCents, revision.currency)} />
        <SummaryRow
          label="Service fee"
          value={formatCentsLabel(revision.serviceFeeInCents, revision.currency)}
        />
        <SummaryRow
          label="Freight"
          value={formatCentsLabel(revision.shippingInCents, revision.currency)}
        />
        <SummaryRow
          label="Discount"
          value={formatCentsLabel(revision.discountInCents, revision.currency)}
        />
        <SummaryRow
          label="Total"
          value={formatCentsLabel(revision.totalInCents, revision.currency)}
        />
        <SummaryRow
          label="Valid until"
          value={new Date(revision.validityDeadlineAt).toLocaleString()}
        />
      </dl>

      <UnsubmittedRevisionRule />

      {isSubmitConfirmVisible ? (
        <div className="mt-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            Submit revision {revision.revisionNumber} at{" "}
            {formatCentsLabel(revision.totalInCents, revision.currency)}?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This freezes the revision permanently — it cannot be edited afterwards, by you or by
            support. The buyer may then accept it, which creates an order. You can still withdraw
            the whole quote until they accept, and you can still append a further revision. What you
            cannot change is this one.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirmSubmit}
              className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isSubmitting ? "Submitting…" : "Yes, submit it"}
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              className="cursor-pointer text-sm font-medium text-foreground underline"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : isDiscardConfirmVisible ? (
        <DiscardConfirmation
          revisionNumber={revision.revisionNumber}
          isDiscarding={isDiscarding}
          onConfirm={onConfirmDiscard}
          onCancel={onCancelDiscard}
        />
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRequestConfirm}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Submit revision {revision.revisionNumber}
          </button>
          {/* Priced it wrong, or dated it wrong? This is the correction, and it is the reason the
              short-deadline warning above is advice rather than a final warning. */}
          <button
            type="button"
            onClick={onRequestDiscard}
            className="cursor-pointer text-sm font-medium text-destructive underline"
          >
            Discard and price again
          </button>
          <Link
            href={`/studio/rfqs/${rfqId}`}
            className="text-sm font-medium text-foreground underline"
          >
            Leave it unsubmitted
          </Link>
        </div>
      )}

      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        Leaving it unsubmitted keeps it as this quote&apos;s one open revision. Another cannot be
        priced until this one is submitted or discarded.
      </p>

      <MutationNotice
        result={submitResult}
        hasThrown={hasSubmitThrown}
        fallbackMessage="The revision could not be submitted."
      />
      <RevisionChangedNotice result={submitResult} />
      <MutationNotice
        result={discardResult}
        hasThrown={hasDiscardThrown}
        fallbackMessage="The revision could not be discarded."
      />

      <div className="mt-3">
        <Link
          href={`/studio/quotes/${quoteId}`}
          className="text-sm font-medium text-primary underline"
        >
          Open this quote
        </Link>
      </div>
    </PanelShell>
  );
}
