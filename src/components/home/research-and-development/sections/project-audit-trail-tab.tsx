// TRANSPORT: props-only — presentational server component. Fetches nothing; the chain
// page and the verification summary arrive as view states from proof-of-effort-page, which
// read GET …/audit-trail and GET …/audit-trail/verify.
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { formatIsoInstant, shortenHashForDisplay } from "@/lib/rnd/format";
import type { AuditEntry, ChainVerification } from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedItemViewState, MemberScopedListViewState } from "@/lib/rnd/view-state";

/**
 * The append-only audit chain, and the verifier's report on it.
 *
 * THE `restricted` BRANCH OF THE VERIFY READ IS NOT "UNVERIFIED". A broken chain comes back
 * as `409 CHAIN_BROKEN`, never as a `200` carrying `valid: false`, so a failed verify read
 * is either a membership refusal or an operational emergency — and the two render
 * completely differently. There is no `isValid` field to show, because a chain that
 * verified is the only chain the summary schema ever parses.
 *
 * TWO NAMES PER ENTRY, DELIBERATELY. `actorNameSnapshot` is inside the hash and can never
 * change; `actorDisplayName` is joined live for reading and stays editable when someone
 * changes their name or exercises erasure. The display name is what appears here — the
 * snapshot is what a verifier recomputes against.
 *
 * The short hash is a RENDERING. Nothing keys off it: a 24-bit prefix collides around
 * 4,800 entries, and the full 64 characters are what the hash-input endpoint checks.
 */
export default function ProjectAuditTrailTab({
  entriesState,
  chainVerificationState,
}: {
  entriesState: MemberScopedListViewState<AuditEntry>;
  chainVerificationState: MemberScopedItemViewState<ChainVerification>;
}) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Chain integrity</h3>
        {renderChainVerification()}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Every decision, in order</h3>
        {renderEntries()}
      </section>
    </div>
  );

  function renderChainVerification() {
    switch (chainVerificationState.status) {
      case "error":
        // A non-404 failure here is the CHAIN_BROKEN case, and it is not a loading
        // problem. It says so in the strongest terms the page has.
        return (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">The audit chain did not verify.</p>
            <p className="mt-1">{chainVerificationState.message}</p>
            <p className="mt-1 text-xs">
              This is not a display problem. A break means an entry&apos;s hash, its link to the
              previous entry, or the sequence itself no longer agrees — report it rather than
              reloading.
            </p>
          </div>
        );
      case "restricted":
        return chainVerificationState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to check this project's audit chain." />
        ) : (
          <RndMembersOnlyPanel message="The audit chain is visible to this project's team." />
        );
      case "ready": {
        const verification = chainVerificationState.item;
        return (
          <div className="space-y-1 rounded-2xl border border-[#00696E]/30 bg-[#00696E]/5 p-4 text-sm">
            <p className="font-medium text-[#00696E]">
              {verification.entriesChecked} entries re-walked, and every one checked out.
            </p>
            <p className="text-xs text-muted-foreground">
              Sequences {verification.firstSequence ?? "—"} to {verification.lastSequence ?? "—"}
              {verification.headEntryHash !== null &&
                ` · head ${shortenHashForDisplay(verification.headEntryHash)}`}
              {verification.lastAnchoredAt !== null &&
                ` · last anchored ${formatIsoInstant(verification.lastAnchoredAt)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Three things are checked per entry: the hash recomputes from its own columns, the link
              matches its predecessor, and the sequence has no gap. The third is the one that
              catches a deleted row — a chain missing its middle verifies perfectly unless someone
              counts.
            </p>
          </div>
        );
      }
      default: {
        const exhaustiveCheck: never = chainVerificationState;
        return exhaustiveCheck;
      }
    }
  }

  function renderEntries() {
    switch (entriesState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the audit trail." />;
      case "restricted":
        return <RndMembersOnlyPanel message="The audit trail is visible to this project's team." />;
      case "empty":
        return <RndStatusPanel message="Nothing has been recorded yet." />;
      case "ready":
        return (
          <ol className="space-y-2">
            {entriesState.rows.map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    #{entry.sequenceNumber} · {entry.actionLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatIsoInstant(entry.occurredAt)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.actorDisplayName ?? entry.actorNameSnapshot} ({entry.actorRoleSnapshot}) →{" "}
                  {entry.targetLabel}
                </p>
                {entry.detailNote.length > 0 && <p className="mt-1 text-xs">{entry.detailNote}</p>}
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {shortenHashForDisplay(entry.entryHash)}
                  {entry.previousEntryHash !== null &&
                    ` ← ${shortenHashForDisplay(entry.previousEntryHash)}`}
                </p>
              </li>
            ))}
          </ol>
        );
      default: {
        const exhaustiveCheck: never = entriesState;
        return exhaustiveCheck;
      }
    }
  }
}
