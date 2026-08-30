"use client";

// TRANSPORT: client-query — reads GET …/override-queue through React Query and mounts the
// same ClaimDetailDisclosure the claim index does, so a reviewer ANSWERS from the queue
// rather than going to find the claim. Needs QueryProvider, which (home)/layout.tsx mounts.

import ClaimDetailDisclosure from "@/components/home/research-and-development/sections/claim-detail-disclosure";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { useOverrideQueueQuery } from "@/hooks/rnd/proof-of-effort";
import { VERIFICATION_STEP_KIND_LABELS } from "@/lib/rnd/labels";
import { formatIsoDate, formatIsoInstant } from "@/lib/rnd/format";

const BASIS_POINTS_PER_PERCENT = 100;

/**
 * The human-oversight queue (EU AI Act Art. 14): every pipeline step that flagged and that
 * nobody has answered, oldest first.
 *
 * IT IS PER STEP, WHICH IS WHY IT IS NOT THE FLAGGED-CLAIMS CHIP. A claim with four steps
 * can have one answered and one still waiting; the chip beside it filters CLAIMS, so it
 * shows a reviewer work that is done and hides work that is not. Both surfaces stay — the
 * chip is for reading the flagged claims, this is for working through them.
 *
 * ANSWERING HAPPENS HERE. Each row mounts `ClaimDetailDisclosure`, the same component the
 * claim index opens, so the override control a reviewer needs is one disclosure away rather
 * than one page away. The override mutation invalidates the whole `poe` prefix, so an
 * answered step drops out of this list on its own — a queue that still listed it would be
 * the one failure a queue must not have.
 *
 * A CONTRIBUTOR SEES IT AND CANNOT ANSWER IT, deliberately. The read is `contributor` and
 * above while the override write is `maintainer` and above, and `ClaimDetailDisclosure`
 * already gates its own control on the role. Hiding the queue from the people whose equity
 * is waiting on it would make the backlog invisible to exactly the people it costs.
 *
 * AN EMPTY QUEUE IS THE GOOD OUTCOME and says so. It is not the same sentence as "no claims
 * have been checked yet" — nothing waiting on a person is a finished state, not an absence.
 */
export default function OverrideQueueIsland({
  projectSlug,
  projectCurrency,
  viewerProjectRole,
}: {
  projectSlug: string;
  projectCurrency: string;
  viewerProjectRole: string | null;
}) {
  const overrideQueue = useOverrideQueueQuery(projectSlug);

  if (overrideQueue.isPending) {
    return <RndStatusPanel message="Loading what's waiting on a person…" />;
  }

  if (overrideQueue.isError) {
    return <RndErrorPanel message="Couldn't load the review queue." />;
  }

  if (overrideQueue.data.length === 0) {
    return <RndStatusPanel message="Nothing is waiting on a person right now." />;
  }

  return (
    <ul className="space-y-3">
      {overrideQueue.data.map((queuedStep) => (
        <li
          key={queuedStep.stepId}
          className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{queuedStep.memberName}</p>
              <p className="text-xs text-muted-foreground">
                For {formatIsoDate(queuedStep.claimedForDate)} · attempt {queuedStep.attemptNumber}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {VERIFICATION_STEP_KIND_LABELS[queuedStep.stepKind]}
            </span>
          </div>

          <p className="mt-2 text-sm">{queuedStep.claimSummary}</p>

          {/* Why the pipeline stopped short. Null when the step recorded no finding, and
              that renders as nothing rather than as "no reason given" — the second reads
              as a fault in the machine when it is simply a step that flagged on a score. */}
          {queuedStep.findingSummary !== null && (
            <p className="mt-2 text-sm text-amber-900">{queuedStep.findingSummary}</p>
          )}

          {/* Provenance, on the same principle as the step rows inside the disclosure: a
              judgement whose confidence is hidden reads as a platform ruling rather than a
              machine opinion a person may overrule. */}
          <p className="mt-2 text-xs text-muted-foreground">
            Waiting since {formatIsoInstant(queuedStep.flaggedAt)}
            {queuedStep.scoreBps !== null &&
              ` · scored ${(queuedStep.scoreBps / BASIS_POINTS_PER_PERCENT).toFixed(0)}%`}
            {queuedStep.confidenceBps !== null &&
              ` · ${(queuedStep.confidenceBps / BASIS_POINTS_PER_PERCENT).toFixed(0)}% confidence`}
          </p>

          <ClaimDetailDisclosure
            projectSlug={projectSlug}
            claimId={queuedStep.claimId}
            initialVerificationStatus={queuedStep.verificationStatus}
            projectCurrency={projectCurrency}
            viewerProjectRole={viewerProjectRole}
          />
        </li>
      ))}
    </ul>
  );
}
