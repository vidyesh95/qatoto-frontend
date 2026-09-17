// THE EXPLODED-ASSEMBLY ARITHMETIC, which runs on the main thread of a page that is also driving
// a three.js scene.
//
// `computeExplosionVectors` is called once per model load over every part of the assembly, and its
// radial mode walks the parent chain per part — so it is the one piece of blueprint geometry whose
// cost grows with the size of the model a creator uploaded. Layered mode is a separate code path
// with no hierarchy walk at all, so both are measured.
//
// `stepFactorTowardTarget` is the per-frame integrator. One call is a handful of arithmetic ops;
// the benchmark runs the 240 frames of a four-second slider drag, which is the shape the animation
// loop actually executes.

import type { Bench } from "tinybench";

import {
  computeExplosionVectors,
  EXPLOSION_STIFFNESS_PER_SECOND,
  REDUCED_MOTION_STIFFNESS_PER_SECOND,
  stepFactorTowardTarget,
  type ExplosionAssemblyInput,
  type ExplosionPartInput,
} from "@/lib/blueprints/explosion";

/**
 * A three-tier assembly: 12 roots, each with 4 sub-assemblies, each with 4 parts — 240 parts, the
 * busy end of what the teardown viewer loads. A minority of parts carry an authored direction or
 * distance, as authored models do, so both the authored and the derived branches are exercised.
 */
function makeParts(rootCount: number, childrenPerPart: number): ExplosionPartInput[] {
  const parts: ExplosionPartInput[] = [];

  const push = (partId: string, parentPartId: string | null, seed: number, layerIndex: number) => {
    const centre = [Math.sin(seed) * 0.4, Math.cos(seed * 1.3) * 0.4, Math.sin(seed * 0.7) * 0.4];
    parts.push({
      partId,
      parentPartId,
      bounds: {
        min: [centre[0] - 0.05, centre[1] - 0.05, centre[2] - 0.05],
        max: [centre[0] + 0.05, centre[1] + 0.05, centre[2] + 0.05],
      },
      authoredDirection: seed % 7 === 0 ? [0, 1, 0] : null,
      authoredDistanceMm: seed % 11 === 0 ? 45 : null,
      layerIndex,
    });
  };

  let seed = 1;
  for (let rootIndex = 0; rootIndex < rootCount; rootIndex += 1) {
    const rootId = `root-${rootIndex}`;
    push(rootId, null, seed++, rootIndex % 6);
    for (let childIndex = 0; childIndex < childrenPerPart; childIndex += 1) {
      const childId = `${rootId}-sub-${childIndex}`;
      push(childId, rootId, seed++, (rootIndex + childIndex) % 6);
      for (let leafIndex = 0; leafIndex < childrenPerPart; leafIndex += 1) {
        push(`${childId}-leaf-${leafIndex}`, childId, seed++, (rootIndex + leafIndex) % 6);
      }
    }
  }
  return parts;
}

const parts = makeParts(12, 4);

const radialAssembly: ExplosionAssemblyInput = {
  bounds: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
  boundingSphereRadius: 0.87,
  explosionAxis: null,
};

const layeredAssembly: ExplosionAssemblyInput = { ...radialAssembly, explosionAxis: [0, 1, 0] };

export function registerExplosionBenchmarks(bench: Bench): void {
  bench
    .add(`blueprint explosion — computeExplosionVectors, radial, ${parts.length} parts`, () => {
      computeExplosionVectors(parts, radialAssembly);
    })
    .add(`blueprint explosion — computeExplosionVectors, layered, ${parts.length} parts`, () => {
      computeExplosionVectors(parts, layeredAssembly);
    })
    .add("blueprint explosion — stepFactorTowardTarget, 240 frames at 60 Hz", () => {
      let factor = 0;
      for (let frame = 0; frame < 240; frame += 1) {
        factor = stepFactorTowardTarget(factor, 1, 1 / 60, EXPLOSION_STIFFNESS_PER_SECOND);
      }
      return factor;
    })
    .add("blueprint explosion — stepFactorTowardTarget, 240 frames, reduced motion", () => {
      let factor = 0;
      for (let frame = 0; frame < 240; frame += 1) {
        factor = stepFactorTowardTarget(factor, 1, 1 / 60, REDUCED_MOTION_STIFFNESS_PER_SECOND);
      }
      return factor;
    });
}
