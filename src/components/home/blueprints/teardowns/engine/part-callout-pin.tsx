// TRANSPORT: props-only — one HTML callout anchored to one part. Re-renders on selection and on
// occlusion flips only; it rides the explosion for free because it is a child of the part.

"use client";

import { Html } from "@react-three/drei";
import { useState } from "react";

import type { LoadedTeardownPart } from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";

export interface PartCalloutPinProps {
  readonly store: ExplosionStore;
  readonly loadedPart: LoadedTeardownPart;
}

/**
 * Kept far below drei's default of sixteen million so a pin can never float over the site's own
 * navbar or a modal sheet; the viewport `<section>` is `isolate`d for the same reason.
 */
const PIN_Z_INDEX_RANGE = [20, 0];

/**
 * FIXED SCREEN SIZE, NOT SCALED WITH DISTANCE. drei's `distanceFactor` was tried and rejected:
 * it shrinks pins helpfully when the camera pulls back, but balloons them to fill the frame the
 * moment a part is framed up close. Crowding in the overview is handled by hiding every other
 * pin while one part is selected — the part panel carries the detail then, not the labels.
 */
export default function PartCalloutPin({ store, loadedPart }: PartCalloutPinProps) {
  const { selectedPartId, isAssemblyCollapsed } = useExplosionSnapshot(store);
  const [isOccluded, setIsOccluded] = useState(false);
  const isSelected = selectedPartId === loadedPart.part.id;
  const isAnotherPartSelected = selectedPartId !== null && !isSelected;
  const isHidden = isOccluded || isAnotherPartSelected || (isAssemblyCollapsed && !isSelected);

  function handlePinClick(): void {
    store.selectPart(isSelected ? null : loadedPart.part.id);
  }

  return (
    <Html
      position={loadedPart.pinAnchorLocal}
      center
      occlude="raycast"
      onOcclude={setIsOccluded}
      zIndexRange={PIN_Z_INDEX_RANGE}
      wrapperClass="pointer-events-none"
    >
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={handlePinClick}
        tabIndex={isHidden ? -1 : 0}
        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide whitespace-nowrap transition-opacity duration-200 ${
          isSelected
            ? "border-[#FF5500] bg-[#FF5500] text-[#08090A]"
            : "border-white/20 bg-[#0F1115]/90 text-white"
        } ${isHidden ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"}`}
      >
        {loadedPart.part.label}
      </button>
    </Html>
  );
}
