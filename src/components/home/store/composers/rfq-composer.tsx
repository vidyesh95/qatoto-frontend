// TRANSPORT: client-query — writes POST /commerce/rfqs.
"use client";

import Link from "next/link";

import { ComposerWizardShell } from "./composer-wizard-shell";
import {
  COMPOSER_STEPS,
  useRfqComposerState,
  type RfqGoodsLineSeed,
  type RfqServiceLineSeed,
} from "@/hooks/store/use-rfq-composer-state";
import {
  RfqBasicsStep,
  RfqCreatedDraftPanel,
  RfqDeliveryStep,
  RfqDocumentsStep,
  RfqGoodsStep,
  RfqReviewStep,
  RfqServicesStep,
} from "./rfq-composer-steps";

export type { RfqGoodsLineSeed, RfqServiceLineSeed };

export default function RfqComposer({
  seededGoodsLine = null,
  seededServiceLine = null,
  relatedOrderId = null,
}: {
  readonly seededGoodsLine?: RfqGoodsLineSeed | null;
  readonly seededServiceLine?: RfqServiceLineSeed | null;
  /** The goods order this request is for, from `?relatedOrderId=`. Services only while set. */
  readonly relatedOrderId?: string | null;
} = {}) {
  const {
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
  } = useRfqComposerState({ seededGoodsLine, seededServiceLine, relatedOrderId });

  const createResult = createDraftRfq.data;

  if (createResult !== undefined && createResult.success) {
    return <RfqCreatedDraftPanel rfqId={createResult.data.id} rfqTitle={createResult.data.title} />;
  }

  const currentStep = COMPOSER_STEPS[currentStepIndex];
  const stepId = currentStep?.id;

  const renderStep = () => {
    switch (stepId) {
      case "basics":
        return <RfqBasicsStep draft={draft} onPatchDraft={applyDraftPatch} />;
      case "delivery":
        return <RfqDeliveryStep draft={draft} onPatchDraft={applyDraftPatch} />;
      case "goods":
        return (
          <RfqGoodsStep
            goodsLines={draft.goodsLines}
            isLinkedToOrder={draft.relatedOrderId !== null}
            onAddLine={addGoodsLine}
            onPatchLine={patchGoodsLine}
            onRemoveLine={removeGoodsLine}
          />
        );
      case "services":
        return (
          <RfqServicesStep
            serviceLines={draft.serviceLines}
            goodsLines={draft.goodsLines}
            onAddLine={addServiceLine}
            onPatchLine={patchServiceLine}
            onRemoveLine={removeServiceLine}
          />
        );
      case "documents":
        return (
          <RfqDocumentsStep
            attachedDocumentIds={draft.attachedDocumentIds}
            onAttachedDocumentIdsChange={(attachedDocumentIds) =>
              applyDraftPatch({ attachedDocumentIds })
            }
          />
        );
      case "review":
        return <RfqReviewStep draft={draft} input={input} />;
      default: {
        return null;
      }
    }
  };

  return (
    <ComposerWizardShell
      title="New request for quotation"
      description="This saves a draft. Nothing is sent to any provider until you open it."
      steps={COMPOSER_STEPS}
      currentStepIndex={currentStepIndex}
      onStepSelect={setCurrentStepIndex}
      onPreviousStep={goToPreviousStep}
      onNextStep={goToNextStep}
      isLastStep={isLastStep}
      submitButton={
        <button
          type="button"
          disabled={input === null || createDraftRfq.isPending}
          onClick={handleSubmit}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {createDraftRfq.isPending ? "Saving…" : "Save as draft"}
        </button>
      }
    >
      {draft.relatedOrderId !== null && (
        // WHY THE GOODS STEP IS EMPTY, said once, above every step. The backend checks the link —
        // a party to that order, not cancelled — and the refusal shows below if it fails.
        <p className="mb-4 rounded-xl bg-secondary px-4 py-3 text-xs leading-4 text-secondary-foreground">
          Asking for services for{" "}
          <Link
            href={`/orders-and-returns/${encodeURIComponent(draft.relatedOrderId)}`}
            className="font-medium underline"
          >
            one of your orders
          </Link>
          , such as cargo insurance, lab testing or warehousing. A quote you accept becomes its own
          order and shows on that order for you only. Goods belong on a separate request.
        </p>
      )}
      {renderStep()}
      {createResult !== undefined && !createResult.success && (
        <p className="mt-4 text-xs leading-4 text-destructive">{createResult.error.message}</p>
      )}
      {createDraftRfq.isError && (
        <p className="mt-4 text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing save again is safe — the request carries an
          idempotency key, so a retry cannot create a second draft.
        </p>
      )}
    </ComposerWizardShell>
  );
}
