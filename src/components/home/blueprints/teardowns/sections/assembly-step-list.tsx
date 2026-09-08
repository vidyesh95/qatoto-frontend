// TRANSPORT: props-only — the numbered disassembly procedure. Clicking a step drives the 3D
// viewer through the store; nothing here fetches.

"use client";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";
import { formatConceptNumberLabel, formatVideoTimestampLabel } from "@/lib/blueprints/format";
import type { TeardownAssemblyStep } from "@/lib/blueprints/schemas";

export interface AssemblyStepListProps {
  readonly steps: readonly TeardownAssemblyStep[];
  /**
   * `null` when this teardown published no model. The contract allows steps without an assembly —
   * a teardown documented in photographs is the common real case — and the arm's refinement forces
   * every such step to a `null` focusedPartId, so the list renders as plain text rather than as
   * buttons that would do nothing.
   */
  readonly store: ExplosionStore | null;
}

const ROW_CLASS = "flex gap-3 rounded-xl border px-3 py-2.5";

function StepBody({ step }: { readonly step: TeardownAssemblyStep }) {
  return (
    <span className="min-w-0">
      <span className="block text-sm font-medium text-foreground">{step.title}</span>
      <span className="mt-0.5 block text-sm leading-6 text-foreground/80">{step.description}</span>
      {/* Plain text, not a seek: the walkthrough player cannot yet honour a click. */}
      {step.timestampSeconds === null ? null : (
        <span className="mt-1 block font-mono text-[11px] text-[#6F7979] tabular-nums">
          at {formatVideoTimestampLabel(step.timestampSeconds)}
        </span>
      )}
    </span>
  );
}

function StepNumeral({ step, isCurrent }: { step: TeardownAssemblyStep; isCurrent: boolean }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 font-serif text-3xl leading-none ${
        isCurrent ? "text-[#00696E]" : "text-[#00696E]/30"
      }`}
    >
      {formatConceptNumberLabel(step.stepNumber)}
    </span>
  );
}

/**
 * TWO COMPONENTS RATHER THAN ONE WITH A CONDITIONAL HOOK. The interactive list subscribes to the
 * store so the canvas can mark a step current; the static one has no store to subscribe to. React
 * forbids calling a hook on one path and not the other, and faking a throwaway store to satisfy
 * that would be a lie about what this teardown published.
 */
export default function AssemblyStepList({ steps, store }: AssemblyStepListProps) {
  if (steps.length === 0) return null;
  if (store === null) return <StaticStepList steps={steps} />;
  return <InteractiveStepList steps={steps} store={store} />;
}

function StaticStepList({ steps }: { readonly steps: readonly TeardownAssemblyStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step) => (
        <li key={step.stepNumber}>
          <div className={`${ROW_CLASS} border-[#CAC4D0]/60`}>
            <StepNumeral step={step} isCurrent={false} />
            <StepBody step={step} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * THE LOOP RUNS BOTH WAYS. Clicking a step opens the assembly and frames its part; selecting that
 * part in the canvas marks its step current. `focusedPartId` sat on the wire with no consumer at
 * all until this existed.
 *
 * Subscribed HERE rather than in the explorer, so a hover inside the canvas re-renders this list
 * alone and never the viewer around it.
 */
function InteractiveStepList({
  steps,
  store,
}: {
  readonly steps: readonly TeardownAssemblyStep[];
  readonly store: ExplosionStore;
}) {
  const { selectedPartId } = useExplosionSnapshot(store);

  return (
    <ol className="space-y-2">
      {steps.map((step) => {
        const { focusedPartId } = step;
        const isCurrent = focusedPartId !== null && focusedPartId === selectedPartId;

        if (focusedPartId === null) {
          return (
            <li key={step.stepNumber}>
              <div className={`${ROW_CLASS} border-[#CAC4D0]/60`}>
                <StepNumeral step={step} isCurrent={false} />
                <StepBody step={step} />
              </div>
            </li>
          );
        }

        return (
          <li key={step.stepNumber}>
            <button
              type="button"
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => {
                store.setTargetFactor(1);
                store.selectPart(focusedPartId);
              }}
              className={`${ROW_CLASS} w-full cursor-pointer text-left transition-colors ${
                isCurrent
                  ? "border-[#00696E] bg-[#00696E]/6"
                  : "border-[#CAC4D0]/60 hover:border-[#00696E]/40"
              }`}
            >
              <StepNumeral step={step} isCurrent={isCurrent} />
              <StepBody step={step} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
