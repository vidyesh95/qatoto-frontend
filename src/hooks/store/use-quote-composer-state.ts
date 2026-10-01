import { useMemo, useState } from "react";
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
import {
  buildAppendQuoteRevisionInput,
  buildDefaultValidityDeadlineLocal,
  buildInitialDraft,
  classifyValidityDeadline,
  COMPOSER_STEPS,
  DEFAULT_VALIDITY_DAYS,
  MUTABLE_QUOTE_STATUSES,
  type ProductLineDraft,
  type QuoteComposerState,
  type QuoteDraft,
  type ServiceLineDraft,
  type ValidityDeadlineStanding,
} from "@/lib/store/quote-composer-draft";
import type { AppendedQuoteRevision } from "@/lib/store/quotes.schemas";

export function useQuoteComposerState(rfqId: string) {
  const rfqQuery = useRfqQuery(rfqId);
  const quoteComparisonQuery = useQuoteComparisonQuery(rfqId);

  const existingQuoteId = quoteComparisonQuery.data?.success
    ? (quoteComparisonQuery.data.data[0]?.quoteId ?? null)
    : null;
  const existingQuoteQuery = useQuoteQuery(existingQuoteId ?? "");

  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [validityDeadlineStanding, setValidityDeadlineStanding] =
    useState<ValidityDeadlineStanding>("unset");
  const [appendedRevision, setAppendedRevision] = useState<AppendedQuoteRevision | null>(null);
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false);
  const [isDiscardConfirmVisible, setIsDiscardConfirmVisible] = useState(false);

  const shellAttempt = useResettableAttemptIdempotencyKey();
  const appendAttempt = useResettableAttemptIdempotencyKey();
  const submitAttempt = useResettableAttemptIdempotencyKey();
  const discardAttempt = useResettableAttemptIdempotencyKey();

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
  const activeDraft = draft ?? (activeRfq === null ? null : buildInitialDraft(activeRfq));

  function patchDraft(patch: Partial<QuoteDraft>) {
    if (activeDraft === null) return;
    setDraft({ ...activeDraft, ...patch });
  }

  function handleValidityDeadlineChange(nextLocalDateTime: string) {
    patchDraft({ validityDeadlineLocal: nextLocalDateTime });
    setValidityDeadlineStanding(classifyValidityDeadline(nextLocalDateTime, Date.now()));
  }

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

  return {
    state,
    activeRfq,
    activeDraft,
    currentStepIndex,
    validityDeadlineStanding,
    appendedRevision,
    isSubmitConfirmVisible,
    setIsSubmitConfirmVisible,
    isDiscardConfirmVisible,
    setIsDiscardConfirmVisible,
    createShellMutation,
    appendRevisionMutation,
    submitRevisionMutation,
    abandonRevisionMutation,
    patchDraft,
    handleValidityDeadlineChange,
    handleStepSelect,
    patchProductLine,
    patchServiceLine,
    handlePriceRevisionClick,
    handleConfirmSubmitClick,
    handleConfirmDiscardClick,
  };
}
