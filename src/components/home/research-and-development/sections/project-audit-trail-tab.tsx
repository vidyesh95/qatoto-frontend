// TRANSPORT: props-only — presentational server component. Fetches nothing; the chain
// page and the verification summary arrive as view states from proof-of-effort-page, which
// read GET …/audit-trail and GET …/audit-trail/verify. The entry list itself is a
// client-query island — it pages the rest of the chain by `?fromSequence=`.
import AuditTrailEntriesIsland from "@/components/home/research-and-development/sections/audit-trail-entries-island";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { formatIsoInstant, shortenHashForDisplay } from "@/lib/rnd/format";
import type { AuditEntry, ChainVerification } from "@/lib/rnd/proof-of-effort.schemas";
import type {
  MemberScopedItemViewState,
  MemberScopedSequenceListViewState,
} from "@/lib/rnd/view-state";

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
  projectSlug,
}: {
  entriesState: MemberScopedSequenceListViewState<AuditEntry>;
  chainVerificationState: MemberScopedItemViewState<ChainVerification>;
  projectSlug: string;
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
        // The rows moved into an island so the rest of the chain is reachable — this tab
        // still owns the first page, which the server already read.
        return (
          <AuditTrailEntriesIsland
            projectSlug={projectSlug}
            initialEntries={entriesState.rows}
            initialNextSequence={entriesState.nextSequence}
          />
        );
      default: {
        const exhaustiveCheck: never = entriesState;
        return exhaustiveCheck;
      }
    }
  }
}
