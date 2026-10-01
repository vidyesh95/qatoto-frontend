"use client";

import { useState } from "react";
import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import type { ApiError } from "@/lib/http";
import { formatMoneyFromCents, shortenHashForDisplay } from "@/lib/rnd/format";
import type { ClaimEvidence } from "@/lib/rnd/proof-of-effort.schemas";

export function ClaimMinutesSummary({
  extractedMinutes,
  extractedCashInCents,
  groundedMinutes,
  groundedCashInCents,
  projectCurrency,
}: {
  readonly extractedMinutes: number | null;
  readonly extractedCashInCents: string | null;
  readonly groundedMinutes: number | null;
  readonly groundedCashInCents: string | null;
  readonly projectCurrency: string;
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl bg-muted/50 p-3">
        <dt className="text-xs text-muted-foreground">What the member said</dt>
        <dd className="text-sm">
          {extractedMinutes === null ? "Nothing extracted" : `${extractedMinutes} minutes`}
          {extractedCashInCents !== null &&
            ` · ${formatMoneyFromCents(BigInt(extractedCashInCents), projectCurrency)}`}
        </dd>
        <dd className="text-xs text-muted-foreground">This pays nobody on its own.</dd>
      </div>
      <div className="rounded-xl bg-muted/50 p-3">
        <dt className="text-xs text-muted-foreground">What the artifacts prove</dt>
        <dd className="text-sm">
          {groundedMinutes === null ? "Not graded yet" : `${groundedMinutes} minutes`}
          {groundedCashInCents !== null &&
            ` · ${formatMoneyFromCents(BigInt(groundedCashInCents), projectCurrency)}`}
        </dd>
        <dd className="text-xs text-muted-foreground">This is what the ledger prices.</dd>
      </div>
    </dl>
  );
}

export function ClaimEvidenceList({ evidence }: { readonly evidence: readonly ClaimEvidence[] }) {
  if (evidence.length === 0) return null;

  return (
    <section className="space-y-1">
      <p className="text-sm font-medium">Evidence</p>
      <ul className="space-y-1 text-xs">
        {evidence.map((item) => (
          <li key={item.payloadSha256}>
            <span className="text-muted-foreground">{item.provider}:</span>{" "}
            {item.externalUrl === null ? (
              item.label
            ) : (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary-imprint underline underline-offset-2"
              >
                {item.label}
              </a>
            )}{" "}
            · hash {shortenHashForDisplay(item.payloadSha256)} · signature {item.signatureStatus}
            {!item.countsTowardSlices && " · does not count toward slices"}
            {!item.evidenceRetained &&
              " · the stored copy was purged when consent was revoked; the hash stands"}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ClaimReverifyForm({
  onSubmit,
  isPending,
  isSuccess,
  reverifyError,
}: {
  readonly onSubmit: (reason: string) => void;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly reverifyError: ApiError | null;
}) {
  const [reverifyReason, setReverifyReason] = useState("");

  return (
    <form
      className="space-y-2 rounded-xl bg-muted/50 p-3"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        onSubmit(reverifyReason);
      }}
    >
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          Ask for a fresh run — this adds an attempt, it does not replace one
        </span>
        <input
          required
          value={reverifyReason}
          onChange={(changeEvent) => setReverifyReason(changeEvent.target.value)}
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
          placeholder="Why re-verify?"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-full border border-primary-imprint/40 px-3 py-1.5 text-xs font-medium text-primary-imprint disabled:opacity-50"
      >
        {isPending ? "Requesting…" : "Re-verify this claim"}
      </button>
      {isSuccess && (
        <p className="text-xs text-primary-imprint">
          Queued. The new attempt appears above when it finishes — nothing has changed yet.
        </p>
      )}
      {reverifyError !== null && <MutationErrorNotice error={reverifyError} />}
    </form>
  );
}
