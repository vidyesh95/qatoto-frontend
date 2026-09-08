// TRANSPORT: props-only — pure colour arithmetic. No I/O, no three.js, no React.
//
// THE HEAT MAP IS A PER-VERTEX COLOUR BAKE, NOT A SHADER. The loader runs `computeVertexStressFraction`
// once per vertex at load and writes the result through `stressFractionToRgb` into a `color`
// attribute; a stock `MeshStandardMaterial` with `vertexColors` draws it. That is O(V) once, zero
// custom GLSL, identical on every GPU, and the HUD legend draws its chips from the same five stops
// so the two can never disagree.
//
// WHAT THE NUMBER MEANS: `stressRating` on a part is an AUTHOR-ASSIGNED fraction of yield in
// [0, 1] — a claim the author makes, not a solve this page ran. The spatial field below only makes
// a flat rating read like a field by concentrating it toward the part's mating face; it invents no
// data a flat tint would not have shown.

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** blue → cyan → green → yellow → red, at 0, 0.25, 0.5, 0.75 and 1 of yield. */
export const SPECTRAL_STRESS_STOPS: readonly RgbColor[] = [
  { r: 0x0b / 255, g: 0x3f / 255, b: 0xd6 / 255 },
  { r: 0, g: 0xd4 / 255, b: 0xff / 255 },
  { r: 0x22 / 255, g: 0xc5 / 255, b: 0x5e / 255 },
  { r: 0xfa / 255, g: 0xcc / 255, b: 0x15 / 255 },
  { r: 0xef / 255, g: 0x44 / 255, b: 0x44 / 255 },
];

/** The same five stops as CSS hex, for the legend and the toggle chip. */
export const SPECTRAL_STRESS_STOP_HEXES = [
  "#0B3FD6",
  "#00D4FF",
  "#22C55E",
  "#FACC15",
  "#EF4444",
] as const;

/** Parts with `stressRating: null`. Flat grey — "not simulated" must not read as "cold". */
export const NOT_SIMULATED_HEX = "#3A3F47";

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** GLSL's `smoothstep`, on the CPU. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clampUnit((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * `stressAtVertex = partStress · (0.6 + 0.4 · smoothstep(−1, 1, projected)) · (0.85 + 0.15 · facing)`
 *
 * `projected` is the vertex's position along the part's contact axis, −1 at the far face and +1
 * at the mating face; `facing` is how squarely the vertex normal looks along that axis. The first
 * factor concentrates stress toward the joint, the second brightens the faces that bear on it.
 */
export function computeVertexStressFraction(
  partStress: number,
  projectedAlongContactAxis: number,
  facingContact: number,
): number {
  const towardContact = smoothstep(-1, 1, projectedAlongContactAxis);
  return clampUnit(
    partStress * (0.6 + 0.4 * towardContact) * (0.85 + 0.15 * clampUnit(facingContact)),
  );
}

/** One fraction of yield → one colour on the five-stop ramp, linearly mixed within its band. */
export function stressFractionToRgb(fraction: number): RgbColor {
  const bandCount = SPECTRAL_STRESS_STOPS.length - 1;
  const scaled = clampUnit(fraction) * bandCount;
  const lowerIndex = Math.min(Math.floor(scaled), bandCount - 1);
  const mix = scaled - lowerIndex;
  const lower = SPECTRAL_STRESS_STOPS[lowerIndex];
  const upper = SPECTRAL_STRESS_STOPS[lowerIndex + 1];
  return {
    r: lower.r + (upper.r - lower.r) * mix,
    g: lower.g + (upper.g - lower.g) * mix,
    b: lower.b + (upper.b - lower.b) * mix,
  };
}
