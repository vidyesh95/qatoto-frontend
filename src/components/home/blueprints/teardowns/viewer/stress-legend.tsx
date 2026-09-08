// TRANSPORT: props-only — the heat-map key, shown over the stage only while the map is on.

"use client";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";
import { NOT_SIMULATED_HEX, SPECTRAL_STRESS_STOP_HEXES } from "@/lib/blueprints/stress-ramp";

const STRESS_GRADIENT = `linear-gradient(90deg, ${SPECTRAL_STRESS_STOP_HEXES.join(", ")})`;

/**
 * THE WORDING IS LOAD-BEARING. The colours come from a rating the author typed, not from anything
 * this page solved, and a heat map that looks like FEA output has to say so where it is read.
 */
export default function StressLegend({ store }: { readonly store: ExplosionStore }) {
  const { isStressViewEnabled } = useExplosionSnapshot(store);
  if (!isStressViewEnabled) return null;

  return (
    <div className="pointer-events-none absolute top-3 right-3 max-w-56 rounded-lg border border-black/10 bg-white/85 px-2.5 py-2 text-right shadow-xs backdrop-blur">
      <p className="font-mono text-[10px] tracking-[0.12em] text-[#6F7979] uppercase">
        Stress, fraction of yield
      </p>
      <div className="mt-1.5 flex items-center justify-end gap-1.5">
        <span className="font-mono text-[10px] text-foreground">0</span>
        <span
          aria-hidden
          className="block h-2 w-24 rounded-sm"
          style={{ backgroundImage: STRESS_GRADIENT }}
        />
        <span className="font-mono text-[10px] text-foreground">1</span>
        <span
          aria-hidden
          className="ml-1 block size-2 rounded-sm"
          style={{ backgroundColor: NOT_SIMULATED_HEX }}
        />
        <span className="font-mono text-[10px] text-[#6F7979]">n/a</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-[#6F7979]">
        Author-reported ratings. Not a live simulation.
      </p>
    </div>
  );
}
