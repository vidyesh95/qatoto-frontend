// TRANSPORT: props-only — the left instrument rail over the stage. Reads the store for its pressed
// states and writes back on click; it owns nothing.

"use client";

import Image from "next/image";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";
import { SPECTRAL_STRESS_STOP_HEXES } from "@/lib/blueprints/stress-ramp";

export interface ViewportToolRailProps {
  readonly store: ExplosionStore;
  readonly isInteractive: boolean;
  /** The stress toggle is pointless when nobody rated a part, so it is absent rather than dead. */
  readonly hasStressRatings: boolean;
}

const RAIL_BUTTON_CLASS =
  "pointer-events-auto grid size-9 cursor-pointer place-items-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const RAIL_OFF_CLASS = "border-black/10 bg-white/85 backdrop-blur hover:border-black/30";
const RAIL_ON_CLASS = "border-[#FF5500] bg-[#FF5500]/10";

const STRESS_GRADIENT = `linear-gradient(180deg, ${SPECTRAL_STRESS_STOP_HEXES.join(", ")})`;

/**
 * A COLUMN OF ICONS, not the labelled pills this replaced. The reference keeps its tools in a
 * narrow rail down the left edge so the stage keeps its width, and at this size a label per tool
 * would be wider than the model. Each button keeps its name in `aria-label` and `title`.
 */
export default function ViewportToolRail({
  store,
  isInteractive,
  hasStressRatings,
}: ViewportToolRailProps) {
  const { isXrayEnabled, isStressViewEnabled } = useExplosionSnapshot(store);

  return (
    <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5">
      <button
        type="button"
        title="X-ray"
        aria-label="X-ray"
        aria-pressed={isXrayEnabled}
        disabled={!isInteractive}
        onClick={() => store.setXrayEnabled(!isXrayEnabled)}
        className={`${RAIL_BUTTON_CLASS} ${isXrayEnabled ? RAIL_ON_CLASS : RAIL_OFF_CLASS}`}
      >
        <Image
          src="/icons/visibility_off_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          width={18}
          height={18}
          alt=""
        />
      </button>

      {hasStressRatings ? (
        <button
          type="button"
          title="Stress heat map"
          aria-label="Stress heat map"
          aria-pressed={isStressViewEnabled}
          disabled={!isInteractive}
          onClick={() => store.setStressViewEnabled(!isStressViewEnabled)}
          className={`${RAIL_BUTTON_CLASS} ${isStressViewEnabled ? RAIL_ON_CLASS : RAIL_OFF_CLASS}`}
        >
          <span
            aria-hidden
            className="block h-4 w-2.5 rounded-sm"
            style={{ backgroundImage: STRESS_GRADIENT }}
          />
        </button>
      ) : null}

      <button
        type="button"
        title="Reset view"
        aria-label="Reset view"
        disabled={!isInteractive}
        onClick={() => store.requestViewReset()}
        className={`${RAIL_BUTTON_CLASS} ${RAIL_OFF_CLASS}`}
      >
        <Image
          src="/icons/restart_alt_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          width={18}
          height={18}
          alt=""
        />
      </button>
    </div>
  );
}
