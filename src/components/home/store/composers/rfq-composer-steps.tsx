"use client";

import Link from "next/link";
import TradeDocumentPicker from "@/components/commerce/trade-document-picker";
import {
  IntegerField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/commerce/composer/composer-fields";
import RfqRequirementDetailFields from "@/components/home/store/composers/rfq-requirement-detail-fields";
import { RFQ_VISIBILITY_LABELS } from "@/lib/store/rfqs.schemas";
import {
  collectMissingRequirements,
  isDeliveryWindowHalfFilled,
  PROVIDER_KIND_OPTIONS,
  VISIBILITY_OPTIONS,
  type GoodsLineDraft,
  type RfqComposerDraft,
  type ServiceLineDraft,
} from "@/hooks/store/use-rfq-composer-state";
import type { CreateDraftRfqInput } from "@/lib/store/rfqs.schemas";

export function RfqBasicsStep({
  draft,
  onPatchDraft,
}: {
  readonly draft: RfqComposerDraft;
  readonly onPatchDraft: (patch: Partial<RfqComposerDraft>) => void;
}) {
  return (
    <div className="space-y-3">
      <TextField
        label="Title"
        hint="What you are sourcing. Providers see this first."
        value={draft.title}
        onValueChange={(title) => onPatchDraft({ title })}
        maxLength={200}
      />
      <TextAreaField
        label="Description"
        value={draft.description}
        onValueChange={(description) => onPatchDraft({ description })}
        rows={4}
        maxLength={10_000}
      />
      <SelectField
        label="Who can see this request"
        hint="This is a disclosure decision, not a reach setting."
        value={draft.visibility}
        options={VISIBILITY_OPTIONS}
        onValueChange={(visibility) => onPatchDraft({ visibility })}
      />
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Quotes due by</span>
        <span className="block text-xs leading-4 text-muted-foreground">
          Your local time. Providers see it in UTC.
        </span>
        <input
          type="datetime-local"
          value={draft.responseDeadlineLocal}
          onChange={(changeEvent) =>
            onPatchDraft({ responseDeadlineLocal: changeEvent.target.value })
          }
          className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <TextField
        label="Settlement currency"
        hint="Three letters. Quotes may still be priced in another currency."
        value={draft.settlementCurrency}
        onValueChange={(settlementCurrency) => onPatchDraft({ settlementCurrency })}
        maxLength={3}
      />
    </div>
  );
}

export function RfqDeliveryStep({
  draft,
  onPatchDraft,
}: {
  readonly draft: RfqComposerDraft;
  readonly onPatchDraft: (patch: Partial<RfqComposerDraft>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
        Give both ends of the delivery window or neither. A window with only one end is refused — it
        is not read as &ldquo;any time after&rdquo;.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Delivery from</span>
          <input
            type="datetime-local"
            value={draft.desiredDeliveryStartsLocal}
            onChange={(changeEvent) =>
              onPatchDraft({ desiredDeliveryStartsLocal: changeEvent.target.value })
            }
            className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Delivery by</span>
          <input
            type="datetime-local"
            value={draft.desiredDeliveryEndsLocal}
            onChange={(changeEvent) =>
              onPatchDraft({ desiredDeliveryEndsLocal: changeEvent.target.value })
            }
            className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>
      {isDeliveryWindowHalfFilled(draft) && (
        <p className="text-xs leading-4 text-warning">
          Only one end is filled, so the window will be left off this request entirely.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Destination country code"
          hint="Two letters."
          value={draft.destinationCountryCode}
          onValueChange={(destinationCountryCode) => onPatchDraft({ destinationCountryCode })}
          maxLength={2}
        />
        <TextField
          label="Destination city"
          value={draft.destinationLocality}
          onValueChange={(destinationLocality) => onPatchDraft({ destinationLocality })}
          maxLength={150}
        />
      </div>
      <p className="text-xs leading-4 text-muted-foreground">
        A city is enough for a provider to quote a lane. Street lines are never put on a request —
        every invited provider can read this.
      </p>
    </div>
  );
}

export function RfqGoodsStep({
  goodsLines,
  onAddLine,
  onPatchLine,
  onRemoveLine,
}: {
  readonly goodsLines: readonly GoodsLineDraft[];
  readonly onAddLine: () => void;
  readonly onPatchLine: (localId: string, patch: Partial<GoodsLineDraft>) => void;
  readonly onRemoveLine: (localId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-4 text-muted-foreground">
        A request can be goods only, services only, or both. Every line needs a quantity and a unit.
      </p>
      {goodsLines.map((goodsLine, goodsLineIndex) => (
        <fieldset
          key={goodsLine.localId}
          className="space-y-3 rounded-xl border border-border px-4 py-3"
        >
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Goods line {goodsLineIndex + 1}
          </legend>
          <TextField
            label="What you want"
            value={goodsLine.requestedTitle}
            onValueChange={(requestedTitle) => onPatchLine(goodsLine.localId, { requestedTitle })}
            maxLength={200}
          />
          <TextAreaField
            label="Specification"
            hint="Drawings, tolerances, finishes — whatever a maker needs to price it."
            value={goodsLine.requestedSpecificationSnapshot}
            onValueChange={(requestedSpecificationSnapshot) =>
              onPatchLine(goodsLine.localId, { requestedSpecificationSnapshot })
            }
            maxLength={10_000}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <IntegerField
              label="Quantity"
              value={goodsLine.quantity}
              onValueChange={(quantity) => onPatchLine(goodsLine.localId, { quantity })}
            />
            <TextField
              label="Unit"
              hint="e.g. pieces, tons, containers."
              value={goodsLine.unitLabel}
              onValueChange={(unitLabel) => onPatchLine(goodsLine.localId, { unitLabel })}
              maxLength={40}
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveLine(goodsLine.localId)}
            className="cursor-pointer text-xs font-medium text-destructive underline"
          >
            Remove this line
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={onAddLine}
        className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
      >
        Add a goods line
      </button>
    </div>
  );
}

export function RfqServicesStep({
  serviceLines,
  goodsLines,
  onAddLine,
  onPatchLine,
  onRemoveLine,
}: {
  readonly serviceLines: readonly ServiceLineDraft[];
  readonly goodsLines: readonly GoodsLineDraft[];
  readonly onAddLine: () => void;
  readonly onPatchLine: (localId: string, patch: Partial<ServiceLineDraft>) => void;
  readonly onRemoveLine: (localId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-4 text-muted-foreground">
        Freight, customs, inspection, insurance and the rest. Each line asks for the fields its own
        kind of provider needs.
      </p>
      {serviceLines.map((serviceLine, serviceLineIndex) => (
        <fieldset
          key={serviceLine.localId}
          className="space-y-3 rounded-xl border border-border px-4 py-3"
        >
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Service line {serviceLineIndex + 1}
          </legend>
          <SelectField
            label="Kind of provider"
            value={serviceLine.providerKind}
            options={PROVIDER_KIND_OPTIONS}
            onValueChange={(providerKind) => onPatchLine(serviceLine.localId, { providerKind })}
          />
          <TextAreaField
            label="What you need, in words"
            hint="Required. For some kinds this is the whole requirement."
            value={serviceLine.requirementSummary}
            onValueChange={(requirementSummary) =>
              onPatchLine(serviceLine.localId, { requirementSummary })
            }
            maxLength={4000}
          />

          {goodsLines.length > 0 && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Related goods line</span>
              <span className="block text-xs leading-4 text-muted-foreground">
                Optional. Linking does not make the service a child of the goods — cancelling one
                does not cancel the other.
              </span>
              <select
                value={serviceLine.linkedGoodsLineIndex ?? ""}
                onChange={(changeEvent) => {
                  const rawValue = changeEvent.target.value;
                  onPatchLine(serviceLine.localId, {
                    linkedGoodsLineIndex: rawValue === "" ? null : Number(rawValue),
                  });
                }}
                className="mt-1 w-full cursor-pointer rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Not related to a specific goods line</option>
                {goodsLines.map((goodsLine, goodsLineIndex) => (
                  <option key={goodsLine.localId} value={goodsLineIndex}>
                    {goodsLineIndex + 1}.{" "}
                    {goodsLine.requestedTitle.trim() === ""
                      ? "(untitled line)"
                      : goodsLine.requestedTitle}
                  </option>
                ))}
              </select>
            </label>
          )}

          <RfqRequirementDetailFields
            providerKind={serviceLine.providerKind}
            draft={serviceLine.requirement}
            onDraftChange={(requirementPatch) =>
              onPatchLine(serviceLine.localId, {
                requirement: { ...serviceLine.requirement, ...requirementPatch },
              })
            }
          />

          <button
            type="button"
            onClick={() => onRemoveLine(serviceLine.localId)}
            className="cursor-pointer text-xs font-medium text-destructive underline"
          >
            Remove this line
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={onAddLine}
        className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
      >
        Add a service line
      </button>
    </div>
  );
}

export function RfqDocumentsStep({
  attachedDocumentIds,
  onAttachedDocumentIdsChange,
}: {
  readonly attachedDocumentIds: readonly string[];
  readonly onAttachedDocumentIdsChange: (ids: readonly string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">Attachments</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drawings, specifications or certificates providers should quote against. Optional — every
          invited provider who can see this RFQ can open them.
        </p>
      </div>
      <TradeDocumentPicker
        selectedDocumentIds={attachedDocumentIds}
        onSelectionChange={onAttachedDocumentIdsChange}
      />
    </div>
  );
}

export function RfqReviewStep({
  draft,
  input,
}: {
  readonly draft: RfqComposerDraft;
  readonly input: CreateDraftRfqInput | null;
}) {
  return (
    <div className="space-y-3">
      {input === null ? (
        <div className="rounded-xl border border-warning/40 bg-warning-container px-4 py-3">
          <p className="text-sm font-medium text-warning-container-foreground">
            Not ready to save yet
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs leading-4 text-warning-container-foreground">
            {collectMissingRequirements(draft).map((missingRequirement) => (
              <li key={missingRequirement}>{missingRequirement}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">{input.title}</p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {input.productLines.length} goods {input.productLines.length === 1 ? "line" : "lines"} ·{" "}
            {input.serviceLines.length} service {input.serviceLines.length === 1 ? "line" : "lines"}{" "}
            · settling in {input.settlementCurrency}
          </p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            {RFQ_VISIBILITY_LABELS[input.visibility]}
          </p>
          {input.desiredDeliveryStartsAt === undefined && (
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              No delivery window on this request.
            </p>
          )}
        </div>
      )}

      <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
        Attachments cannot be added yet. The request format supports them, but there is no route for
        a buyer to upload a file, so any control here would produce an attachment the server
        rejects. Put drawings and specifications into the specification text for now.
      </p>

      <p className="text-xs leading-4 text-muted-foreground">
        Saving creates a private draft. Providers see nothing until you open it from the
        request&apos;s own page, and opening runs its own checks.
      </p>
    </div>
  );
}

export function RfqCreatedDraftPanel({
  rfqId,
  rfqTitle,
}: {
  readonly rfqId: string;
  readonly rfqTitle: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
        ✓
      </span>
      <p className="text-base font-medium text-foreground">Saved as a draft</p>
      <p className="text-sm text-muted-foreground">
        Only your organization can see &ldquo;{rfqTitle}&rdquo;. No provider has been invited and
        nothing has been sent. Open it when you are ready — that is the moment it becomes visible.
      </p>
      <Link
        href={`/store/rfqs/${rfqId}`}
        className="mt-2 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Open your draft
      </Link>
    </div>
  );
}
