// TRANSPORT: props-only — presentational server component. Fetches nothing; the equity
// snapshot, the ledger page, the open-role projection and the bake record arrive as view
// states from proof-of-effort-page, which read GET …/proof-of-effort, …/slice-ledger,
// …/equity/open-role-projection and …/pie-bake.
import PieBakePanel from "@/components/home/research-and-development/sections/pie-bake-panel";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import {
  formatEquityFromBasisPoints,
  formatIsoInstant,
  formatMoneyFromCents,
} from "@/lib/rnd/format";
import type {
  LedgerEntry,
  OpenRoleProjection,
  PieBake,
  ProofOfEffortSummary,
} from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedItemViewState, MemberScopedListViewState } from "@/lib/rnd/view-state";

const SLICE_SEGMENT_COLORS = ["#00696E", "#1DBDC5", "#4A6363", "#7DA0A2", "#B4D2D4"];

const BASIS_POINTS_TOTAL = 10_000;

/**
 * The cap table, the ledger and the bake.
 *
 * NULL EQUITY IS A PROJECT WITH NO CAP TABLE, and it renders as exactly that. The old mock
 * drew a stacked bar with a founder-chosen "reserve" segment; both are gone. There is no
 * reserve pool in this design (§9.5) — a reserve is a number someone picks that dilutes
 * every real contributor by an amount nobody earned. What replaces it is the OPEN-ROLE
 * PROJECTION: what a role would take if filled at its own advertised band, computed from a
 * stated basis and rendered explicitly OUTSIDE the denominator.
 *
 * A DEGENERATE SNAPSHOT IS NOT NORMALIZED. When nobody has contributed yet, every share is
 * 0 and they do not sum to 10000. Filling the remainder would invent a cap table for a
 * project that has none, so the bar simply stays empty and says why.
 *
 * SLICES AND MONEY ARE DECIMAL STRINGS. `totalSlices` and `sliceNumerator` are exact
 * rationals and cent values are `bigint`; both are parsed with `BigInt`, never `Number`.
 */
export default function SliceLedgerTab({
  summaryState,
  ledgerState,
  projectionState,
  pieBakeState,
  projectCurrency,
  projectSlug,
  viewerProjectRole,
}: {
  summaryState: MemberScopedItemViewState<ProofOfEffortSummary>;
  ledgerState: MemberScopedListViewState<LedgerEntry>;
  projectionState: MemberScopedListViewState<OpenRoleProjection>;
  pieBakeState: MemberScopedItemViewState<PieBake>;
  projectCurrency: string;
  projectSlug: string;
  viewerProjectRole: string | null;
}) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">The cap table</h3>
        {renderEquity()}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">
          If the open roles were filled
        </h3>
        {renderProjection()}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Slice ledger</h3>
        {renderLedger()}
      </section>

      <PieBakePanel
        pieBakeState={pieBakeState}
        summaryState={summaryState}
        projectCurrency={projectCurrency}
        projectSlug={projectSlug}
        viewerProjectRole={viewerProjectRole}
      />
    </div>
  );

  function renderEquity() {
    switch (summaryState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the cap table." />;
      case "restricted":
        return summaryState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's Proof of Effort." />
        ) : (
          <RndMembersOnlyPanel message="Proof of Effort is visible to this project's team." />
        );
      case "ready": {
        const equity = summaryState.item.equity;
        if (equity === null) {
          return (
            <RndStatusPanel message="No cap table has been computed yet. Nobody has contributed verified effort, so there is nothing to divide." />
          );
        }
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <p className="text-xs text-muted-foreground">Total slices</p>
                <p className="text-xl font-semibold">{equity.totalSlices}</p>
              </div>
              <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <p className="text-xs text-muted-foreground">Members with a share</p>
                <p className="text-xl font-semibold">{equity.memberCount}</p>
              </div>
              <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <p className="text-xs text-muted-foreground">
                  {equity.isBaked ? "Frozen" : "Recomputed"}
                </p>
                <p className="text-sm font-medium">{formatIsoInstant(equity.computedAt)}</p>
              </div>
            </div>

            {equity.isDegenerate ? (
              <p className="text-sm text-muted-foreground">
                No slices have been awarded yet, so every share is 0% and the shares do not add up
                to 100%. That is what an unstarted pie looks like — it is not being rounded or
                filled in.
              </p>
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  {equity.shares.map((share, shareIndex) => (
                    <div
                      key={share.memberId}
                      style={{
                        width: `${(share.equityBasisPoints / BASIS_POINTS_TOTAL) * 100}%`,
                        backgroundColor:
                          SLICE_SEGMENT_COLORS[shareIndex % SLICE_SEGMENT_COLORS.length],
                      }}
                    />
                  ))}
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {equity.shares.map((share, shareIndex) => (
                    <li
                      key={share.memberId}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              SLICE_SEGMENT_COLORS[shareIndex % SLICE_SEGMENT_COLORS.length],
                          }}
                        />
                        <span className="truncate">{share.memberName}</span>
                      </span>
                      <span className="shrink-0 font-medium">
                        {formatEquityFromBasisPoints(share.equityBasisPoints)} · {share.slices}{" "}
                        slices
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="text-xs text-muted-foreground">
              Computed through ledger entry #{equity.throughLedgerSequenceNumber} using{" "}
              {equity.apportionmentAlgorithm}.{" "}
              {equity.isBaked
                ? "This pie is baked — the percentages are final and no longer move."
                : "This pie is dynamic — it is recomputed as verified effort lands."}
            </p>
          </div>
        );
      }
      default: {
        const exhaustiveCheck: never = summaryState;
        return exhaustiveCheck;
      }
    }
  }

  function renderProjection() {
    switch (projectionState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the open-role projection." />;
      case "restricted":
        return <RndMembersOnlyPanel message="This projection is visible to the team." />;
      case "empty":
        return <RndStatusPanel message="No open roles to project." />;
      case "ready":
        return (
          <div className="space-y-2">
            <ul className="grid gap-3 sm:grid-cols-2">
              {projectionState.rows.map((projection) => (
                <li
                  key={projection.openRoleId}
                  className="rounded-2xl border border-dashed border-[#CAC4D0] p-4"
                >
                  <p className="font-medium">{projection.roleTitle}</p>
                  <p className="mt-1 text-sm">
                    ≈ {formatEquityFromBasisPoints(projection.projectedDilutionBasisPoints)}{" "}
                    dilution · {projection.projectedSlices} slices
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assuming{" "}
                    {formatMoneyFromCents(
                      BigInt(projection.assumedRateCentsPerHour),
                      projectCurrency,
                    )}
                    /hour over {Math.round(projection.assumedMonthlyMinutes / 60)} hours a month,
                    from the role&apos;s own advertised band.
                  </p>
                </li>
              ))}
            </ul>
            {/* The one sentence that stops this reading as an allocation. */}
            <p className="text-xs text-muted-foreground">
              These are projections, not allocations. Nothing here is in the ledger, nothing here
              dilutes anyone today, and no slices are reserved — an unfilled role earns nothing.
            </p>
          </div>
        );
      default: {
        const exhaustiveCheck: never = projectionState;
        return exhaustiveCheck;
      }
    }
  }

  function renderLedger() {
    switch (ledgerState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the slice ledger." />;
      case "restricted":
        return <RndMembersOnlyPanel message="The ledger is visible to this project's team." />;
      case "empty":
        return <RndStatusPanel message="No slices have been awarded yet." />;
      case "ready":
        return (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">#</th>
                    <th className="p-2 font-medium">Member</th>
                    <th className="p-2 font-medium">Kind</th>
                    <th className="p-2 font-medium">Slices</th>
                    <th className="p-2 font-medium">Effort / cash</th>
                    <th className="p-2 font-medium">Occurred</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerState.rows.map((entry) => (
                    <tr key={entry.id} className="border-t border-[#CAC4D0]/40">
                      <td className="p-2 tabular-nums">{entry.sequenceNumber}</td>
                      <td className="p-2">{entry.memberName}</td>
                      <td className="p-2">
                        {entry.entryKind === "reversal" ? "Reversal" : "Award"} ·{" "}
                        {entry.contributionKind === "cash" ? "Cash" : "Time"}
                      </td>
                      <td className="p-2 tabular-nums">
                        {entry.slicesAwarded}
                        {/* The exact rational, kept beside the rounded integer so the
                            half-slice is never presented as if it vanished. */}
                        <span className="block text-xs text-muted-foreground">
                          exact {entry.sliceNumerator}
                        </span>
                      </td>
                      <td className="p-2">
                        {entry.effortMinutes !== null && `${entry.effortMinutes} min`}
                        {entry.cashInCents !== null &&
                          formatMoneyFromCents(BigInt(entry.cashInCents), projectCurrency)}
                      </td>
                      <td className="p-2">{formatIsoInstant(entry.occurredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              The ledger is append-only. A correction is a reversing entry, never an edit — which is
              why sequence numbers never have gaps and a deleted row would be detectable.
            </p>
          </div>
        );
      default: {
        const exhaustiveCheck: never = ledgerState;
        return exhaustiveCheck;
      }
    }
  }
}
