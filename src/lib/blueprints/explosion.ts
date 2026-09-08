// TRANSPORT: props-only — pure geometry. No I/O, no three.js, no React.
//
// THE ENGINE'S ARITHMETIC LIVES HERE, on plain tuples, so it can be read and reasoned about
// without a renderer in the room. The loader converts the results to `Vector3` once at load; the
// per-frame loop (`exploded-assembly.tsx`) then does exactly one `addScaledVector` per part:
//
//     P_exploded = P_origin + V_dir · distance · factor            factor ∈ [0, 1]
//
// where `V_dir` and `distance` are what `computeExplosionVectors` returns.
//
// UNITS: everything is in SCENE UNITS, which are metres because glTF §3.6.1 says so. The one
// place millimetres enter is an authored `explosionDistanceMm`, converted by the constant below.

export type Vector3Tuple = readonly [number, number, number];

export interface AxisAlignedBounds {
  readonly min: Vector3Tuple;
  readonly max: Vector3Tuple;
}

export interface ExplosionPartInput {
  readonly partId: string;
  readonly parentPartId: string | null;
  /** Root-space bounds, measured at load after flattening. */
  readonly bounds: AxisAlignedBounds;
  /** Need not be unit length; `null` means "derive from the centroids". */
  readonly authoredDirection: Vector3Tuple | null;
  /** `null` means "derive from the assembly's bounding sphere". */
  readonly authoredDistanceMm: number | null;
}

export interface ExplosionAssemblyInput {
  readonly bounds: AxisAlignedBounds;
  /** Scene units. Sets the scale of every auto-derived distance. */
  readonly boundingSphereRadius: number;
}

export interface ExplosionVector {
  readonly partId: string;
  /** Unit length, root space. */
  readonly direction: Vector3Tuple;
  /** Scene units, at `factor = 1`. */
  readonly distance: number;
}

/** glTF's unit is the metre (spec §3.6.1). */
export const GLTF_SCENE_UNITS_PER_MILLIMETRE = 0.001;

/**
 * THE FRICTION. `stepFactorTowardTarget` integrates `dx/dt = k · (target − x)` exactly, so a 30 Hz
 * and a 120 Hz display trace the same curve, and an exponential approach cannot overshoot — it is
 * the over-damped limit of a critically damped spring. At k = 9 s⁻¹ the time constant is 111 ms
 * and 95 % of the travel is done in about 330 ms, which is the "heavy but willing" feel the
 * reference site has. Reduced motion asks for k = 60: visually instant, still one integrator.
 */
export const EXPLOSION_STIFFNESS_PER_SECOND = 9;
export const REDUCED_MOTION_STIFFNESS_PER_SECOND = 60;
/** Half a slider step (the slider's `step` is 0.001): below this the loop snaps and stops. */
export const EXPLOSION_REST_EPSILON = 0.0005;
/** A tab that was hidden for a minute must not integrate a minute on its first frame back. */
export const MAX_FRAME_DELTA_SECONDS = 0.1;

/** A root part travels this fraction of the bounding-sphere radius at `factor = 1`. */
export const AUTO_DISTANCE_RADIUS_FRACTION = 0.6;
/** Each tier of `parentPartId` nesting fans out this much less than the tier above. */
export const CHILD_TIER_DISTANCE_FRACTION = 0.5;
/** Deeper than this is a cycle the contract failed to catch; the walk stops rather than spins. */
export const MAX_HIERARCHY_DEPTH = 8;

const DEGENERATE_DIRECTION_RADIUS_FRACTION = 1e-4;
const FALLBACK_DIRECTION: Vector3Tuple = [0, 1, 0];

export function stepFactorTowardTarget(
  currentFactor: number,
  targetFactor: number,
  deltaSeconds: number,
  stiffnessPerSecond: number,
): number {
  const clampedDeltaSeconds = Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DELTA_SECONDS);
  const blend = 1 - Math.exp(-stiffnessPerSecond * clampedDeltaSeconds);
  const nextFactor = currentFactor + (targetFactor - currentFactor) * blend;
  return Math.abs(targetFactor - nextFactor) < EXPLOSION_REST_EPSILON ? targetFactor : nextFactor;
}

export function isFactorAtRest(currentFactor: number, targetFactor: number): boolean {
  return currentFactor === targetFactor;
}

// --- Tuple helpers ---------------------------------------------------------------------------

function boundsCentre(bounds: AxisAlignedBounds): Vector3Tuple {
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
}

function subtract(left: Vector3Tuple, right: Vector3Tuple): Vector3Tuple {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function add(left: Vector3Tuple, right: Vector3Tuple): Vector3Tuple {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scale(vector: Vector3Tuple, scalar: number): Vector3Tuple {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function length(vector: Vector3Tuple): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

/** `null` for the zero vector, which has no direction. */
function normalise(vector: Vector3Tuple): Vector3Tuple | null {
  const magnitude = length(vector);
  return magnitude === 0 ? null : scale(vector, 1 / magnitude);
}

// --- The vectors -----------------------------------------------------------------------------

/**
 * How many `parentPartId` hops sit above a part. A root part is tier 0. Capped at
 * `MAX_HIERARCHY_DEPTH`, which is also the cycle guard for a tree the contract did not check.
 */
export function computeHierarchyTier(
  partId: string,
  parentPartIdById: ReadonlyMap<string, string | null>,
): number {
  let tier = 0;
  let ancestorId = parentPartIdById.get(partId) ?? null;
  while (ancestorId !== null && tier < MAX_HIERARCHY_DEPTH) {
    tier += 1;
    ancestorId = parentPartIdById.get(ancestorId) ?? null;
  }
  return tier;
}

/**
 * One direction and distance per part.
 *
 * AUTO DIRECTION is the unit vector from the reference centre to the part's centre — the parent
 * part's centre when there is one, the assembly's otherwise — so a child fans out from what it is
 * attached to, not from the middle of the whole machine. A part sitting ON its reference centre
 * (a coaxial shaft, a centred lid) has no such vector; it inherits its parent's own direction, or
 * `+Y` at the root, rather than dividing by zero.
 *
 * AUTO DISTANCE is `R · 0.6 · 0.5^tier`: a root part clears the assembly, each nested tier fans
 * out half as far again. An authored `explosionDistanceMm` replaces the whole product.
 *
 * TIERS COMPOSE. A child's total offset is its parent's total offset plus its own, so a
 * sub-assembly moves as a group and then opens up inside itself. The composed offset is what is
 * returned — as a unit direction and a magnitude — so the per-frame formula stays one line.
 */
export function computeExplosionVectors(
  parts: readonly ExplosionPartInput[],
  assembly: ExplosionAssemblyInput,
): ExplosionVector[] {
  const partById = new Map(parts.map((part) => [part.partId, part]));
  const parentPartIdById = new Map(parts.map((part) => [part.partId, part.parentPartId]));
  const assemblyCentre = boundsCentre(assembly.bounds);
  const degenerateThreshold = assembly.boundingSphereRadius * DEGENERATE_DIRECTION_RADIUS_FRACTION;
  const ownDirectionByPartId = new Map<string, Vector3Tuple>();
  const totalOffsetByPartId = new Map<string, Vector3Tuple>();

  function resolveParent(part: ExplosionPartInput): ExplosionPartInput | null {
    return part.parentPartId === null ? null : (partById.get(part.parentPartId) ?? null);
  }

  function ownDirection(part: ExplosionPartInput, depth: number): Vector3Tuple {
    const cached = ownDirectionByPartId.get(part.partId);
    if (cached !== undefined) return cached;

    const authored = part.authoredDirection === null ? null : normalise(part.authoredDirection);
    const parent = resolveParent(part);
    const reference = parent === null ? assemblyCentre : boundsCentre(parent.bounds);
    const offsetFromReference = subtract(boundsCentre(part.bounds), reference);
    const isDegenerate = length(offsetFromReference) < degenerateThreshold;
    const derived = isDegenerate ? null : normalise(offsetFromReference);
    const inherited =
      parent !== null && depth < MAX_HIERARCHY_DEPTH
        ? ownDirection(parent, depth + 1)
        : FALLBACK_DIRECTION;

    const direction = authored ?? derived ?? inherited;
    ownDirectionByPartId.set(part.partId, direction);
    return direction;
  }

  function ownDistance(part: ExplosionPartInput): number {
    if (part.authoredDistanceMm !== null) {
      return part.authoredDistanceMm * GLTF_SCENE_UNITS_PER_MILLIMETRE;
    }
    const tier = computeHierarchyTier(part.partId, parentPartIdById);
    return (
      assembly.boundingSphereRadius *
      AUTO_DISTANCE_RADIUS_FRACTION *
      CHILD_TIER_DISTANCE_FRACTION ** tier
    );
  }

  function totalOffset(part: ExplosionPartInput, depth: number): Vector3Tuple {
    const cached = totalOffsetByPartId.get(part.partId);
    if (cached !== undefined) return cached;

    const own = scale(ownDirection(part, 0), ownDistance(part));
    const parent = resolveParent(part);
    const composed =
      parent !== null && depth < MAX_HIERARCHY_DEPTH
        ? add(totalOffset(parent, depth + 1), own)
        : own;
    totalOffsetByPartId.set(part.partId, composed);
    return composed;
  }

  return parts.map((part) => {
    const offset = totalOffset(part, 0);
    return {
      partId: part.partId,
      direction: normalise(offset) ?? FALLBACK_DIRECTION,
      distance: length(offset),
    };
  });
}
