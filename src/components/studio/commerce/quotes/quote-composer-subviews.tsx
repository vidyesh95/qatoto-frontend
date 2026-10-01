"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { TextField } from "@/components/commerce/composer/composer-fields";
import { formatCentsLabel } from "@/lib/store/format";
import {
  QUOTE_STATUS_LABELS,
  RevisionChangedDetailSchema,
  type AppendedQuoteRevision,
  type QuoteStatus,
} from "@/lib/store/quotes.schemas";
import type { DeliverableDraft, ValidityDeadlineStanding } from "@/lib/store/quote-composer-draft";

export function PanelShell({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border p-5">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export function BackToRequestsLink() {
  return (
    <Link href="/studio/rfqs" className="text-sm font-medium text-primary underline">
      Back to requests to quote
    </Link>
  );
}

export function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function DiscardConfirmation({
  revisionNumber,
  isDiscarding,
  onConfirm,
  onCancel,
}: {
  readonly revisionNumber: number;
  readonly isDiscarding: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
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
          className="cursor-pointer rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
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

export function ExpiryWarning({ standing }: { readonly standing: ValidityDeadlineStanding }) {
  if (standing !== "past" && standing !== "short") return null;
  return (
    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {standing === "past"
        ? "This deadline has already passed. Priced now, the revision could not be submitted at all — you would have to discard it and price it again."
        : "This deadline is less than a day away. If it passes before you submit, the revision can no longer be submitted and you will have to discard it and price again."}
    </p>
  );
}

export function UnsubmittedRevisionRule() {
  return (
    <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
      Only one revision can be open at a time, so this one has to be submitted or discarded before
      another can be priced. If its deadline passes first, discarding is the way on.
    </p>
  );
}

export function RevisionChangedNotice({
  result,
}: {
  readonly result:
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

export function DeliverablePlanFields({
  deliverables,
  onDeliverablesChange,
}: {
  readonly deliverables: readonly DeliverableDraft[];
  readonly onDeliverablesChange: (nextDeliverables: DeliverableDraft[]) => void;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">Deliverables</span>
      <span className="block text-xs leading-4 text-muted-foreground">
        Optional. Steps are numbered by their order here, so removing one renumbers the rest.
      </span>
      <div className="mt-2 space-y-2">
        {deliverables.map((deliverable, deliverableIndex) => (
          <div key={deliverableIndex} className="rounded-lg border border-border p-3">
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

export function AppendedRevisionPanel({
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
  readonly rfqId: string;
  readonly quoteId: string;
  readonly revision: AppendedQuoteRevision;
  readonly isSubmitConfirmVisible: boolean;
  readonly onRequestConfirm: () => void;
  readonly onCancelConfirm: () => void;
  readonly onConfirmSubmit: () => void;
  readonly isSubmitting: boolean;
  readonly isDiscardConfirmVisible: boolean;
  readonly onRequestDiscard: () => void;
  readonly onCancelDiscard: () => void;
  readonly onConfirmDiscard: () => void;
  readonly isDiscarding: boolean;
  readonly discardResult:
    | {
        readonly success: boolean;
        readonly error?: { readonly message: string; readonly details?: unknown };
      }
    | undefined;
  readonly hasDiscardThrown: boolean;
  readonly submitResult:
    | {
        readonly success: boolean;
        readonly error?: { readonly message: string; readonly details?: unknown };
      }
    | undefined;
  readonly hasSubmitThrown: boolean;
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
          value={new Date(revision.validityDeadlineAt).toLocaleString("en-US", {
            timeZone: "UTC",
          })}
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

      <p className="mt-2 text-xs leading-4 text-muted-foreground">
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

export function ResumeUnsubmittedRevisionPanel({
  revisionNumber,
  totalInCents,
  currency,
  validityDeadlineAt,
  isDiscardConfirmVisible,
  isDiscarding,
  onConfirmDiscard,
  onCancelDiscard,
  onRequestDiscard,
  isSubmitting,
  onConfirmSubmit,
  submitResult,
  hasSubmitThrown,
  discardResult,
  hasDiscardThrown,
}: {
  readonly revisionNumber: number;
  readonly totalInCents: number;
  readonly currency: string;
  readonly validityDeadlineAt: string;
  readonly isDiscardConfirmVisible: boolean;
  readonly isDiscarding: boolean;
  readonly onConfirmDiscard: () => void;
  readonly onCancelDiscard: () => void;
  readonly onRequestDiscard: () => void;
  readonly isSubmitting: boolean;
  readonly onConfirmSubmit: () => void;
  readonly submitResult:
    | {
        readonly success: boolean;
        readonly error?: { readonly message: string; readonly details?: unknown };
      }
    | undefined;
  readonly hasSubmitThrown: boolean;
  readonly discardResult:
    | {
        readonly success: boolean;
        readonly error?: { readonly message: string; readonly details?: unknown };
      }
    | undefined;
  readonly hasDiscardThrown: boolean;
}) {
  return (
    <PanelShell title={`Revision ${revisionNumber} is priced but not submitted`}>
      <p className="text-sm text-muted-foreground">
        You appended this revision and did not submit it. Only one unsubmitted revision can exist at
        a time, so it has to be submitted before another can be priced.
      </p>
      <dl className="mt-3 grid gap-1 text-sm">
        <SummaryRow label="Total" value={formatCentsLabel(totalInCents, currency)} />
        <SummaryRow
          label="Valid until"
          value={new Date(validityDeadlineAt).toLocaleString("en-US", {
            timeZone: "UTC",
          })}
        />
      </dl>
      <UnsubmittedRevisionRule />
      {isDiscardConfirmVisible ? (
        <DiscardConfirmation
          revisionNumber={revisionNumber}
          isDiscarding={isDiscarding}
          onConfirm={onConfirmDiscard}
          onCancel={onCancelDiscard}
        />
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirmSubmit}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : `Submit revision ${revisionNumber}`}
          </button>
          <button
            type="button"
            onClick={onRequestDiscard}
            className="cursor-pointer text-sm font-medium text-destructive underline"
          >
            Discard and price again
          </button>
        </div>
      )}
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
    </PanelShell>
  );
}

export function QuoteClosedPanel({
  quoteId,
  quoteStatus,
}: {
  readonly quoteId: string;
  readonly quoteStatus: QuoteStatus;
}) {
  return (
    <PanelShell title="This quote is closed">
      <p className="text-sm text-muted-foreground">
        This quote is {QUOTE_STATUS_LABELS[quoteStatus].toLowerCase()} and can no longer be revised.
      </p>
      <div className="flex gap-4 pt-2">
        <Link
          href={`/studio/quotes/${quoteId}`}
          className="text-sm font-medium text-primary underline"
        >
          Open this quote
        </Link>
        <BackToRequestsLink />
      </div>
    </PanelShell>
  );
}
