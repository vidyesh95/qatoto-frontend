// TRANSPORT: client-query — writes POST /commerce/rfqs.
"use client";

// THE BUYER'S REQUEST COMPOSER. Five steps, then a draft.
//
// IT CREATES A DRAFT AND NOTHING ELSE. `POST /commerce/rfqs` does not open the RFQ, notifies nobody, and
// makes it visible to no provider. Opening is a separate call behind a real validation gate, on the RFQ's own
// page. So every word on the success screen says "draft", and none say "sent".
//
// THREE CONTRACT RULES SHAPE THE FORM, all from `CreateDraftRfqSchema`:
//
//  1. THE DELIVERY WINDOW IS BOTH-OR-NEITHER. The backend `.refine()`s that `desiredDeliveryStartsAt` and
//     `desiredDeliveryEndsAt` are set together, so a half-filled window is a 422 — not an open-ended one.
//     Both fields are therefore submitted as a pair or dropped as a pair, and the form says so.
//  2. `providerKind` APPEARS TWICE per service line — on the line and inside `requirementDetail` — and a
//     `.refine()` demands they match. One control sets both; there is no second control that could disagree.
//  3. A SERVICE LINE'S LINK TO A GOODS LINE IS BY SIBLING ORDER, not by id. The goods lines do not exist yet
//     when this body is built, so there is no id to point at — `linkedProductLineSiblingOrder` is an index
//     into this same request.
//
// THE ATTACHMENT STEP EXISTS NOW, and the comment that used to sit here — "there is no attachment step, and
// that is a backend gap" — was true when written and stopped being true when `POST /commerce/documents`
// shipped with encryption, scanning and an audit trail. `documentIds` was always on the contract; what was
// missing was a route by which a buyer created a document to point at.
//
// ⚠️ AN UPLOAD IS NOT AN ATTACHMENT. That route answers 202: the file is stored `pending_scan` and only
// becomes attachable once an async virus scan clears it. `TradeDocumentPicker` owns that rule — it lists
// only scanned documents, so anything selectable here is something the save will accept.
//
// IDEMPOTENCY KEY MINTED ONCE, on mount, held in state. A fresh key per retry is a second draft RFQ.

import { useState } from "react";

import TradeDocumentPicker from "@/components/commerce/trade-document-picker";

import Link from "next/link";

import {
  ComposerStepRail,
  IntegerField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/commerce/composer/composer-fields";
import {
  toOptionalCountryCode,
  toOptionalIsoInstant,
  toOptionalText,
} from "@/components/commerce/composer/composer-input";
import RfqRequirementDetailFields, {
  buildRequirementDetailInput,
  EMPTY_RFQ_REQUIREMENT_DRAFT,
  type RfqRequirementDraft,
} from "@/components/home/store/composers/rfq-requirement-detail-fields";
import { useCreateDraftRfq } from "@/hooks/store/rfqs";
import { useAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import type {
  CreateDraftRfqInput,
  RfqProductLineInput,
  RfqServiceLineInput,
  RfqVisibility,
} from "@/lib/store/rfqs.schemas";
import { RFQ_VISIBILITY_LABELS } from "@/lib/store/rfqs.schemas";
import { PROVIDER_KINDS, type ProviderKind } from "@/lib/store/shared.schemas";

const COMPOSER_STEPS = [
  { id: "basics", label: "Basics" },
  { id: "delivery", label: "Delivery" },
  { id: "goods", label: "Goods" },
  { id: "services", label: "Services" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
] as const;

interface GoodsLineDraft {
  readonly localId: string;
  requestedTitle: string;
  requestedSpecificationSnapshot: string;
  quantity: string;
  unitLabel: string;
}

interface ServiceLineDraft {
  readonly localId: string;
  providerKind: ProviderKind;
  requirementSummary: string;
  /** An index into the goods lines, or `null` for "not related to a specific goods line". */
  linkedGoodsLineIndex: number | null;
  requirement: RfqRequirementDraft;
}

interface RfqComposerDraft {
  title: string;
  description: string;
  visibility: RfqVisibility;
  responseDeadlineLocal: string;
  settlementCurrency: string;
  desiredDeliveryStartsLocal: string;
  desiredDeliveryEndsLocal: string;
  destinationCountryCode: string;
  destinationLocality: string;
  goodsLines: GoodsLineDraft[];
  serviceLines: ServiceLineDraft[];
  /** Ids of already-uploaded, already-SCANNED attachments. See the header on why that matters. */
  attachedDocumentIds: string[];
}

const EMPTY_COMPOSER_DRAFT: RfqComposerDraft = {
  title: "",
  description: "",
  visibility: "invited_only",
  responseDeadlineLocal: "",
  // Pre-filled because the field is REQUIRED and `USD` is the platform default everywhere else. A required
  // field starting blank is a 422 waiting for a distracted buyer.
  settlementCurrency: "USD",
  desiredDeliveryStartsLocal: "",
  desiredDeliveryEndsLocal: "",
  destinationCountryCode: "",
  destinationLocality: "",
  goodsLines: [],
  serviceLines: [],
  attachedDocumentIds: [],
};

const VISIBILITY_OPTIONS: readonly { readonly value: RfqVisibility; readonly label: string }[] = [
  { value: "invited_only", label: RFQ_VISIBILITY_LABELS.invited_only },
  { value: "matched_providers", label: RFQ_VISIBILITY_LABELS.matched_providers },
];

const PROVIDER_KIND_OPTIONS = PROVIDER_KINDS.map((providerKind) => ({
  value: providerKind,
  label: PROVIDER_KIND_LABELS[providerKind],
}));

/** Local-only row ids. Not sent — the wire identity of a line is its `siblingOrder`. */
let nextLocalIdCounter = 0;
function mintLocalId(prefix: string): string {
  nextLocalIdCounter += 1;
  return `${prefix}-${nextLocalIdCounter}`;
}

export default function RfqComposer() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draft, setDraft] = useState<RfqComposerDraft>(EMPTY_COMPOSER_DRAFT);
  // Lazily minted on first submit and reused across retries — see the hook for why it cannot be a
  // `useState` initializer here.
  const getIdempotencyKey = useAttemptIdempotencyKey();
  const createDraftRfq = useCreateDraftRfq();

  const applyDraftPatch = (draftPatch: Partial<RfqComposerDraft>) => {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  };

  const createResult = createDraftRfq.data;

  // The success screen reads the SERVER'S RFQ, not the submitted draft — so the link it offers points at a
  // row that exists. A screen built from the draft would link to nothing.
  if (createResult !== undefined && createResult.success) {
    return <CreatedDraftPanel rfqId={createResult.data.id} rfqTitle={createResult.data.title} />;
  }

  const buildInput = () => buildCreateDraftRfqInput(draft);
  const input = buildInput();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          New request for quotation
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This saves a draft. Nothing is sent to any provider until you open it.
        </p>
      </header>

      <ComposerStepRail
        steps={COMPOSER_STEPS}
        currentStepIndex={currentStepIndex}
        onStepSelect={setCurrentStepIndex}
      />

      <section aria-label={COMPOSER_STEPS[currentStepIndex]?.label ?? "Step"}>
        {renderStep()}
      </section>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
            className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
          >
            Back
          </button>
        )}
        {currentStepIndex < COMPOSER_STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Next
          </button>
        )}
        {currentStepIndex === COMPOSER_STEPS.length - 1 && (
          <button
            type="button"
            disabled={input === null || createDraftRfq.isPending}
            onClick={() => {
              if (input === null) return;
              createDraftRfq.mutate({ input, idempotencyKey: getIdempotencyKey() });
            }}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {createDraftRfq.isPending ? "Saving…" : "Save as draft"}
          </button>
        )}
      </footer>

      {createResult !== undefined &&
        !createResult.success && (
          // THE SERVER'S OWN MESSAGE. A 422 from a `.strict()` body names the field, and replacing that with
          // "something went wrong" throws away the only useful part of the refusal.
          <p className="text-xs leading-4 text-destructive">{createResult.error.message}</p>
        )}
      {createDraftRfq.isError && (
        <p className="text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing save again is safe — the request carries an
          idempotency key, so a retry cannot create a second draft.
        </p>
      )}
    </div>
  );

  function renderStep() {
    const step = COMPOSER_STEPS[currentStepIndex];
    if (step === undefined) return null;

    // Bound to a local before switching. Switching on `step.id` directly narrows `step` itself to `never` in
    // the default branch, so the exhaustive check cannot reach `.id` to assign it.
    const stepId = step.id;

    switch (stepId) {
      case "basics":
        return (
          <div className="space-y-3">
            <TextField
              label="Title"
              hint="What you are sourcing. Providers see this first."
              value={draft.title}
              onValueChange={(title) => applyDraftPatch({ title })}
              maxLength={200}
            />
            <TextAreaField
              label="Description"
              value={draft.description}
              onValueChange={(description) => applyDraftPatch({ description })}
              rows={4}
              maxLength={10_000}
            />
            <SelectField
              label="Who can see this request"
              hint="This is a disclosure decision, not a reach setting."
              value={draft.visibility}
              options={VISIBILITY_OPTIONS}
              onValueChange={(visibility) => applyDraftPatch({ visibility })}
            />
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Quotes due by</span>
              <span className="block text-[11px] leading-4 text-muted-foreground">
                Your local time. Providers see it in UTC.
              </span>
              <input
                type="datetime-local"
                value={draft.responseDeadlineLocal}
                onChange={(changeEvent) =>
                  applyDraftPatch({ responseDeadlineLocal: changeEvent.target.value })
                }
                className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <TextField
              label="Settlement currency"
              hint="Three letters. Quotes may still be priced in another currency."
              value={draft.settlementCurrency}
              onValueChange={(settlementCurrency) => applyDraftPatch({ settlementCurrency })}
              maxLength={3}
            />
          </div>
        );

      case "delivery":
        return (
          <div className="space-y-3">
            {/* THE PAIRING RULE, said before the inputs rather than after a refusal. */}
            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
              Give both ends of the delivery window or neither. A window with only one end is
              refused — it is not read as &ldquo;any time after&rdquo;.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Delivery from</span>
                <input
                  type="datetime-local"
                  value={draft.desiredDeliveryStartsLocal}
                  onChange={(changeEvent) =>
                    applyDraftPatch({ desiredDeliveryStartsLocal: changeEvent.target.value })
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
                    applyDraftPatch({ desiredDeliveryEndsLocal: changeEvent.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
            {isDeliveryWindowHalfFilled(draft) && (
              <p className="text-xs leading-4 text-amber-900">
                Only one end is filled, so the window will be left off this request entirely.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Destination country code"
                hint="Two letters."
                value={draft.destinationCountryCode}
                onValueChange={(destinationCountryCode) =>
                  applyDraftPatch({ destinationCountryCode })
                }
                maxLength={2}
              />
              <TextField
                label="Destination city"
                value={draft.destinationLocality}
                onValueChange={(destinationLocality) => applyDraftPatch({ destinationLocality })}
                maxLength={150}
              />
            </div>
            {/* Country and city only, and the reason is worth stating where the fields are. */}
            <p className="text-[11px] leading-4 text-muted-foreground">
              A city is enough for a provider to quote a lane. Street lines are never put on a
              request — every invited provider can read this.
            </p>
          </div>
        );

      case "goods":
        return (
          <div className="space-y-3">
            <p className="text-xs leading-4 text-muted-foreground">
              A request can be goods only, services only, or both. Every line needs a quantity and a
              unit.
            </p>
            {draft.goodsLines.map((goodsLine, goodsLineIndex) => (
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
                  onValueChange={(requestedTitle) =>
                    patchGoodsLine(goodsLine.localId, { requestedTitle })
                  }
                  maxLength={200}
                />
                <TextAreaField
                  label="Specification"
                  hint="Drawings, tolerances, finishes — whatever a maker needs to price it."
                  value={goodsLine.requestedSpecificationSnapshot}
                  onValueChange={(requestedSpecificationSnapshot) =>
                    patchGoodsLine(goodsLine.localId, { requestedSpecificationSnapshot })
                  }
                  maxLength={10_000}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <IntegerField
                    label="Quantity"
                    value={goodsLine.quantity}
                    onValueChange={(quantity) => patchGoodsLine(goodsLine.localId, { quantity })}
                  />
                  <TextField
                    label="Unit"
                    hint="e.g. pieces, tons, containers."
                    value={goodsLine.unitLabel}
                    onValueChange={(unitLabel) => patchGoodsLine(goodsLine.localId, { unitLabel })}
                    maxLength={40}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGoodsLine(goodsLine.localId)}
                  className="cursor-pointer text-xs font-medium text-destructive underline"
                >
                  Remove this line
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              onClick={addGoodsLine}
              className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
            >
              Add a goods line
            </button>
          </div>
        );

      case "services":
        return (
          <div className="space-y-3">
            <p className="text-xs leading-4 text-muted-foreground">
              Freight, customs, inspection, insurance and the rest. Each line asks for the fields
              its own kind of provider needs.
            </p>
            {draft.serviceLines.map((serviceLine, serviceLineIndex) => (
              <fieldset
                key={serviceLine.localId}
                className="space-y-3 rounded-xl border border-border px-4 py-3"
              >
                <legend className="px-1 text-xs font-medium text-muted-foreground">
                  Service line {serviceLineIndex + 1}
                </legend>
                {/* ONE CONTROL SETS `providerKind` IN BOTH PLACES. The backend refines that the line's kind
                    and its requirement's kind match, and a second control could disagree with the first. */}
                <SelectField
                  label="Kind of provider"
                  value={serviceLine.providerKind}
                  options={PROVIDER_KIND_OPTIONS}
                  onValueChange={(providerKind) =>
                    patchServiceLine(serviceLine.localId, { providerKind })
                  }
                />
                <TextAreaField
                  label="What you need, in words"
                  hint="Required. For some kinds this is the whole requirement."
                  value={serviceLine.requirementSummary}
                  onValueChange={(requirementSummary) =>
                    patchServiceLine(serviceLine.localId, { requirementSummary })
                  }
                  maxLength={4000}
                />

                {draft.goodsLines.length > 0 && (
                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">
                      Related goods line
                    </span>
                    <span className="block text-[11px] leading-4 text-muted-foreground">
                      Optional. Linking does not make the service a child of the goods — cancelling
                      one does not cancel the other.
                    </span>
                    <select
                      value={serviceLine.linkedGoodsLineIndex ?? ""}
                      onChange={(changeEvent) => {
                        const rawValue = changeEvent.target.value;
                        patchServiceLine(serviceLine.localId, {
                          linkedGoodsLineIndex: rawValue === "" ? null : Number(rawValue),
                        });
                      }}
                      className="mt-1 w-full cursor-pointer rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="">Not related to a specific goods line</option>
                      {draft.goodsLines.map((goodsLine, goodsLineIndex) => (
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
                    patchServiceLine(serviceLine.localId, {
                      requirement: { ...serviceLine.requirement, ...requirementPatch },
                    })
                  }
                />

                <button
                  type="button"
                  onClick={() => removeServiceLine(serviceLine.localId)}
                  className="cursor-pointer text-xs font-medium text-destructive underline"
                >
                  Remove this line
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              onClick={addServiceLine}
              className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
            >
              Add a service line
            </button>
          </div>
        );

      case "documents":
        return (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Attachments</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Drawings, specifications or certificates providers should quote against. Optional —
                every invited provider who can see this RFQ can open them.
              </p>
            </div>
            <TradeDocumentPicker
              selectedDocumentIds={draft.attachedDocumentIds}
              onSelectionChange={(attachedDocumentIds) => applyDraftPatch({ attachedDocumentIds })}
            />
          </div>
        );
      case "review":
        return <ReviewStep draft={draft} input={input} />;

      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  }

  function addGoodsLine() {
    applyDraftPatch({
      goodsLines: [
        ...draft.goodsLines,
        {
          localId: mintLocalId("goods"),
          requestedTitle: "",
          requestedSpecificationSnapshot: "",
          quantity: "",
          unitLabel: "",
        },
      ],
    });
  }

  function patchGoodsLine(localId: string, patch: Partial<GoodsLineDraft>) {
    applyDraftPatch({
      goodsLines: draft.goodsLines.map((goodsLine) =>
        goodsLine.localId === localId ? { ...goodsLine, ...patch } : goodsLine,
      ),
    });
  }

  function removeGoodsLine(localId: string) {
    const removedIndex = draft.goodsLines.findIndex((goodsLine) => goodsLine.localId === localId);
    applyDraftPatch({
      goodsLines: draft.goodsLines.filter((goodsLine) => goodsLine.localId !== localId),
      // EVERY SERVICE LINE'S LINK IS RE-RESOLVED, because the link is an INDEX and removing a goods line
      // shifts every index after it. Leaving them alone would silently re-point a freight line at the wrong
      // goods, which the server has no way to detect — the index it receives would be perfectly valid.
      serviceLines: draft.serviceLines.map((serviceLine) => ({
        ...serviceLine,
        linkedGoodsLineIndex: remapLinkedIndex(serviceLine.linkedGoodsLineIndex, removedIndex),
      })),
    });
  }

  function addServiceLine() {
    applyDraftPatch({
      serviceLines: [
        ...draft.serviceLines,
        {
          localId: mintLocalId("service"),
          providerKind: "freight_forwarder",
          requirementSummary: "",
          linkedGoodsLineIndex: null,
          requirement: { ...EMPTY_RFQ_REQUIREMENT_DRAFT },
        },
      ],
    });
  }

  function patchServiceLine(localId: string, patch: Partial<ServiceLineDraft>) {
    applyDraftPatch({
      serviceLines: draft.serviceLines.map((serviceLine) =>
        serviceLine.localId === localId ? { ...serviceLine, ...patch } : serviceLine,
      ),
    });
  }

  function removeServiceLine(localId: string) {
    applyDraftPatch({
      serviceLines: draft.serviceLines.filter((serviceLine) => serviceLine.localId !== localId),
    });
  }
}

/** A goods line was deleted; move the link with it, or drop it if it pointed at the deleted line. */
function remapLinkedIndex(linkedIndex: number | null, removedIndex: number): number | null {
  if (linkedIndex === null) return null;
  if (linkedIndex === removedIndex) return null;
  return linkedIndex > removedIndex ? linkedIndex - 1 : linkedIndex;
}

function isDeliveryWindowHalfFilled(draft: RfqComposerDraft): boolean {
  const hasStart = draft.desiredDeliveryStartsLocal.trim() !== "";
  const hasEnd = draft.desiredDeliveryEndsLocal.trim() !== "";
  return hasStart !== hasEnd;
}

/**
 * The draft as a request body, or `null` when it cannot legally be one.
 *
 * `null` IS THE SUBMIT GATE. It is not validation in the authorization sense — the server re-checks
 * everything — it is refusal to send a body that is knowably malformed, so the buyer sees which field is
 * missing instead of decoding a 422.
 */
function buildCreateDraftRfqInput(draft: RfqComposerDraft): CreateDraftRfqInput | null {
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
    // A LINE THAT CANNOT BE BUILT FAILS THE WHOLE REQUEST rather than being dropped. Silently omitting an
    // incomplete goods line would create an RFQ missing something the buyer typed and believes they asked
    // for — and they would find out from a quote that does not cover it.
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
      ...(serviceLine.linkedGoodsLineIndex === null
        ? {}
        : { linkedProductLineSiblingOrder: serviceLine.linkedGoodsLineIndex }),
    });
  }

  // AN RFQ WITH NO LINES CANNOT BE OPENED, so there is no point creating one. The server enforces this on
  // `open`, not on `create` — but a draft with nothing in it is a dead end the buyer would only discover
  // later.
  if (productLines.length === 0 && serviceLines.length === 0) return null;

  const description = toOptionalText(draft.description);
  const destinationCountryCode = toOptionalCountryCode(draft.destinationCountryCode);
  const destinationLocality = toOptionalText(draft.destinationLocality);

  // BOTH ENDS OR NEITHER. A half-filled window is dropped entirely rather than sent — the backend refines
  // exactly this pairing, and the form has already warned about it.
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
    // OMITTED WHEN EMPTY rather than sent as `[]`. The backend field is optional, and an empty
    // array and an absent key mean the same thing to it — sending the array anyway would put a
    // key on the wire that says nothing.
    ...(draft.attachedDocumentIds.length === 0 ? {} : { documentIds: draft.attachedDocumentIds }),
  };
}

function ReviewStep({
  draft,
  input,
}: {
  draft: RfqComposerDraft;
  input: CreateDraftRfqInput | null;
}) {
  return (
    <div className="space-y-3">
      {input === null ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Not ready to save yet</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs leading-4 text-amber-900">
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
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              No delivery window on this request.
            </p>
          )}
        </div>
      )}

      {/* THE ATTACHMENT GAP, said out loud rather than hidden behind a control that could not work. */}
      <p className="rounded-lg bg-muted px-3 py-2 text-[11px] leading-4 text-muted-foreground">
        Attachments cannot be added yet. The request format supports them, but there is no route for
        a buyer to upload a file, so any control here would produce an attachment the server
        rejects. Put drawings and specifications into the specification text for now.
      </p>

      <p className="text-[11px] leading-4 text-muted-foreground">
        Saving creates a private draft. Providers see nothing until you open it from the
        request&apos;s own page, and opening runs its own checks.
      </p>
    </div>
  );
}

/** What is stopping the save, in the buyer's words. Derived from the same rules `buildInput` applies. */
function collectMissingRequirements(draft: RfqComposerDraft): string[] {
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

function CreatedDraftPanel({ rfqId, rfqTitle }: { rfqId: string; rfqTitle: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
        ✓
      </span>
      <p className="text-base font-medium text-foreground">Saved as a draft</p>
      {/* SAYS WHAT HAPPENED. No provider has been contacted, nothing is matching, and opening is a separate
          decision with its own validation. */}
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
