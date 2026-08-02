// TRANSPORT: client-query — "use client" island calling useBakePieMutation. Reads arrive
// as props from the server page; the one write here is POST …/pie-bake.
"use client";

import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { useBakePieMutation } from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import {
  PIE_BAKE_ACKNOWLEDGEMENT,
  PIE_BAKE_TRIGGERS,
  PieBakeTriggerSchema,
  type PieBake,
  type PieBakeTrigger,
  type ProofOfEffortSummary,
} from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedItemViewState } from "@/lib/view-state";

const TRIGGER_LABELS: Record<PieBakeTrigger, string> = {
  cash_flow_breakeven: "The project reached cash-flow breakeven",
  priced_round: "The project closed a priced round",
};

/** Founder only. Anyone else reaching the endpoint gets a 404, not a 403. */
function canBake(viewerProjectRole: string | null): boolean {
  return viewerProjectRole === "founder";
}

/**
 * The bake — the last thing §9 ever does for a project.
 *
 * IRREVERSIBLE, ONCE PER PROJECT, EVER. `pie_bake_event` is unique per project and there
 * is NO unbake endpoint: recovery is a manual, audited, out-of-band operation. Nothing in
 * this panel may offer to undo it, soften it, or describe it as reversible.
 *
 * `expectedSnapshotId` is echoed from the snapshot the founder is actually looking at. It
 * is what makes `409 SNAPSHOT_STALE` reachable — without it, a bake submitted while the
 * nightly recompute ran would freeze a cap table nobody reviewed.
 *
 * `409 UNSETTLED_ALLOCATIONS` is not a failure to retry: it means a dispute window is
 * still open, and the honest instruction is to settle it and come back.
 */
export default function PieBakePanel({
  pieBakeState,
  summaryState,
  projectCurrency,
  projectSlug,
  viewerProjectRole,
}: {
  pieBakeState: MemberScopedItemViewState<PieBake>;
  summaryState: MemberScopedItemViewState<ProofOfEffortSummary>;
  projectCurrency: string;
  projectSlug: string;
  viewerProjectRole: string | null;
}) {
  const bakeMutation = useBakePieMutation(projectSlug);
  const [trigger, setTrigger] = useState<PieBakeTrigger>("priced_round");
  const [triggerEvidenceNote, setTriggerEvidenceNote] = useState("");
  const [valuationCents, setValuationCents] = useState("");
  const [typedAcknowledgement, setTypedAcknowledgement] = useState("");

  // `restricted` here covers BOTH "not a member" and "never baked" — GET …/pie-bake 404s
  // before the bake — so a project with a dynamic pie lands in the same branch as a
  // stranger does. The summary read below is what separates them for a member.
  if (pieBakeState.status === "ready") {
    const pieBake = pieBakeState.item;
    return (
      <section className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">The pie is baked</h3>
        <p className="text-sm text-muted-foreground">
          Frozen on {formatIsoInstant(pieBake.bakedAt)} — {TRIGGER_LABELS[pieBake.trigger]}.
          {pieBake.valuationCents !== null &&
            ` Valued at ${formatMoneyFromCents(BigInt(pieBake.valuationCents), projectCurrency)}.`}
        </p>
        <p className="text-xs text-muted-foreground">
          The percentages above no longer move. Slice accrual has stopped and the nightly recompute
          skips this project.
        </p>
      </section>
    );
  }

  if (summaryState.status !== "ready" || summaryState.item.equity === null) {
    return null;
  }

  const snapshot = summaryState.item.equity;
  const openProposalCount = summaryState.item.openProposals.length;

  if (!canBake(viewerProjectRole)) {
    return (
      <section className="space-y-2 rounded-2xl border border-dashed border-[#CAC4D0] p-4">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Baking the pie</h3>
        <p className="text-sm text-muted-foreground">
          When this project reaches cash-flow breakeven or closes a priced round, the founder
          freezes the pie. After that the percentages are final and slices stop accruing. Only the
          founder can do it, and it happens once.
        </p>
      </section>
    );
  }

  const isAcknowledgementTyped = typedAcknowledgement === PIE_BAKE_ACKNOWLEDGEMENT;
  const bakeError =
    bakeMutation.error instanceof ApiRequestError ? bakeMutation.error.apiError : null;

  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <h3 className="text-sm font-medium tracking-wide xl:text-lg">Bake the pie</h3>
      <p className="text-sm text-muted-foreground">
        This freezes every percentage above, permanently. Slices stop accruing, the nightly
        recompute stops running, and there is no way to undo it — recovery would be a manual
        operation outside this app.
      </p>

      {openProposalCount > 0 && (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          {openProposalCount} allocation{openProposalCount === 1 ? " is" : "s are"} still inside a
          dispute window. Baking will be refused until they settle.
        </p>
      )}

      <form
        className="space-y-3"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          bakeMutation.mutate({
            trigger,
            triggerEvidenceNote,
            valuationCents: valuationCents.length > 0 ? valuationCents : undefined,
            acknowledgement: PIE_BAKE_ACKNOWLEDGEMENT,
            expectedSnapshotId: snapshot.id,
          });
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">What triggered the bake</span>
          <select
            value={trigger}
            onChange={(changeEvent) => {
              // Parsed rather than cast: a select whose value reached the body unchecked
              // would send a `.strict()` schema something it rejects with a 422.
              const parsedTrigger = PieBakeTriggerSchema.safeParse(changeEvent.target.value);
              if (parsedTrigger.success) setTrigger(parsedTrigger.data);
            }}
            className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
          >
            {PIE_BAKE_TRIGGERS.map((triggerOption) => (
              <option key={triggerOption} value={triggerOption}>
                {TRIGGER_LABELS[triggerOption]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Evidence for it</span>
          <textarea
            required
            value={triggerEvidenceNote}
            onChange={(changeEvent) => setTriggerEvidenceNote(changeEvent.target.value)}
            className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
            rows={3}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">
            Valuation in cents, if there was one (whole cents, no decimal point)
          </span>
          <input
            value={valuationCents}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(changeEvent) => setValuationCents(changeEvent.target.value)}
            className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">
            Type {PIE_BAKE_ACKNOWLEDGEMENT} to confirm
          </span>
          <input
            value={typedAcknowledgement}
            onChange={(changeEvent) => setTypedAcknowledgement(changeEvent.target.value)}
            className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={!isAcknowledgementTyped || bakeMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bakeMutation.isPending ? "Baking…" : "Bake the pie permanently"}
        </button>
      </form>

      {bakeError !== null && <MutationErrorNotice error={bakeError} />}
      {bakeMutation.isSuccess && (
        <MutationSuccessNotice message="The pie is baked. These percentages are final." />
      )}
    </section>
  );
}
