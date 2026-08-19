// TRANSPORT: client-query — "use client" island. Reads GET …/audit-trail/:entryId/hash-input
// when one entry is expanded, then recomputes the digest locally.
"use client";

import { useEffect, useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useAuditHashInputQuery } from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";

/**
 * Prove one audit entry's hash, in the reader's own browser.
 *
 * **THE SERVER'S VERDICT IS NOT THE PRODUCT HERE.** `…/audit-trail/verify` already answers
 * "the chain is intact", and that answer is worth exactly as much as your trust in the
 * server that produced it — it is grading its own homework. This endpoint returns the exact
 * RFC 8785 bytes that were hashed, and the only honest thing to do with them is hash them
 * again HERE and compare. That comparison is the feature; the bytes are just its input.
 *
 * SO THE VERDICT IS COMPUTED, NEVER RECEIVED. Nothing below renders a tick because a
 * request returned 200. `isDigestMatching` is the output of `crypto.subtle.digest` over the
 * bytes on screen, compared to the `entryHash` on screen.
 *
 * AND IT REFUSES TO GUESS. The recomputation is valid only for `sha256-jcs-v1` —
 * `AUDIT_HASH_ALGORITHM_VERSION` in the backend's `project-audit.service.ts`, which is
 * `sha256(utf8(canonicalizeDocument(…)))`. That field exists precisely so the algorithm can
 * change, so an unrecognized version renders "this client cannot check that version"
 * instead of a mismatch. Reporting a bump as tampering would be a false alarm about fraud.
 */

/** The one algorithm this client knows how to reproduce. Backend: `AUDIT_HASH_ALGORITHM_VERSION`. */
const SUPPORTED_HASH_ALGORITHM_VERSION = "sha256-jcs-v1";

type LocalDigestState =
  | { status: "idle" }
  | { status: "computing" }
  | { status: "unsupported_algorithm"; version: string }
  | { status: "unavailable"; reason: string }
  | { status: "computed"; digestHex: string; isDigestMatching: boolean };

export default function AuditHashInputInspector({
  projectSlug,
  entryId,
  isExpanded,
}: {
  projectSlug: string;
  entryId: string;
  isExpanded: boolean;
}) {
  const hashInputQuery = useAuditHashInputQuery(projectSlug, entryId, isExpanded);
  const [localDigestState, setLocalDigestState] = useState<LocalDigestState>({ status: "idle" });

  const hashInput = hashInputQuery.data;
  const canonicalBytes = hashInput?.canonicalBytes;
  const expectedEntryHash = hashInput?.entryHash;
  const hashAlgorithmVersion = hashInput?.hashAlgorithmVersion;

  useEffect(() => {
    if (
      canonicalBytes === undefined ||
      expectedEntryHash === undefined ||
      hashAlgorithmVersion === undefined
    ) {
      return undefined;
    }

    if (hashAlgorithmVersion !== SUPPORTED_HASH_ALGORITHM_VERSION) {
      setLocalDigestState({ status: "unsupported_algorithm", version: hashAlgorithmVersion });
      return undefined;
    }

    // `crypto.subtle` is absent outside a secure context. That is a limitation of where the
    // page is being read, not evidence about the entry, so it gets its own state rather
    // than collapsing into "does not match".
    if (typeof globalThis.crypto?.subtle?.digest !== "function") {
      setLocalDigestState({
        status: "unavailable",
        reason: "This browser exposes no Web Crypto digest here (it needs a secure context).",
      });
      return undefined;
    }

    let isEffectCurrent = true;
    setLocalDigestState({ status: "computing" });

    void (async () => {
      try {
        const digestBuffer = await globalThis.crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(canonicalBytes),
        );
        const digestHex = Array.from(new Uint8Array(digestBuffer))
          .map((byteValue) => byteValue.toString(16).padStart(2, "0"))
          .join("");
        if (!isEffectCurrent) return;
        setLocalDigestState({
          status: "computed",
          digestHex,
          isDigestMatching: digestHex === expectedEntryHash,
        });
      } catch {
        if (!isEffectCurrent) return;
        setLocalDigestState({
          status: "unavailable",
          reason: "The browser refused to compute the digest.",
        });
      }
    })();

    return () => {
      isEffectCurrent = false;
    };
  }, [canonicalBytes, expectedEntryHash, hashAlgorithmVersion]);

  if (!isExpanded) return null;

  const hashInputError =
    hashInputQuery.error instanceof ApiRequestError ? hashInputQuery.error.apiError : null;

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-muted/40 p-3">
      {hashInputQuery.isPending && (
        <p className="text-xs text-muted-foreground">Fetching the hashed bytes…</p>
      )}

      {hashInputError !== null && <MutationErrorNotice error={hashInputError} />}

      {hashInput !== undefined && (
        <>
          {renderVerdict()}

          <div className="space-y-1">
            <p className="text-xs font-medium">
              Entry hash · entry #{hashInput.sequenceNumber} · {hashInput.hashAlgorithmVersion}
            </p>
            {/* The FULL 64 characters here, not the short rendering used in the list: a
                24-bit prefix collides around 4,800 entries, and the whole hash is what is
                being checked. */}
            <p className="font-mono text-[11px] break-all text-muted-foreground">
              {hashInput.entryHash}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Canonical bytes (RFC 8785)</p>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(hashInput.canonicalBytes)}
                className="cursor-pointer text-xs text-[#00696E] underline"
              >
                Copy
              </button>
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-background p-2 font-mono text-[11px] whitespace-pre-wrap">
              {hashInput.canonicalBytes}
            </pre>
          </div>

          <p className="text-xs text-muted-foreground">
            Hash those exact bytes with SHA-256 in any tool you trust. Getting the entry hash above
            back is the proof — this page recomputes it too, but you should not have to take that on
            faith either.
          </p>
        </>
      )}
    </div>
  );

  function renderVerdict() {
    switch (localDigestState.status) {
      case "idle":
      case "computing":
        return <p className="text-xs text-muted-foreground">Recomputing the digest here…</p>;
      case "unsupported_algorithm":
        return (
          <p className="text-xs text-muted-foreground">
            This entry was hashed with {localDigestState.version}, which this page does not know how
            to reproduce. Nothing is wrong with the entry — check it with a tool that implements
            that version.
          </p>
        );
      case "unavailable":
        return <p className="text-xs text-muted-foreground">{localDigestState.reason}</p>;
      case "computed":
        return localDigestState.isDigestMatching ? (
          <p className="rounded-lg bg-[#00696E]/10 p-2 text-xs font-medium text-[#00696E]">
            Recomputed in your browser and it matches. The server did not assert this — the bytes
            below hash to the entry hash below.
          </p>
        ) : (
          <div className="space-y-1 rounded-lg bg-red-50 p-2">
            <p className="text-xs font-medium text-red-900">
              Recomputed in your browser and it does NOT match. Treat this as an operational
              emergency and report it — do not dismiss it.
            </p>
            <p className="font-mono text-[11px] break-all text-red-900">
              got {localDigestState.digestHex}
            </p>
          </div>
        );
      default: {
        const exhaustiveCheck: never = localDigestState;
        return exhaustiveCheck;
      }
    }
  }
}
