"use client";

import { useState } from "react";

import { shortenHashForDisplay } from "@/components/home/research-and-development/sections/compensation-format";
import type { ProjectChainVerification } from "@/types/research-and-development";

type ChainCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "intact"; checkedEntryCount: number }
  | { status: "broken"; brokenAtAuditEntryId: string };

// Chain verification (§14.6). A hash chip nobody can check is decoration, so
// this exposes the exact inputs each entry was hashed over and walks the links
// in front of the reader. The walk here compares the stored links only — the
// real recomputation runs server-side later, which is why the result is framed
// as a link check rather than a cryptographic proof.
export default function ChainVerificationPanel({
  chainVerification,
}: {
  chainVerification: ProjectChainVerification;
}) {
  const [checkState, setCheckState] = useState<ChainCheckState>({ status: "idle" });
  const [inspectedAuditEntryId, setInspectedAuditEntryId] = useState<string | null>(null);

  const handleVerifyClick = () => {
    setCheckState({ status: "checking" });
    // Inputs arrive newest-first, so each entry's previousEntryHash must equal
    // the hash of the entry after it in the list.
    const brokenInput = chainVerification.inputs.find((chainInput, inputIndex) => {
      const olderInput = chainVerification.inputs[inputIndex + 1];
      if (!olderInput) return chainInput.previousEntryHash !== "genesis";
      return chainInput.previousEntryHash !== olderInput.entryHash;
    });
    setCheckState(
      brokenInput
        ? { status: "broken", brokenAtAuditEntryId: brokenInput.auditEntryId }
        : { status: "intact", checkedEntryCount: chainVerification.inputs.length },
    );
  };

  const renderCheckResult = () => {
    switch (checkState.status) {
      case "idle":
        return (
          <span className="text-xs text-muted-foreground">
            Not checked yet — take nobody&apos;s word for it.
          </span>
        );
      case "checking":
        return <span className="text-xs text-muted-foreground">Walking the chain…</span>;
      case "intact":
        return (
          <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-xs font-medium text-[#00696E]">
            Chain intact across {checkState.checkedEntryCount} entries
          </span>
        );
      case "broken":
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Chain breaks at {checkState.brokenAtAuditEntryId}
          </span>
        );
      default: {
        const exhaustiveCheck: never = checkState;
        return exhaustiveCheck;
      }
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium tracking-wide xl:text-lg">Verify the chain</h3>
      <p className="text-xs text-muted-foreground">
        Each entry folds the previous entry&apos;s hash into its own, so changing any past event
        breaks every link after it. Below is exactly what was hashed — you never have to trust the
        chip.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleVerifyClick}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Verify chain
        </button>
        {renderCheckResult()}
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        Head {shortenHashForDisplay(chainVerification.headEntryHash)} ·{" "}
        {chainVerification.entryCount} entries
      </p>

      <ul className="divide-y divide-border/50 rounded-2xl border border-[#CAC4D0]/60">
        {chainVerification.inputs.map((chainInput) => {
          const isInspected = inspectedAuditEntryId === chainInput.auditEntryId;
          return (
            <li key={chainInput.auditEntryId} className="p-3">
              <button
                type="button"
                onClick={() =>
                  setInspectedAuditEntryId(isInspected ? null : chainInput.auditEntryId)
                }
                className="flex w-full cursor-pointer flex-wrap items-center gap-2 text-left"
              >
                <span className="text-sm">{chainInput.auditEntryId}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {chainInput.previousEntryHash === "genesis"
                    ? "genesis"
                    : shortenHashForDisplay(chainInput.previousEntryHash)}{" "}
                  → {shortenHashForDisplay(chainInput.entryHash)}
                </span>
                <span className="ml-auto text-xs text-[#00696E]">
                  {isInspected ? "Hide inputs" : "Inspect inputs"}
                </span>
              </button>
              {isInspected && (
                <div className="mt-3 space-y-2 rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Algorithm {chainInput.hashAlgorithmLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">Canonical payload hashed:</p>
                  <pre className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs">
                    {chainInput.canonicalPayload}
                  </pre>
                  <p className="overflow-x-auto font-mono text-xs break-all text-muted-foreground">
                    entryHash {chainInput.entryHash}
                  </p>
                  <p className="overflow-x-auto font-mono text-xs break-all text-muted-foreground">
                    previousEntryHash {chainInput.previousEntryHash}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Short hashes here are for reading only — a 24-bit prefix collides around 4,800 entries, so
        the full 64-char hash is the identity. Recomputation is backend-owned later.
      </p>
    </section>
  );
}
