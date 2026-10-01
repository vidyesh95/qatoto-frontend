"use client";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { ComposerStepRail } from "@/components/commerce/composer/composer-fields";
import {
  collectMissingRequirements,
  COMPOSER_STEPS,
  type ComposerStepId,
} from "@/lib/store/quote-composer-draft";
import { useQuoteComposerState } from "@/hooks/store/use-quote-composer-state";
import {
  AppendedRevisionPanel,
  BackToRequestsLink,
  PanelShell,
  QuoteClosedPanel,
  ResumeUnsubmittedRevisionPanel,
} from "./quote-composer-subviews";
import {
  QuoteDocumentsStep,
  QuoteGoodsStep,
  QuoteReviewStep,
  QuoteServicesStep,
  QuoteTermsStep,
} from "./quote-composer-steps";

type ComposerHookState = ReturnType<typeof useQuoteComposerState>;

function NotQuotablePanel({ rfqTitle, reason }: { rfqTitle: string; reason: string }) {
  return (
    <PanelShell title={rfqTitle}>
      <p className="text-sm text-muted-foreground">
        {reason === "callerIsBuyer"
          ? "You raised this request, so you cannot quote against it. Providers you invited will answer here."
          : "This request is not open, so a first quote cannot be started. If you already have a quote on it, you can still revise that."}
      </p>
      <BackToRequestsLink />
    </PanelShell>
  );
}

interface ComposingStepContentProps {
  stepId: ComposerStepId;
  rfq: Extract<ComposerHookState["state"], { status: "composing" }>["rfq"];
  activeDraft: NonNullable<ComposerHookState["activeDraft"]>;
  validityDeadlineStanding: ComposerHookState["validityDeadlineStanding"];
  patchProductLine: ComposerHookState["patchProductLine"];
  patchServiceLine: ComposerHookState["patchServiceLine"];
  patchDraft: ComposerHookState["patchDraft"];
  handleValidityDeadlineChange: ComposerHookState["handleValidityDeadlineChange"];
}

function ComposingStepContent({
  stepId,
  rfq,
  activeDraft,
  validityDeadlineStanding,
  patchProductLine,
  patchServiceLine,
  patchDraft,
  handleValidityDeadlineChange,
}: ComposingStepContentProps) {
  switch (stepId) {
    case "goods":
      return (
        <QuoteGoodsStep
          rfq={rfq}
          currentDraft={activeDraft}
          onPatchProductLine={patchProductLine}
        />
      );
    case "services":
      return (
        <QuoteServicesStep
          rfq={rfq}
          currentDraft={activeDraft}
          onPatchServiceLine={patchServiceLine}
        />
      );
    case "terms":
      return (
        <QuoteTermsStep
          currentDraft={activeDraft}
          validityDeadlineStanding={validityDeadlineStanding}
          onPatchDraft={patchDraft}
          onValidityDeadlineChange={handleValidityDeadlineChange}
        />
      );
    case "documents":
      return (
        <QuoteDocumentsStep
          attachedDocumentIds={activeDraft.attachedDocumentIds}
          onAttachedDocumentIdsChange={(attachedDocumentIds) => patchDraft({ attachedDocumentIds })}
        />
      );
    case "review":
      return (
        <QuoteReviewStep
          rfq={rfq}
          currentDraft={activeDraft}
          validityDeadlineStanding={validityDeadlineStanding}
        />
      );
    default: {
      const exhaustiveCheck: never = stepId;
      return exhaustiveCheck;
    }
  }
}

interface ComposingPanelProps {
  state: Extract<ComposerHookState["state"], { status: "composing" }>;
  composer: ComposerHookState;
}

function ComposingPanel({ state, composer }: ComposingPanelProps) {
  const {
    activeDraft,
    currentStepIndex,
    validityDeadlineStanding,
    createShellMutation,
    appendRevisionMutation,
    patchDraft,
    handleValidityDeadlineChange,
    handleStepSelect,
    patchProductLine,
    patchServiceLine,
    handlePriceRevisionClick,
  } = composer;

  if (activeDraft === null) return null;
  const missingRequirements = collectMissingRequirements(
    state.rfq,
    activeDraft,
    validityDeadlineStanding,
  );
  const isPricingBlocked = missingRequirements.length > 0;
  const isPricing = createShellMutation.isPending || appendRevisionMutation.isPending;
  const stepId: ComposerStepId = COMPOSER_STEPS[currentStepIndex]?.id ?? "goods";

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

      <ComposingStepContent
        stepId={stepId}
        rfq={state.rfq}
        activeDraft={activeDraft}
        validityDeadlineStanding={validityDeadlineStanding}
        patchProductLine={patchProductLine}
        patchServiceLine={patchServiceLine}
        patchDraft={patchDraft}
        handleValidityDeadlineChange={handleValidityDeadlineChange}
      />

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

export default function QuoteComposer({ rfqId }: { readonly rfqId: string }) {
  const composer = useQuoteComposerState(rfqId);
  const {
    state,
    appendedRevision,
    isSubmitConfirmVisible,
    setIsSubmitConfirmVisible,
    isDiscardConfirmVisible,
    setIsDiscardConfirmVisible,
    submitRevisionMutation,
    abandonRevisionMutation,
    handleConfirmSubmitClick,
    handleConfirmDiscardClick,
  } = composer;

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
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <BackToRequestsLink />
        </PanelShell>
      );

    case "notQuotable":
      return <NotQuotablePanel rfqTitle={state.rfqTitle} reason={state.reason} />;

    case "quoteClosed":
      return <QuoteClosedPanel quoteId={state.quoteId} quoteStatus={state.quoteStatus} />;

    case "resumeUnsubmittedRevision":
      return (
        <ResumeUnsubmittedRevisionPanel
          revisionNumber={state.revisionNumber}
          totalInCents={state.totalInCents}
          currency={state.currency}
          validityDeadlineAt={state.validityDeadlineAt}
          isDiscardConfirmVisible={isDiscardConfirmVisible}
          isDiscarding={abandonRevisionMutation.isPending}
          onConfirmDiscard={() =>
            void handleConfirmDiscardClick(state.quoteId, state.revisionNumber)
          }
          onCancelDiscard={() => setIsDiscardConfirmVisible(false)}
          onRequestDiscard={() => setIsDiscardConfirmVisible(true)}
          isSubmitting={submitRevisionMutation.isPending}
          onConfirmSubmit={() => void handleConfirmSubmitClick(state.quoteId, state.revisionNumber)}
          submitResult={submitRevisionMutation.data}
          hasSubmitThrown={submitRevisionMutation.isError}
          discardResult={abandonRevisionMutation.data}
          hasDiscardThrown={abandonRevisionMutation.isError}
        />
      );

    case "composing":
      return <ComposingPanel state={state} composer={composer} />;

    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
