// TRANSPORT: props-only — builds the heat-map materials for one part; no I/O.
//
// THE HEAT MAP IS BAKED INTO VERTEX COLOURS AT LOAD, then drawn by a stock `MeshStandardMaterial`
// with `vertexColors`. No custom shader on either side of the swap, which is what makes the
// toggle a plain `mesh.material =` assignment in the frame loop. The arithmetic itself lives in
// `src/lib/blueprints/stress-ramp.ts` where it can be read without three.js.

import {
  type BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  type Vector3,
} from "three";

import {
  computeVertexStressFraction,
  NOT_SIMULATED_HEX,
  stressFractionToRgb,
} from "@/lib/blueprints/stress-ramp";

const STRESS_MATERIAL_ROUGHNESS = 0.55;
const STRESS_MATERIAL_METALNESS = 0.05;

/** For a part with a `stressRating`: reads the baked `color` attribute. */
export function createStressMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    vertexColors: true,
    roughness: STRESS_MATERIAL_ROUGHNESS,
    metalness: STRESS_MATERIAL_METALNESS,
    transparent: true,
  });
}

/** For a part with `stressRating: null`. Flat grey — "not simulated" must not read as "cold". */
export function createNotSimulatedMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(NOT_SIMULATED_HEX),
    roughness: 0.8,
    metalness: 0,
    transparent: true,
  });
}

/**
 * The contact frame of one part, in the frame of the mesh being baked. `axis` points from the part
 * toward the face it mates against (the reverse of its explosion direction); `centre` is the part's
 * centre; `halfExtentAlongAxis` is half the part's size projected on the axis, so `projected`
 * spans −1 at the far face to +1 at the mating face.
 */
export interface StressContactFrame {
  readonly axis: Vector3;
  readonly centre: Vector3;
  readonly halfExtentAlongAxis: number;
}

/**
 * Writes a `color` attribute onto the geometry from the part's authored stress fraction. O(V),
 * once. The caller guarantees the geometry is not shared with another part (it clones first), so
 * mutating it in place is safe.
 */
export function bakeStressVertexColours(
  geometry: BufferGeometry,
  contactFrame: StressContactFrame,
  partStress: number,
): void {
  if (geometry.getAttribute("normal") === undefined) geometry.computeVertexNormals();
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const halfExtent = Math.max(contactFrame.halfExtentAlongAxis, Number.EPSILON);
  const { axis, centre } = contactFrame;
  const colours = new Float32Array(positions.count * 3);

  for (let vertexIndex = 0; vertexIndex < positions.count; vertexIndex += 1) {
    const projected =
      ((positions.getX(vertexIndex) - centre.x) * axis.x +
        (positions.getY(vertexIndex) - centre.y) * axis.y +
        (positions.getZ(vertexIndex) - centre.z) * axis.z) /
      halfExtent;
    const facing =
      normals.getX(vertexIndex) * axis.x +
      normals.getY(vertexIndex) * axis.y +
      normals.getZ(vertexIndex) * axis.z;
    const { r, g, b } = stressFractionToRgb(
      computeVertexStressFraction(partStress, projected, facing),
    );
    colours[vertexIndex * 3] = r;
    colours[vertexIndex * 3 + 1] = g;
    colours[vertexIndex * 3 + 2] = b;
  }

  geometry.setAttribute("color", new Float32BufferAttribute(colours, 3));
}
