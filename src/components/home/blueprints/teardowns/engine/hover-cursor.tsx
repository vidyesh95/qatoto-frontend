// TRANSPORT: props-only — a leaf that turns the canvas cursor into a pointer over a part, so
// `ExplodedAssembly` itself never re-renders on hover.

"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";

/** Outside the component so the compiler sees a call, not a mutation of a hook's return value. */
function applyCanvasCursor(canvasElement: HTMLCanvasElement, cursor: string): void {
  canvasElement.style.cursor = cursor;
}

export default function HoverCursor({ store }: { readonly store: ExplosionStore }) {
  const canvasElement = useThree((state) => state.gl.domElement);
  const { hoveredPartId } = useExplosionSnapshot(store);
  const isHoveringPart = hoveredPartId !== null;

  useEffect(() => {
    applyCanvasCursor(canvasElement, isHoveringPart ? "pointer" : "grab");
    return () => applyCanvasCursor(canvasElement, "");
  }, [canvasElement, isHoveringPart]);

  return null;
}
