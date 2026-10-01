"use client";

import TradeDocumentPicker from "@/components/commerce/trade-document-picker";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/commerce/composer/composer-fields";
import QuoteServiceDetailFields from "@/components/studio/commerce/quotes/quote-service-detail-fields";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import { QUOTE_INCOTERMS, QUOTE_INCOTERM_LABELS } from "@/lib/store/quotes.schemas";
import {
  collectMissingRequirements,
  type DeliverableDraft,
  type ProductLineDraft,
  type QuoteDraft,
  type ServiceLineDraft,
  type ValidityDeadlineStanding,
} from "@/lib/store/quote-composer-draft";
import type { RfqDetail } from "@/lib/store/rfqs.schemas";
import { DeliverablePlanFields, ExpiryWarning } from "./quote-composer-subviews";

export function QuoteGoodsStep({
  rfq,
  currentDraft,
  onPatchProductLine,
}: {
  readonly rfq: RfqDetail;
  readonly currentDraft: QuoteDraft;
  readonly onPatchProductLine: (lineId: string, patch: Partial<ProductLineDraft>) => void;
}) {
  if (rfq.productLines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This request asks for no goods — only services.
      </p>
    );
  }

  return (
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
                  onPatchProductLine(rfqProductLine.id, { isQuoted: changeEvent.target.checked })
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
                      onPatchProductLine(rfqProductLine.id, { quantity: nextValue })
                    }
                  />
                  <TextField
                    label="Unit price"
                    hint={`Major units, in ${currentDraft.currency || "your currency"}.`}
                    value={lineDraft.unitPriceMajorUnits}
                    onValueChange={(nextValue) =>
                      onPatchProductLine(rfqProductLine.id, { unitPriceMajorUnits: nextValue })
                    }
                  />
                </div>
                <TextField
                  label="What you are supplying"
                  hint="Seeded from the request. Your words are what reach the order."
                  value={lineDraft.titleSnapshot}
                  onValueChange={(nextValue) =>
                    onPatchProductLine(rfqProductLine.id, { titleSnapshot: nextValue })
                  }
                  maxLength={200}
                />
                <TextAreaField
                  label="Specification"
                  value={lineDraft.specificationSnapshot}
                  onValueChange={(nextValue) =>
                    onPatchProductLine(rfqProductLine.id, { specificationSnapshot: nextValue })
                  }
                  maxLength={10_000}
                />
                <TextField
                  label="Lead time in days"
                  hint="Leave blank rather than guessing — a zero promises same-day."
                  value={lineDraft.leadTimeDays}
                  onValueChange={(nextValue) =>
                    onPatchProductLine(rfqProductLine.id, { leadTimeDays: nextValue })
                  }
                />
                <TextAreaField
                  label="Exclusions"
                  hint="What this price does not cover. This is where a narrower scope gets said."
                  value={lineDraft.exclusionsSnapshot}
                  onValueChange={(nextValue) =>
                    onPatchProductLine(rfqProductLine.id, { exclusionsSnapshot: nextValue })
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
}

export function QuoteServicesStep({
  rfq,
  currentDraft,
  onPatchServiceLine,
}: {
  readonly rfq: RfqDetail;
  readonly currentDraft: QuoteDraft;
  readonly onPatchServiceLine: (lineId: string, patch: Partial<ServiceLineDraft>) => void;
}) {
  if (rfq.serviceLines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This request asks for no services — only goods.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rfq.serviceLines.map((rfqServiceLine) => {
        const lineDraft = currentDraft.serviceLines[rfqServiceLine.id];
        if (lineDraft === undefined) return null;
        return (
          <fieldset key={rfqServiceLine.id} className="rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-medium text-foreground">
              {PROVIDER_KIND_LABELS[rfqServiceLine.providerKind]}
            </legend>
            <p className="text-xs text-muted-foreground">{rfqServiceLine.requirementSummary}</p>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={lineDraft.isQuoted}
                onChange={(changeEvent) =>
                  onPatchServiceLine(rfqServiceLine.id, { isQuoted: changeEvent.target.checked })
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
                      onPatchServiceLine(rfqServiceLine.id, { feeMajorUnits: nextValue })
                    }
                  />
                  <TextField
                    label="Lead time in days"
                    value={lineDraft.leadTimeDays}
                    onValueChange={(nextValue) =>
                      onPatchServiceLine(rfqServiceLine.id, { leadTimeDays: nextValue })
                    }
                  />
                </div>
                <TextField
                  label="Service title"
                  value={lineDraft.titleSnapshot}
                  onValueChange={(nextValue) =>
                    onPatchServiceLine(rfqServiceLine.id, { titleSnapshot: nextValue })
                  }
                  maxLength={200}
                />
                <TextAreaField
                  label="Scope"
                  hint="Seeded from what was asked. Say what you are actually undertaking."
                  value={lineDraft.scopeSnapshot}
                  onValueChange={(nextValue) =>
                    onPatchServiceLine(rfqServiceLine.id, { scopeSnapshot: nextValue })
                  }
                  maxLength={10_000}
                />
                <TextAreaField
                  label="Exclusions"
                  value={lineDraft.exclusionsSnapshot}
                  onValueChange={(nextValue) =>
                    onPatchServiceLine(rfqServiceLine.id, { exclusionsSnapshot: nextValue })
                  }
                  maxLength={10_000}
                />
                <QuoteServiceDetailFields
                  providerKind={rfqServiceLine.providerKind}
                  draft={lineDraft.serviceDetail}
                  onDraftChange={(nextDetail) =>
                    onPatchServiceLine(rfqServiceLine.id, { serviceDetail: nextDetail })
                  }
                />
                <DeliverablePlanFields
                  deliverables={lineDraft.deliverables}
                  onDeliverablesChange={(nextDeliverables: DeliverableDraft[]) =>
                    onPatchServiceLine(rfqServiceLine.id, { deliverables: nextDeliverables })
                  }
                />
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

export function QuoteTermsStep({
  currentDraft,
  validityDeadlineStanding,
  onPatchDraft,
  onValidityDeadlineChange,
}: {
  readonly currentDraft: QuoteDraft;
  readonly validityDeadlineStanding: ValidityDeadlineStanding;
  readonly onPatchDraft: (patch: Partial<QuoteDraft>) => void;
  readonly onValidityDeadlineChange: (localDateTime: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Currency"
          hint="Seeded from the request's settlement currency. You may quote in another."
          value={currentDraft.currency}
          onValueChange={(nextValue) => onPatchDraft({ currency: nextValue })}
          maxLength={3}
        />
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Valid until</span>
          <span className="block text-xs leading-4 text-muted-foreground">
            A revision has to be submitted before its deadline. Past it you can still discard and
            price again, but you lose the round trip — so leave yourself room.
          </span>
          <input
            type="datetime-local"
            value={currentDraft.validityDeadlineLocal}
            onChange={(changeEvent) => onValidityDeadlineChange(changeEvent.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>

      <ExpiryWarning standing={validityDeadlineStanding} />

      <p className="text-xs leading-4 text-muted-foreground">
        The subtotal and total are computed by the server from your lines and these four amounts. A
        blank field here means zero — that is a real answer on a quote, unlike on a request.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Tax"
          value={currentDraft.taxMajorUnits}
          onValueChange={(nextValue) => onPatchDraft({ taxMajorUnits: nextValue })}
        />
        <TextField
          label="Service fee"
          value={currentDraft.serviceFeeMajorUnits}
          onValueChange={(nextValue) => onPatchDraft({ serviceFeeMajorUnits: nextValue })}
        />
        <TextField
          label="Freight"
          value={currentDraft.shippingMajorUnits}
          onValueChange={(nextValue) => onPatchDraft({ shippingMajorUnits: nextValue })}
        />
        <TextField
          label="Discount"
          hint="Subtracted. A discount larger than everything else is refused by the server."
          value={currentDraft.discountMajorUnits}
          onValueChange={(nextValue) => onPatchDraft({ discountMajorUnits: nextValue })}
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
        onValueChange={(nextValue) => onPatchDraft({ incoterm: nextValue })}
      />
      <TextAreaField
        label="Payment terms"
        value={currentDraft.paymentTerms}
        onValueChange={(nextValue) => onPatchDraft({ paymentTerms: nextValue })}
        maxLength={2000}
      />
      <TextAreaField
        label="Notes"
        value={currentDraft.notes}
        onValueChange={(nextValue) => onPatchDraft({ notes: nextValue })}
        maxLength={10_000}
      />
    </div>
  );
}

export function QuoteDocumentsStep({
  attachedDocumentIds,
  onAttachedDocumentIdsChange,
}: {
  readonly attachedDocumentIds: string[];
  readonly onAttachedDocumentIdsChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">Attachments</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drawings, certificates or a full specification supporting this offer. The buyer can open
          them alongside your prices.
        </p>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          They attach to this revision. If you revise the quote, choose them again for the new one —
          the buyer keeps seeing the old set against the old prices.
        </p>
      </div>
      <TradeDocumentPicker
        selectedDocumentIds={attachedDocumentIds}
        onSelectionChange={onAttachedDocumentIdsChange}
      />
    </div>
  );
}

export function QuoteReviewStep({
  rfq,
  currentDraft,
  validityDeadlineStanding,
}: {
  readonly rfq: RfqDetail;
  readonly currentDraft: QuoteDraft;
  readonly validityDeadlineStanding: ValidityDeadlineStanding;
}) {
  const missingRequirements = collectMissingRequirements(
    rfq,
    currentDraft,
    validityDeadlineStanding,
  );

  return (
    <div className="space-y-3">
      {missingRequirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ready to price. The server will compute the subtotal and total from your lines and show
          them before anything is submitted.
        </p>
      ) : (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground">Still needed</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {missingRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
