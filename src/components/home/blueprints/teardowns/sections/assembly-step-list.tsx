// TRANSPORT: props-only — the numbered disassembly procedure. Clicking a step drives the 3D viewer
// through the store and the walkthrough through the seek channel; nothing here fetches.

"use client";

import { useWalkthroughSeek } from "@/components/home/blueprints/media/walkthrough-seek-context";
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
   * every such step to a `null` focusedPartId, so the row renders as plain text rather than as a
   * button that would do nothing.
   */
  readonly store: ExplosionStore | null;
}

const ROW_SHELL_CLASS = "rounded-xl border transition-colors";
const ROW_BODY_CLASS = "flex w-full gap-3 px-3 pt-2.5 text-left";

/**
 * ⚠️ `w-9` AND `ml-15` ARE ONE MEASUREMENT WRITTEN TWICE. The timestamp control is a SIBLING of the
 * step button rather than a child of it, so nothing lays it out under the step's text for us: the
 * indent is `px-3` (12px) + the numeral's `w-9` (36px) + `gap-3` (12px) = 60px = `ml-15`. Give the
 * numeral a different width and the timestamp drifts out of alignment.
 */
const NUMERAL_CLASS = "w-9 shrink-0 font-serif text-3xl leading-none";
const TIMESTAMP_INDENT_CLASS = "ml-15";
const TIMESTAMP_TEXT_CLASS = "font-mono text-[11px] tabular-nums";

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
 * ONE ROW, UP TO TWO CONTROLS, AND THEY ARE SIBLINGS.
 *
 * The row used to be a single button carrying the whole step, and the timestamp inside it was inert
 * text. Now that the timestamp can seek, one click target with two meanings is the wrong shape —
 * and putting a `<button>` inside a `<button>` to fix it is invalid HTML that browsers resolve by
 * dropping the inner one. So the row is a plain `<li>` shell holding a focus button and a seek
 * button side by side, which is also what lets a step with a timestamp but no `focusedPartId` still
 * be useful — `bp-005`'s three steps are exactly that case, a hosted walkthrough on a teardown that
 * published no model.
 *
 * Either control can be absent, and a row with neither is ordinary: `bp-003`'s four steps have no
 * part to focus (no assembly) and no moment to seek (a YouTube walkthrough, whose own chapters are
 * the timestamps), so they render as prose.
 *
 * ⚠️ THE PLAIN-TEXT TIMESTAMP BRANCH IS UNREACHABLE FROM EITHER REAL PAGE, AND IT STAYS. A
 * timestamp now implies a hosted walkthrough (the teardown arm's refinement rejects every other
 * combination), and a hosted walkthrough is exactly when `teardown-detail-page.tsx` mounts the
 * provider — so `timestampSeconds !== null` with `seekChannel === null` cannot arise through the
 * explorer or the detail page. It is kept because this component is independently renderable and
 * the honest fallback for a step list mounted outside a provider is the time as text, not a button
 * that does nothing. Do not replace it with a throw: an absent enhancement is not an error.
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
  const seekChannel = useWalkthroughSeek();
  const { timestampSeconds } = step;
  const hasTimestampControl = timestampSeconds !== null && seekChannel !== null;

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
  // The bottom padding belongs to whichever element is last, so a row without a timestamp does not
  // end flush against its border.
  const bodyPaddingClass = timestampSeconds === null ? "pb-2.5" : "pb-1";

  return (
    <li
      className={`${ROW_SHELL_CLASS} ${
        isCurrent ? "border-[#00696E] bg-[#00696E]/6" : "border-[#CAC4D0]/60"
      }`}
    >
      {onFocusPart === null ? (
        <div className={`${ROW_BODY_CLASS} ${bodyPaddingClass}`}>
          {numeral}
          {body}
        </div>
      ) : (
        <button
          type="button"
          aria-current={isCurrent ? "step" : undefined}
          onClick={onFocusPart}
          className={`${ROW_BODY_CLASS} ${bodyPaddingClass} cursor-pointer hover:text-[#00696E]`}
        >
          {numeral}
          {body}
        </button>
      )}

      {timestampSeconds === null ? null : hasTimestampControl ? (
        <button
          type="button"
          onClick={() => seekChannel.requestSeekToSeconds(timestampSeconds)}
          className={`${TIMESTAMP_INDENT_CLASS} ${TIMESTAMP_TEXT_CLASS} mb-2.5 inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#CAC4D0]/60 px-2 py-1 text-[#00696E] transition-colors hover:border-[#00696E] hover:bg-[#00696E]/8`}
        >
          <PlayGlyph />
          Play from {formatVideoTimestampLabel(timestampSeconds)}
        </button>
      ) : (
        <span
          className={`${TIMESTAMP_INDENT_CLASS} ${TIMESTAMP_TEXT_CLASS} mb-2.5 block text-[#6F7979]`}
        >
          at {formatVideoTimestampLabel(timestampSeconds)}
        </span>
      )}
    </li>
  );
}

function PlayGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
      <path d="M3 1.6 10 6l-7 4.4z" />
    </svg>
  );
}
