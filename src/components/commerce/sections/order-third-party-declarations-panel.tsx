// TRANSPORT: client-query — reads and writes `/commerce/orders/:orderId/declarations`.
"use client";

// Cover and test reports a party RECORDS against an order: cargo cover in transit, cover for goods
// in storage, or a laboratory test report.
//
// ⚠️ A RECORD OF WHAT A PARTY SAYS, AND NOTHING ELSE. Qatoto sees no policy, no storage contract and
// no test, and checks none of what is typed here. So every row says WHO recorded it, nothing here
// says "insured", "certified" or "verified" as a claim, and a test report carries no pass/fail —
// the laboratory's result belongs to the laboratory's document. The non-liability notice is the
// SERVER's text, read off the list response, so what the author ticks is what was stored.
//
// BOTH PARTIES MAY RECORD, regardless of the Incoterm. An Incoterm decides who is obliged to insure,
// not who may; a buyer on CIF terms commonly buys top-up cover.
//
// NOTHING IS OPTIMISTIC, the idempotency key is minted once per attempt and rotated on any edit or
// after a confirmed success, and every refusal is shown in the backend's own words.

import { useState } from "react";

import TradeDocumentPicker from "@/components/commerce/trade-document-picker";
import {
  useOrderDeclarationsQuery,
  useRecordOrderDeclaration,
  useWithdrawOrderDeclaration,
} from "@/hooks/store/declarations";
import { useOrderFulfillmentQuery } from "@/hooks/store/orders";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { API_BASE_URL } from "@/lib/api";
import {
  DECLARATION_KIND_LABELS,
  DECLARATION_KINDS,
  ORDER_PARTY_SIDE_LABELS,
  type DeclarationKind,
  type OrderDeclaration,
  type OrderDeclarationList,
  type RecordDeclarationInput,
} from "@/lib/store/declarations.schemas";
import {
  formatCentsLabel,
  formatIsoDateLabel,
  formatIsoInstantLabel,
  parseAmountToCents,
} from "@/lib/store/format";
import { FREIGHT_TRANSPORT_MODE_LABELS } from "@/lib/store/labels";

type DeclarationsViewState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; list: OrderDeclarationList };

export default function OrderThirdPartyDeclarationsPanel({ orderId }: { orderId: string }) {
  const declarationsQuery = useOrderDeclarationsQuery(orderId);
  const viewState = deriveViewState(declarationsQuery.isPending, declarationsQuery.data);

  switch (viewState.status) {
    case "loading":
      return (
        <p className="text-xs leading-4 text-muted-foreground">
          Loading recorded cover and reports…
        </p>
      );
    case "unavailable":
      return <p className="text-xs leading-4 text-destructive">{viewState.message}</p>;
    case "ready":
      return <DeclarationsBody orderId={orderId} list={viewState.list} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function deriveViewState(
  isPending: boolean,
  result: ReturnType<typeof useOrderDeclarationsQuery>["data"],
): DeclarationsViewState {
  if (isPending || result === undefined) return { status: "loading" };
  if (!result.success) return { status: "unavailable", message: result.error.message };
  return { status: "ready", list: result.data };
}

function DeclarationsBody({ orderId, list }: { orderId: string; list: OrderDeclarationList }) {
  const withdrawDeclaration = useWithdrawOrderDeclaration();
  const withdrawResult = withdrawDeclaration.data;

  return (
    <section
      aria-labelledby="order-declarations-heading"
      className="rounded-xl border border-border px-4 py-3"
    >
      <h3 id="order-declarations-heading" className="text-sm leading-5 font-medium text-foreground">
        Recorded cover and test reports
      </h3>
      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
        What either party says it arranged with an insurer or a laboratory for this order. Each
        entry is that party&apos;s own record. Qatoto has not seen or checked any of it.
      </p>

      {list.items.length > 0 && (
        <ul className="mt-2 divide-y divide-border">
          {list.items.map((declaration) => (
            <li key={declaration.id} className="py-3">
              <DeclarationRow
                declaration={declaration}
                isWithdrawing={
                  withdrawDeclaration.isPending &&
                  withdrawDeclaration.variables?.declarationId === declaration.id
                }
                onWithdraw={() =>
                  withdrawDeclaration.mutate({ orderId, declarationId: declaration.id })
                }
              />
            </li>
          ))}
        </ul>
      )}
      {withdrawResult !== undefined && !withdrawResult.success && (
        <p className="mt-2 text-xs leading-4 text-destructive">{withdrawResult.error.message}</p>
      )}
      {withdrawDeclaration.isError && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing withdraw again is safe — a second press changes
          nothing.
        </p>
      )}

      {list.isDeclarable ? (
        <DeclarationForm orderId={orderId} list={list} />
      ) : (
        <p className="mt-3 text-xs leading-4 text-muted-foreground">
          This order was cancelled, so nothing new can be recorded against it.
        </p>
      )}
    </section>
  );
}

function DeclarationRow({
  declaration,
  isWithdrawing,
  onWithdraw,
}: {
  declaration: OrderDeclaration;
  isWithdrawing: boolean;
  onWithdraw: () => void;
}) {
  const isWithdrawn = declaration.withdrawnAt !== null;
  const validityLabel = formatValidityLabel(declaration.validFrom, declaration.validUntil);
  const kindLabel = `${DECLARATION_KIND_LABELS[declaration.kind]}${isWithdrawn ? " · Withdrawn" : ""}`;

  return (
    <div className={isWithdrawn ? "space-y-1 opacity-60" : "space-y-1"}>
      <p className="text-xs leading-4 font-medium text-muted-foreground">{kindLabel}</p>
      <p className="text-sm leading-5 font-medium text-foreground">
        {declaration.issuer} · {declaration.reference}
      </p>
      <DeclarationDetailsList declaration={declaration} validityLabel={validityLabel} />
      {declaration.evidenceDocumentId !== null && !isWithdrawn && (
        <a
          href={`${API_BASE_URL}/commerce/documents/${encodeURIComponent(declaration.evidenceDocumentId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs leading-4 font-medium text-primary-imprint underline underline-offset-2 hover:text-foreground"
        >
          Open the attached document
        </a>
      )}
      <DeclarationProvenance declaration={declaration} />
      {declaration.isOwnDeclaration && !isWithdrawn && (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={isWithdrawing}
          className="cursor-pointer text-xs leading-4 font-medium text-destructive underline disabled:opacity-40"
        >
          {isWithdrawing ? "Withdrawing…" : "Withdraw this record"}
        </button>
      )}
    </div>
  );
}

function DeclarationDetailsList({
  declaration,
  validityLabel,
}: {
  readonly declaration: OrderDeclaration;
  readonly validityLabel: string | null;
}) {
  return (
    <dl className="grid gap-x-4 gap-y-0.5 text-xs leading-4 text-muted-foreground sm:grid-cols-[auto_1fr]">
      {declaration.standard !== null && (
        <DetailPair term="Standard" description={declaration.standard} />
      )}
      {declaration.coverageClass !== null && (
        <DetailPair term="Cover class" description={declaration.coverageClass} />
      )}
      {declaration.coverage !== null && (
        <DetailPair
          term="Amount stated"
          description={formatCentsLabel(
            declaration.coverage.amountInCents,
            declaration.coverage.currency,
          )}
        />
      )}
      {validityLabel !== null && <DetailPair term="Valid" description={validityLabel} />}
      {declaration.issuedOn !== null && (
        <DetailPair term="Issued" description={formatIsoDateLabel(declaration.issuedOn)} />
      )}
      {declaration.shipmentLegId !== null && (
        <DetailPair term="Covers" description="One leg of a shipment on this order" />
      )}
      {declaration.note !== null && <DetailPair term="Note" description={declaration.note} />}
    </dl>
  );
}

function DeclarationProvenance({ declaration }: { readonly declaration: OrderDeclaration }) {
  const withdrawnSuffix =
    declaration.withdrawnAt !== null
      ? `, withdrawn on ${formatIsoInstantLabel(declaration.withdrawnAt)}`
      : "";

  return (
    <p className="text-xs leading-4 text-muted-foreground">
      Recorded by the {ORDER_PARTY_SIDE_LABELS[declaration.declaredBySide]} (
      {declaration.declaredByLegalNameSnapshot}) on {formatIsoInstantLabel(declaration.createdAt)}
      {withdrawnSuffix}. Not checked by Qatoto.
    </p>
  );
}

function DetailPair({ term, description }: { term: string; description: string }) {
  return (
    <>
      <dt>{term}</dt>
      <dd className="text-foreground">{description}</dd>
    </>
  );
}

/** Either end may be absent. Nothing stated renders no row, never "Unknown". */
function formatValidityLabel(validFrom: string | null, validUntil: string | null): string | null {
  if (validFrom !== null && validUntil !== null) {
    return `${formatIsoDateLabel(validFrom)} to ${formatIsoDateLabel(validUntil)}`;
  }
  if (validFrom !== null) return `From ${formatIsoDateLabel(validFrom)}`;
  if (validUntil !== null) return `Until ${formatIsoDateLabel(validUntil)}`;
  return null;
}

// --- The form ---------------------------------------------------------------

interface DeclarationFormValues {
  kind: DeclarationKind;
  issuer: string;
  reference: string;
  coverageClass: string;
  standard: string;
  amountText: string;
  currency: string;
  validFrom: string;
  validUntil: string;
  issuedOn: string;
  shipmentLegId: string;
  evidenceDocumentIds: readonly string[];
  note: string;
  hasAcknowledgedNotice: boolean;
}

const EMPTY_FORM_VALUES: DeclarationFormValues = {
  kind: "transit_cover",
  issuer: "",
  reference: "",
  coverageClass: "",
  standard: "",
  amountText: "",
  currency: "",
  validFrom: "",
  validUntil: "",
  issuedOn: "",
  shipmentLegId: "",
  evidenceDocumentIds: [],
  note: "",
  hasAcknowledgedNotice: false,
};

const FIELD_CLASS =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground";

/** Narrows a `<select>` value against the tuple it was rendered from. Not an `as`. */
function narrowToDeclarationKind(value: string): DeclarationKind | undefined {
  return DECLARATION_KINDS.find((declarationKind) => declarationKind === value);
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * The body, or the reason it cannot be built yet. One arm per kind — a field from another arm is a
 * 422 from the backend's `.strict()` union, so each arm sends only its own.
 */
function buildDeclarationInput(
  values: DeclarationFormValues,
  disclaimerVersion: string,
): { input: RecordDeclarationInput } | { problem: string } {
  const issuer = optionalText(values.issuer);
  const reference = optionalText(values.reference);
  if (issuer === undefined) return { problem: "Name the insurer or laboratory." };
  if (reference === undefined) return { problem: "Add the policy or report number." };
  if (values.validFrom !== "" && values.validUntil !== "" && values.validUntil < values.validFrom) {
    return { problem: "The end date cannot be before the start date." };
  }
  if (!values.hasAcknowledgedNotice) return { problem: "Read and tick the notice above." };

  const evidenceDocumentId = values.evidenceDocumentIds[0];
  const note = optionalText(values.note);
  const common = {
    issuer,
    reference,
    acknowledgedDisclaimerVersion: disclaimerVersion,
    ...(values.validFrom === "" ? {} : { validFrom: values.validFrom }),
    ...(values.validUntil === "" ? {} : { validUntil: values.validUntil }),
    ...(evidenceDocumentId === undefined ? {} : { evidenceDocumentId }),
    ...(note === undefined ? {} : { note }),
  };

  switch (values.kind) {
    case "transit_cover":
    case "storage_cover": {
      const coverage = buildCoverage(values.amountText, values.currency);
      if ("problem" in coverage) return coverage;
      const coverageClass = optionalText(values.coverageClass);
      const coverFields = {
        ...common,
        ...(coverageClass === undefined ? {} : { coverageClass }),
        ...(coverage.value === null ? {} : { coverage: coverage.value }),
      };
      if (values.kind === "storage_cover") {
        return { input: { kind: "storage_cover", ...coverFields } };
      }
      return {
        input: {
          kind: "transit_cover",
          ...coverFields,
          ...(values.shipmentLegId === "" ? {} : { shipmentLegId: values.shipmentLegId }),
        },
      };
    }
    case "test_report": {
      const standard = optionalText(values.standard);
      if (standard === undefined)
        return { problem: "Name the standard the product was tested to." };
      return {
        input: {
          kind: "test_report",
          ...common,
          standard,
          ...(values.issuedOn === "" ? {} : { issuedOn: values.issuedOn }),
        },
      };
    }
    default: {
      const exhaustiveCheck: never = values.kind;
      return exhaustiveCheck;
    }
  }
}

/** Both or neither — half an amount is a question nobody can answer. */
function buildCoverage(
  amountText: string,
  currencyText: string,
): { value: { amountInCents: number; currency: string } | null } | { problem: string } {
  const hasAmount = amountText.trim() !== "";
  const currency = currencyText.trim().toUpperCase();
  if (!hasAmount && currency === "") return { value: null };
  const amountInCents = parseAmountToCents(amountText);
  if (amountInCents === null || amountInCents <= 0) {
    return { problem: "Enter the amount as a number, like 250000 or 250000.50." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) return { problem: "Add a three-letter currency, like USD." };
  return { value: { amountInCents, currency } };
}

function DeclarationForm({ orderId, list }: { orderId: string; list: OrderDeclarationList }) {
  const [formValues, setFormValues] = useState<DeclarationFormValues>(EMPTY_FORM_VALUES);
  const recordDeclaration = useRecordOrderDeclaration();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const fulfillmentQuery = useOrderFulfillmentQuery(orderId);
  const recordResult = recordDeclaration.data;

  const fulfillmentResult = fulfillmentQuery.data;
  const shipmentLegs =
    fulfillmentResult !== undefined && fulfillmentResult.success
      ? fulfillmentResult.data.shipments.flatMap((shipment) => shipment.legs)
      : [];

  const buildOutcome = buildDeclarationInput(formValues, list.disclaimer.version);
  const isCoverKind = formValues.kind !== "test_report";
  const noticeText = isCoverKind ? list.disclaimer.coverText : list.disclaimer.testReportText;

  /**
   * ANY EDIT IS A NEW ATTEMPT. The server fingerprints the body against the key, so reusing one
   * after an edit would answer a correction with a conflict. Never rotated while a request is in
   * flight — the fieldset is disabled then anyway.
   */
  function updateFormValues(patch: Partial<DeclarationFormValues>) {
    resetIdempotencyKey();
    setFormValues((previousValues) => ({ ...previousValues, ...patch }));
  }

  function handleKindChange(nextValue: string) {
    const nextKind = narrowToDeclarationKind(nextValue);
    if (nextKind === undefined) return;
    // A different kind shows a different notice, so the tick it earned does not carry over.
    updateFormValues({ kind: nextKind, hasAcknowledgedNotice: false });
  }

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!("input" in buildOutcome)) return;
    recordDeclaration.mutate(
      { orderId, idempotencyKey: getIdempotencyKey(), input: buildOutcome.input },
      {
        onSuccess: (mutationResult) => {
          if (!mutationResult.success) return;
          resetIdempotencyKey();
          setFormValues(EMPTY_FORM_VALUES);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t border-border pt-3">
      <fieldset disabled={recordDeclaration.isPending} className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          Record cover or a test report
        </legend>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">What you are recording</span>
          <select
            value={formValues.kind}
            onChange={(changeEvent) => handleKindChange(changeEvent.target.value)}
            className={FIELD_CLASS}
          >
            {DECLARATION_KINDS.map((declarationKind) => (
              <option key={declarationKind} value={declarationKind}>
                {DECLARATION_KIND_LABELS[declarationKind]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label={isCoverKind ? "Insurer" : "Laboratory"}
            value={formValues.issuer}
            maxLength={200}
            onValueChange={(issuer) => updateFormValues({ issuer })}
          />
          <TextInput
            label={isCoverKind ? "Policy or certificate number" : "Report number"}
            value={formValues.reference}
            maxLength={100}
            onValueChange={(reference) => updateFormValues({ reference })}
          />
        </div>

        <KindSpecificFields
          formValues={formValues}
          shipmentLegs={shipmentLegs}
          onPatch={updateFormValues}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <DateInput
            label="Valid from (optional)"
            value={formValues.validFrom}
            onValueChange={(validFrom) => updateFormValues({ validFrom })}
          />
          <DateInput
            label="Valid until (optional)"
            value={formValues.validUntil}
            onValueChange={(validUntil) => updateFormValues({ validUntil })}
          />
        </div>

        <div className="space-y-1">
          <span className="block text-xs text-muted-foreground">
            The policy, certificate or report (optional). The other party to this order will be able
            to open it.
          </span>
          {/* ONE DOCUMENT. The picker allows several; the most recent pick wins. */}
          <TradeDocumentPicker
            selectedDocumentIds={formValues.evidenceDocumentIds}
            onSelectionChange={(documentIds) =>
              updateFormValues({ evidenceDocumentIds: documentIds.slice(-1) })
            }
            isDisabled={recordDeclaration.isPending}
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Note (optional)</span>
          <textarea
            value={formValues.note}
            maxLength={1000}
            rows={2}
            onChange={(changeEvent) => updateFormValues({ note: changeEvent.target.value })}
            className={FIELD_CLASS}
          />
        </label>

        {/* THE SERVER'S TEXT, IN FULL. The tick sends the version it was shown with. */}
        <div className="rounded-lg bg-secondary px-3 py-2">
          <p className="text-xs leading-4 text-secondary-foreground">{noticeText}</p>
          <label className="mt-2 flex items-start gap-2 text-xs leading-4 text-secondary-foreground">
            <input
              type="checkbox"
              checked={formValues.hasAcknowledgedNotice}
              onChange={(changeEvent) =>
                updateFormValues({ hasAcknowledgedNotice: changeEvent.target.checked })
              }
              className="mt-0.5"
            />
            <span>I have read this notice. What I record here is my own statement.</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!("input" in buildOutcome) || recordDeclaration.isPending}
          className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {recordDeclaration.isPending ? "Recording…" : "Record it"}
        </button>
        {"problem" in buildOutcome && (
          <p className="text-xs leading-4 text-muted-foreground">{buildOutcome.problem}</p>
        )}
      </fieldset>
      {recordResult !== undefined && !recordResult.success && (
        <p className="mt-2 text-xs leading-4 text-destructive">{recordResult.error.message}</p>
      )}
      {recordDeclaration.isError && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing record again is safe — the request carries an
          idempotency key, so a retry cannot record it twice.
        </p>
      )}
    </form>
  );
}

function KindSpecificFields({
  formValues,
  shipmentLegs,
  onPatch,
}: {
  formValues: DeclarationFormValues;
  shipmentLegs: readonly {
    id: string;
    sequence: number;
    mode: keyof typeof FREIGHT_TRANSPORT_MODE_LABELS;
  }[];
  onPatch: (patch: Partial<DeclarationFormValues>) => void;
}) {
  switch (formValues.kind) {
    case "transit_cover":
    case "storage_cover":
      return (
        <>
          <TextInput
            label="Cover class (optional)"
            hint={
              formValues.kind === "transit_cover"
                ? "As the policy names it, e.g. Institute Cargo Clauses (A)."
                : "As the policy names it, e.g. stock in storage, or stock throughput."
            }
            value={formValues.coverageClass}
            maxLength={80}
            onValueChange={(coverageClass) => onPatch({ coverageClass })}
          />
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <TextInput
              label="Amount covered (optional)"
              value={formValues.amountText}
              maxLength={20}
              inputMode="decimal"
              onValueChange={(amountText) => onPatch({ amountText })}
            />
            <TextInput
              label="Currency"
              value={formValues.currency}
              maxLength={3}
              onValueChange={(currency) => onPatch({ currency })}
            />
          </div>
          {formValues.kind === "transit_cover" && shipmentLegs.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Shipment leg (optional)</span>
              <select
                value={formValues.shipmentLegId}
                onChange={(changeEvent) => onPatch({ shipmentLegId: changeEvent.target.value })}
                className={FIELD_CLASS}
              >
                <option value="">The whole order</option>
                {shipmentLegs.map((shipmentLeg) => (
                  <option key={shipmentLeg.id} value={shipmentLeg.id}>
                    Leg {shipmentLeg.sequence} · {FREIGHT_TRANSPORT_MODE_LABELS[shipmentLeg.mode]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      );
    case "test_report":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Standard tested to"
            hint="e.g. EN 71-3, IEC 62368-1."
            value={formValues.standard}
            maxLength={200}
            onValueChange={(standard) => onPatch({ standard })}
          />
          <DateInput
            label="Report date (optional)"
            value={formValues.issuedOn}
            onValueChange={(issuedOn) => onPatch({ issuedOn })}
          />
        </div>
      );
    default: {
      const exhaustiveCheck: never = formValues.kind;
      return exhaustiveCheck;
    }
  }
}

function TextInput({
  label,
  hint,
  value,
  maxLength,
  inputMode,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: string;
  maxLength: number;
  inputMode?: "decimal";
  onValueChange: (nextValue: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(changeEvent) => onValueChange(changeEvent.target.value)}
        className={FIELD_CLASS}
      />
      {hint !== undefined && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function DateInput({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: string;
  onValueChange: (nextValue: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(changeEvent) => onValueChange(changeEvent.target.value)}
        className={FIELD_CLASS}
      />
    </label>
  );
}
