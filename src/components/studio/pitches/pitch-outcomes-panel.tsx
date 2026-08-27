// TRANSPORT: client-query — writes `POST /pitches/:pitchId/funding-outcomes` and
// `POST /funding-outcomes/:outcomeId/confirm`.
"use client";

import { useState } from "react";

import { formatOutcomeAmount, OutcomeAttestationNote } from "@/components/pitches/pitch-shared";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useConfirmPitchOutcomeMutation, useRecordPitchOutcomeMutation } from "@/hooks/rnd/pitches";
import { ApiRequestError } from "@/lib/http";
import { newIdempotencyKey } from "@/lib/idempotency";
import type { PitchFundingOutcome } from "@/lib/rnd/pitches.schemas";

/**
 * Record and countersign funding that happened somewhere else.
 *
 * ⚠️ THIS RECORDS A CLAIM. IT DOES NOT MOVE, HOLD OR VERIFY MONEY, and no copy here may
 * suggest otherwise — Qatoto operates no money rail at all. Two people transacted on
 * whatever platform the pitch's funding link points at, and this is them telling Qatoto
 * afterwards. "Reported" and "confirmed" are the only true verbs; collected, paid, held,
 * escrowed and processed are all wrong.
 *
 * IT TAKES TWO SIGNATURES, and the second one is the point. A one-sided row is a founder's
 * own announcement about their own raise; the counterparty confirming is what turns it into
 * a record. `OutcomeAttestationNote` renders that difference, and the server refuses a
 * confirmation from whoever wrote the row.
 *
 * THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT in state and ROTATED after a success. Two
 * genuinely different outcomes sent under one key would come back as a replay of the first —
 * which on this surface means a second funder silently disappearing.
 */
export default function PitchOutcomesPanel({
  pitchId,
  outcomes,
}: {
  readonly pitchId: string;
  readonly outcomes: readonly PitchFundingOutcome[];
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [amountInMajorUnits, setAmountInMajorUnits] = useState("");
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [fundedOnDate, setFundedOnDate] = useState("");
  const [funderNameText, setFunderNameText] = useState("");
  const [funderUserId, setFunderUserId] = useState("");
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const recordMutation = useRecordPitchOutcomeMutation();
  const confirmMutation = useConfirmPitchOutcomeMutation();

  const firstError = [recordMutation.error, confirmMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const amountInCents = toMinorUnits(amountInMajorUnits);
  const isSubmitDisabled =
    recordMutation.isPending ||
    amountInCents === null ||
    fundedOnDate.length === 0 ||
    funderNameText.trim().length === 0;

  return (
    <section className="mt-4 border-t border-border pt-3">
      <h3 className="text-sm font-medium text-foreground">Reported funding</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Money that reached you off Qatoto. Recording it here is a note between you and the funder —{" "}
        <strong>Qatoto did not handle it and does not verify it</strong>.
      </p>

      {outcomes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {outcomes.map((outcome) => (
            <li key={outcome.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {formatOutcomeAmount(outcome.amountInCents, outcome.currencyCode)}
                </span>
                <span className="text-xs text-muted-foreground">{outcome.fundedOnDate}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">from {outcome.funderNameText}</p>
              {outcome.note !== null && (
                <p className="mt-1 text-sm text-foreground">{outcome.note}</p>
              )}
              <p className="mt-1">
                <OutcomeAttestationNote
                  isConfirmed={outcome.isConfirmed}
                  isConfirmable={outcome.isConfirmable}
                  recordedByName={outcome.recordedByName}
                />
              </p>

              {/* The confirm control is offered to everyone and REFUSED BY THE SERVER for the
                  person who wrote the row — `pitch_funding_outcome_two_parties_ck` backs the
                  same rule in the database. Hiding it client-side would be a guess about who
                  is looking; letting the server answer is the check that actually holds. */}
              {!outcome.isConfirmed && outcome.isConfirmable && (
                <button
                  type="button"
                  disabled={confirmMutation.isPending}
                  onClick={() => {
                    confirmMutation.mutate(outcome.id);
                  }}
                  className="mt-2 cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-foreground disabled:opacity-40"
                >
                  {confirmMutation.isPending ? "Confirming…" : "Confirm this happened"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isFormOpen && (
        <button
          type="button"
          onClick={() => {
            setIsFormOpen(true);
          }}
          className="mt-3 cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-foreground"
        >
          Record funding
        </button>
      )}

      {isFormOpen && (
        <form
          className="mt-3 flex flex-col gap-3 rounded-xl bg-secondary/40 p-3"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            if (amountInCents === null) return;
            recordMutation.mutate(
              {
                pitchId,
                input: {
                  amountInCents,
                  currencyCode: currencyCode.trim().toUpperCase(),
                  fundedOnDate,
                  funderNameText: funderNameText.trim(),
                  ...(funderUserId.trim().length === 0
                    ? {}
                    : { funderUserId: funderUserId.trim() }),
                  ...(note.trim().length === 0 ? {} : { note: note.trim() }),
                  idempotencyKey,
                },
              },
              {
                // A NEW KEY FOR THE NEXT RECORD. Reusing it would make a different funder
                // look like a retry of this one and return the first row instead.
                onSuccess: () => {
                  setIdempotencyKey(newIdempotencyKey());
                  setIsFormOpen(false);
                  setAmountInMajorUnits("");
                  setFunderNameText("");
                  setFunderUserId("");
                  setNote("");
                },
              },
            );
          }}
        >
          <div className="flex flex-wrap gap-3">
            <div className="grow">
              <label className={LABEL_CLASS} htmlFor={`outcome-amount-${pitchId}`}>
                Amount
              </label>
              <input
                id={`outcome-amount-${pitchId}`}
                className={INPUT_CLASS}
                inputMode="decimal"
                value={amountInMajorUnits}
                placeholder="25000"
                onChange={(changeEvent) => {
                  setAmountInMajorUnits(changeEvent.target.value);
                }}
              />
            </div>
            <div className="w-28">
              <label className={LABEL_CLASS} htmlFor={`outcome-currency-${pitchId}`}>
                Currency
              </label>
              <input
                id={`outcome-currency-${pitchId}`}
                className={INPUT_CLASS}
                maxLength={3}
                value={currencyCode}
                onChange={(changeEvent) => {
                  setCurrencyCode(changeEvent.target.value);
                }}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor={`outcome-date-${pitchId}`}>
              Date it arrived
            </label>
            <input
              id={`outcome-date-${pitchId}`}
              type="date"
              className={INPUT_CLASS}
              value={fundedOnDate}
              onChange={(changeEvent) => {
                setFundedOnDate(changeEvent.target.value);
              }}
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor={`outcome-funder-${pitchId}`}>
              Who funded it
            </label>
            <input
              id={`outcome-funder-${pitchId}`}
              className={INPUT_CLASS}
              value={funderNameText}
              onChange={(changeEvent) => {
                setFunderNameText(changeEvent.target.value);
              }}
            />
            {/* THIS COPY WAS WRONG UNTIL THE LIVE RUN CAUGHT IT. "A name is enough" is true
                for storing the record and false for everything the founder actually wants:
                without a Qatoto account there is no second party, so nobody can confirm it and
                it never reaches the public page. Say so here, where the choice is made. */}
            <p className="mt-1 text-xs text-muted-foreground">
              A name alone keeps this private — nobody can confirm it. Add their Qatoto account
              below if you want it shown on the pitch.
            </p>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor={`outcome-funder-account-${pitchId}`}>
              Funder&apos;s Qatoto account ID (optional)
            </label>
            <input
              id={`outcome-funder-account-${pitchId}`}
              className={INPUT_CLASS}
              value={funderUserId}
              onChange={(changeEvent) => {
                setFunderUserId(changeEvent.target.value);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Only they can confirm the record, and only a confirmed record appears publicly.
            </p>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor={`outcome-note-${pitchId}`}>
              Note (optional)
            </label>
            <input
              id={`outcome-note-${pitchId}`}
              className={INPUT_CLASS}
              value={note}
              onChange={(changeEvent) => {
                setNote(changeEvent.target.value);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              {recordMutation.isPending ? "Recording…" : "Record it"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
              }}
              className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs text-foreground"
            >
              Cancel
            </button>
            <span className="text-xs text-muted-foreground">
              The other party has to confirm before anyone else sees it.
            </span>
          </div>
        </form>
      )}

      {firstError !== undefined && (
        <p className="mt-2 text-xs leading-4 text-destructive">{firstError.apiError.message}</p>
      )}
    </section>
  );
}

/**
 * Major units as typed → the decimal string of MINOR units the wire takes.
 *
 * STRING ARITHMETIC, NOT `* 100`. Floating point turns `25000.10` into `2500009.999…` and
 * then into a funding figure that is a cent short — the exact class of bug the `bigint`
 * column and the decimal-string wire format exist to prevent. Returns `null` for anything
 * that is not a positive amount, which is what disables the submit button.
 */
function toMinorUnits(rawAmount: string): string | null {
  const trimmed = rawAmount.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [wholePart = "0", fractionPart = ""] = trimmed.split(".");
  const paddedFraction = fractionPart.padEnd(2, "0");
  const minorUnits = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  return minorUnits === "0" || minorUnits === "00" || minorUnits === "000" ? null : minorUnits;
}
