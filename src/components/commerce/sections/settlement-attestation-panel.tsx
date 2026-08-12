// TRANSPORT: client-query — reads and writes /commerce/orders/:orderId/settlement-attestations.
"use client";

// RECORDING A WIRE THAT HAPPENED SOMEWHERE ELSE.
//
// THIS FORM MOVES NO MONEY. It does not charge, transfer, or release anything — the two parties
// paid each other through their own banks, and this tells the platform that they did. Every string
// below is written so a seller cannot mistake it for a payment control.
//
// ONLY ON THE `direct_offline` RAIL. On a processor or escrow order the money is observed, so a
// self-report would be a claim competing with evidence; the server refuses those with a 409 and
// this panel renders the reason instead of a form.
//
// BOTH PARTIES' CLAIMS ARE SHOWN, AND A DISAGREEMENT IS THE POINT. The buyer records what they
// sent, the seller what they received, and where the two differ that difference is the most useful
// thing on the page. Nothing here reconciles them — the platform has no basis to decide which
// party is right, and picking one would be inventing a fact.
//
// THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT, in component state, and rotated only after a
// confirmed success. A key regenerated per render would defeat the uniqueness refusal that exists
// to stop a second, different claim overwriting the first.

import { useState } from "react";

import {
  useOrderSettlementAttestationsQuery,
  useRecordSettlementAttestation,
} from "@/hooks/store/attestations";
import type {
  AttestationKind,
  SettlementAttestation,
  SettlementAttestationList,
} from "@/lib/store/attestations.schemas";
import { ATTESTATION_KIND_LABELS } from "@/lib/store/attestations.schemas";
import { formatCentsLabel, formatIsoInstantLabel } from "@/lib/store/format";

export default function SettlementAttestationPanel({
  orderId,
  viewerAttestationKind,
}: {
  orderId: string;
  viewerAttestationKind: AttestationKind;
}) {
  const attestationsQuery = useOrderSettlementAttestationsQuery(orderId);

  if (attestationsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading payment records…</p>;
  }

  const result = attestationsQuery.data;
  if (attestationsQuery.isError || result === undefined || !result.success) {
    const message =
      result !== undefined && !result.success
        ? result.error.message
        : "Couldn't load this order's payment records.";
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }

  return (
    <AttestationBody
      orderId={orderId}
      list={result.data}
      viewerAttestationKind={viewerAttestationKind}
    />
  );
}

function AttestationBody({
  orderId,
  list,
  viewerAttestationKind,
}: {
  orderId: string;
  list: SettlementAttestationList;
  viewerAttestationKind: AttestationKind;
}) {
  const isViewerTheSeller = viewerAttestationKind === "payment_received";
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Payment
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {list.isAttestable
            ? `You and the ${isViewerTheSeller ? "buyer" : "seller"} settle this order directly. Qatoto is not part of the transfer and can only record what each of you says happened.`
            : "This order settles through a payment provider, so the platform records the movement itself. There is nothing for you to enter."}
        </p>
      </div>

      {list.items.length > 0 ? (
        <ul className="space-y-2">
          {list.items.map((attestation) => (
            <AttestationRow key={attestation.id} attestation={attestation} />
          ))}
        </ul>
      ) : null}

      {/* Shown only when the two parties named different amounts. It is not an error and nothing
          is blocked by it — it is a fact each side should see before they chase the other. */}
      {hasAmountDisagreement(list.items) ? (
        <div className="rounded-xl border border-border bg-muted px-4 py-3">
          <p className="text-sm font-medium text-foreground">The two records do not match</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            You and the {isViewerTheSeller ? "buyer" : "seller"} have recorded different amounts.
            Qatoto did not see the transfer and cannot say which is right — worth settling between
            yourselves before this order moves on.
          </p>
        </div>
      ) : null}

      {list.isAttestable ? (
        <AttestationForm
          orderId={orderId}
          list={list}
          viewerAttestationKind={viewerAttestationKind}
        />
      ) : null}
    </div>
  );
}

function hasAmountDisagreement(items: readonly SettlementAttestation[]): boolean {
  const sent = items.find((item) => item.attestationKind === "payment_sent");
  const received = items.find((item) => item.attestationKind === "payment_received");
  return (
    sent !== undefined && received !== undefined && sent.amountInCents !== received.amountInCents
  );
}

function AttestationRow({ attestation }: { attestation: SettlementAttestation }) {
  return (
    <li className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {ATTESTATION_KIND_LABELS[attestation.attestationKind]}
        </p>
        <p className="text-sm font-medium text-foreground">
          {formatCentsLabel(attestation.amountInCents, attestation.currency)}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {attestation.attestedByLegalNameSnapshot} · {formatIsoInstantLabel(attestation.occurredAt)}
        {/* Free text the parties reconcile against — a wire reference or an L/C number. */}
        {attestation.referenceNote === null ? "" : ` · ${attestation.referenceNote}`}
      </p>
    </li>
  );
}

/** Today, as `yyyy-mm-dd`, for the date input's max. Never a stand-in for a value the user owns. */
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function AttestationForm({
  orderId,
  list,
  viewerAttestationKind,
}: {
  orderId: string;
  list: SettlementAttestationList;
  viewerAttestationKind: AttestationKind;
}) {
  const isViewerTheSeller = viewerAttestationKind === "payment_received";
  const [amountText, setAmountText] = useState("");
  const [occurredOnDate, setOccurredOnDate] = useState("");
  const [referenceNote, setReferenceNote] = useState("");
  /** Minted once per attempt — see the header. Rotated only after a confirmed success. */
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const recordAttestation = useRecordSettlementAttestation();
  const result = recordAttestation.data;

  const amountInCents = parseAmountToCents(amountText);
  const isSubmittable =
    amountInCents !== null &&
    amountInCents > 0 &&
    occurredOnDate !== "" &&
    !recordAttestation.isPending;

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (amountInCents === null || occurredOnDate === "") return;

    recordAttestation.mutate(
      {
        orderId,
        idempotencyKey,
        input: {
          amountInCents,
          // Midday UTC rather than midnight: a date entered in a timezone behind UTC would
          // otherwise land on the previous day, and the server refuses a future date.
          occurredAt: new Date(`${occurredOnDate}T12:00:00.000Z`).toISOString(),
          ...(referenceNote.trim() === "" ? {} : { referenceNote: referenceNote.trim() }),
        },
      },
      {
        onSuccess: (mutationResult) => {
          if (!mutationResult.success) return;
          setIdempotencyKey(crypto.randomUUID());
          setAmountText("");
          setOccurredOnDate("");
          setReferenceNote("");
        },
      },
    );
  }

  /**
   * THIS VIEWER'S OWN CLAIM, not either party's. Checking `payment_received` unconditionally —
   * which this did first — showed a buyer the seller's copy, and let a buyer who had already
   * recorded their transfer submit a second one straight into a 409.
   */
  const hasOwnRecord = list.items.some((item) => item.attestationKind === viewerAttestationKind);

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border px-4 py-3">
      <fieldset disabled={recordAttestation.isPending}>
        <legend className="text-sm font-medium text-foreground">
          {hasOwnRecord
            ? "You have recorded this payment"
            : isViewerTheSeller
              ? "Record a payment you received"
              : "Record a payment you sent"}
        </legend>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          This records what you say {isViewerTheSeller ? "arrived" : "left"}. It does not move
          money, and it is not verified by Qatoto. Recorded payments cannot be edited afterwards.
        </p>

        {hasOwnRecord ? null : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Amount {isViewerTheSeller ? "received" : "sent"} ({list.currency})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                onChange={(changeEvent) => setAmountText(changeEvent.target.value)}
                placeholder="0.00"
                className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Date it arrived</span>
              <input
                type="date"
                value={occurredOnDate}
                max={todayIsoDate()}
                onChange={(changeEvent) => setOccurredOnDate(changeEvent.target.value)}
                className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Reference (optional)</span>
              <input
                type="text"
                value={referenceNote}
                onChange={(changeEvent) => setReferenceNote(changeEvent.target.value)}
                placeholder="Wire reference or L/C number"
                className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground"
              />
            </label>
          </div>
        )}

        {hasOwnRecord ? null : (
          <button
            type="submit"
            disabled={!isSubmittable}
            className="mt-3 cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {recordAttestation.isPending ? "Recording…" : "Record payment"}
          </button>
        )}
      </fieldset>

      {/* The backend's own sentence, verbatim. Both 409s here are findings rather than retries:
          the wrong rail, or a claim already recorded. Paraphrasing either loses the half that
          says what to do instead. */}
      {result !== undefined && !result.success ? (
        <p className="mt-2 text-xs leading-4 text-[#BA1A1A]">{result.error.message}</p>
      ) : null}
    </form>
  );
}

/**
 * "1,234.56" → 123456 cents, or `null` when it is not a number.
 *
 * PARSED, NOT ROUNDED FROM A FLOAT MULTIPLICATION. `Math.round(1234.56 * 100)` is the classic way
 * to lose a cent, and this is a figure a seller reconciles against their bank statement.
 */
function parseAmountToCents(amountText: string): number | null {
  const cleaned = amountText.replaceAll(",", "").trim();
  if (cleaned === "" || !/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [wholeUnits, fractionalUnits = ""] = cleaned.split(".");
  const paddedFraction = fractionalUnits.padEnd(2, "0");
  return Number(wholeUnits) * 100 + Number(paddedFraction);
}
