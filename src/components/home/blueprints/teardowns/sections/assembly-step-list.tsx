// TRANSPORT: props-only — the numbered disassembly procedure. Clicking a step drives the 3D
// viewer through the store; nothing here fetches.

"use client";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";
import { formatConceptNumberLabel } from "@/lib/blueprints/format";
import type { TeardownAssemblyStep } from "@/lib/blueprints/schemas";

export interface AssemblyStepListProps {
  readonly steps: readonly TeardownAssemblyStep[];
  /**
   * `null` when this teardown published no model. The contract allows steps without an assembly —
   * a teardown documented in photographs is the common real case — and the arm's refinement forces
   * every such step to a `null` focusedPartId, so the row renders as plain text rather than as a
   * button that would do nothing.
   */
  readonly store: ExplosionStore | null;
}

const ROW_SHELL_CLASS = "rounded-xl border transition-colors";
const ROW_BODY_CLASS = "flex w-full gap-3 px-3 py-2.5 text-left";
const NUMERAL_CLASS = "w-9 shrink-0 font-serif text-3xl leading-none";

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
        <StepRow key={step.stepNumber} step={step} isCurrent={false} onFocusPart={null} />
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
        return (
          <StepRow
            key={step.stepNumber}
            step={step}
            isCurrent={focusedPartId !== null && focusedPartId === selectedPartId}
            onFocusPart={
              focusedPartId === null
                ? null
                : () => {
                    store.setTargetFactor(1);
                    store.selectPart(focusedPartId);
                  }
            }
          />
        );
      })}
    </ol>
  );
}

/**
 * ONE ROW, ONE CONTROL — the part this step is about.
 *
 * ⚠️ IT BRIEFLY HAD TWO. A step could also carry a `timestampSeconds`, rendered as a second
 * "Play from 0:03" button beside this one, which forced the row into an `<li>` shell holding two
 * siblings because a `<button>` inside a `<button>` is invalid HTML. That field is gone from the
 * contract — every blueprint video is a YouTube link, and YouTube's own player already offers
 * chapters — so the row is a single click target again. If a second control ever returns, the
 * sibling shape, not a nested one, is how to add it.
 *
 * A row with NO control is ordinary rather than degraded: a teardown that published no model forces
 * `focusedPartId` to null on every step (the contract only accepts a part id that exists in
 * `assembly.parts`), so its steps render as prose.
 */
function StepRow({
  step,
  isCurrent,
  onFocusPart,
}: {
  readonly step: TeardownAssemblyStep;
  readonly isCurrent: boolean;
  readonly onFocusPart: (() => void) | null;
}) {
  const numeral = (
    <span
      aria-hidden
      className={`${NUMERAL_CLASS} ${isCurrent ? "text-[#00696E]" : "text-[#00696E]/30"}`}
    >
      {formatConceptNumberLabel(step.stepNumber)}
    </span>
  );
  const body = (
    <span className="min-w-0">
      <span className="block text-sm font-medium text-foreground">{step.title}</span>
      <span className="mt-0.5 block text-sm leading-6 text-foreground/80">{step.description}</span>
    </span>
  );
  const shellClass = `${ROW_SHELL_CLASS} ${
    isCurrent ? "border-[#00696E] bg-[#00696E]/6" : "border-[#CAC4D0]/60"
  }`;

  if (onFocusPart === null) {
    return (
      <li className={shellClass}>
        <div className={ROW_BODY_CLASS}>
          {numeral}
          {body}
        </div>
      </li>
    );
  }

  return (
    <li className={shellClass}>
      <button
        type="button"
        aria-current={isCurrent ? "step" : undefined}
        onClick={onFocusPart}
        className={`${ROW_BODY_CLASS} cursor-pointer hover:text-[#00696E]`}
      >
        {numeral}
        {body}
      </button>
    </li>
  );
}
