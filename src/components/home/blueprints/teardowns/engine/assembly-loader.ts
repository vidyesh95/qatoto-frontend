// TRANSPORT: props-only — turns fetched `.glb` bytes plus the contract into a scene graph the
// frame loop can drive. Runs once per viewport, before the canvas mounts. No network of its own:
// the island fetches; this parses.
//
// WHY A RAW `GLTFLoader` AND NOT DREI'S `useGLTF`: `useGLTF` suspends and throws on a bad file,
// which only an error boundary can catch (this repo has none), keeps a global cache keyed by URL,
// and cannot run before the canvas exists. The house pattern wants `loading → ready | error` as
// VALUES in one place (`three-dimensional-model-viewer.tsx` is the precedent), and the island
// wants the parse result in hand before it mounts a `<Canvas>` at all.
//
// NODE FLATTENING IS THE TRICK THAT KEEPS THE MATH ONE LINE. After parsing, every listed part is
// re-parented straight under an identity root with `attach`, which preserves its world transform,
// so `part.position` IS its root-space position and the explosion is a translation in one shared
// frame — no per-frame matrix inversion however deeply the exporter nested things. Nodes the
// contract does not list stay where they were: under a listed ancestor they ride with it; under
// nothing listed they stay put.

import {
  Box3,
  type BufferGeometry,
  Group,
  type LineSegments,
  type Material,
  MathUtils,
  Matrix4,
  Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Sphere,
  Texture,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  bakeStressVertexColours,
  createNotSimulatedMaterial,
  createStressMaterial,
} from "@/components/home/blueprints/teardowns/engine/stress-materials";
import {
  type AxisAlignedBounds,
  computeExplosionVectors,
  type ExplosionPartInput,
  GLTF_SCENE_UNITS_PER_MILLIMETRE,
} from "@/lib/blueprints/explosion";
import type { TeardownAssembly, TeardownPart } from "@/lib/blueprints/schemas";

export interface FetchedModelFile {
  readonly url: string;
  readonly bytes: ArrayBuffer;
}

export interface LoadedTeardownPart {
  readonly part: TeardownPart;
  /** A direct child of `root` after flattening; its `position` is root space. */
  readonly object: Object3D;
  readonly meshes: readonly Mesh[];
  readonly originPosition: Vector3;
  /** Unit length, root space. */
  readonly explosionDirection: Vector3;
  /** Scene units at `factor = 1`. */
  readonly explosionDistance: number;
  /**
   * Where the callout pin hangs, in `object`'s frame; valid because only translation animates.
   * The TOP CORNER of the part's box, not the top centre: on a coaxial assembly the centre of
   * every ring sits on the shaft, and a pin there is occluded by the shaft itself.
   */
  readonly pinAnchorLocal: Vector3;
  /** Per-part clones of the file's own materials, `transparent` so opacity can animate. */
  readonly pbrMaterialsByMesh: ReadonlyMap<Mesh, readonly Material[]>;
  /** Vertex-colour heat map for a rated part, flat grey for an unrated one. */
  readonly stressMaterial: MeshStandardMaterial;
  /** Owned by the frame loop. */
  currentOpacity: number;
  /** Built lazily on the first X-ray toggle, disposed with the assembly. */
  edgeOverlays: readonly LineSegments[] | null;
}

export interface LoadedTeardownAssembly {
  readonly root: Group;
  readonly parts: readonly LoadedTeardownPart[];
  readonly partById: ReadonlyMap<string, LoadedTeardownPart>;
  readonly boundingBox: Box3;
  readonly boundingSphere: Sphere;
  /** The bounds at `factor = 1`, so the camera can pull back as the assembly opens. */
  readonly explodedBoundingBox: Box3;
  readonly explodedBoundingSphere: Sphere;
  /** Composite mode only: `nodeName`s the file did not contain. An authoring slip, surfaced. */
  readonly missingNodeNames: readonly string[];
  readonly dispose: () => void;
}

export type AssemblyParseResult =
  | { readonly success: true; readonly loadedAssembly: LoadedTeardownAssembly }
  | {
      readonly success: false;
      readonly error: {
        readonly code: "parse_failed" | "no_parts_matched";
        readonly message: string;
      };
    };

/** How far above a part's box top its pin hangs, as a fraction of the assembly radius. */
const PIN_LIFT_RADIUS_FRACTION = 0.06;

interface ResolvedPart {
  readonly part: TeardownPart;
  readonly object: Object3D;
}

async function parseGlbScene(bytes: ArrayBuffer): Promise<Group | null> {
  try {
    const gltf = await new GLTFLoader().parseAsync(bytes, "");
    return gltf.scene;
  } catch {
    return null;
  }
}

function toBounds(box: Box3): AxisAlignedBounds {
  return {
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
}

function collectMeshes(object: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  object.traverse((descendant) => {
    if (descendant instanceof Mesh) meshes.push(descendant);
  });
  return meshes;
}

function toMaterialList(material: Material | Material[]): Material[] {
  return Array.isArray(material) ? material : [material];
}

/** Resolve the contract's parts against the parsed file(s), in one exhaustive switch. */
async function resolveParts(
  files: readonly FetchedModelFile[],
  assembly: TeardownAssembly,
): Promise<
  | {
      readonly success: true;
      readonly root: Group;
      readonly resolved: ResolvedPart[];
      readonly missingNodeNames: string[];
    }
  | { readonly success: false; readonly message: string }
> {
  const root = new Group();
  root.name = "teardown_assembly_root";

  switch (assembly.kind) {
    case "composite": {
      const file = files.find((candidate) => candidate.url === assembly.model.url);
      if (file === undefined) return { success: false, message: "The model file was not fetched." };
      const scene = await parseGlbScene(file.bytes);
      if (scene === null) return { success: false, message: "This 3D model could not be read." };
      root.add(scene);
      root.updateMatrixWorld(true);

      const resolved: ResolvedPart[] = [];
      const missingNodeNames: string[] = [];
      for (const part of assembly.parts) {
        const object = scene.getObjectByName(part.nodeName);
        if (object === undefined) {
          missingNodeNames.push(part.nodeName);
        } else {
          resolved.push({ part, object });
        }
      }
      return { success: true, root, resolved, missingNodeNames };
    }
    case "individual_parts": {
      const resolved: ResolvedPart[] = [];
      for (const part of assembly.parts) {
        const file = files.find((candidate) => candidate.url === part.model.url);
        if (file === undefined) {
          return { success: false, message: `The file for "${part.label}" was not fetched.` };
        }
        const scene = await parseGlbScene(file.bytes);
        if (scene === null) {
          return { success: false, message: `The 3D model for "${part.label}" could not be read.` };
        }
        scene.name = part.id;
        if (part.placement !== null) {
          const [x, y, z] = part.placement.positionMm;
          scene.position.set(
            x * GLTF_SCENE_UNITS_PER_MILLIMETRE,
            y * GLTF_SCENE_UNITS_PER_MILLIMETRE,
            z * GLTF_SCENE_UNITS_PER_MILLIMETRE,
          );
          const [rotationX, rotationY, rotationZ] = part.placement.rotationDegrees;
          scene.rotation.set(
            MathUtils.degToRad(rotationX),
            MathUtils.degToRad(rotationY),
            MathUtils.degToRad(rotationZ),
          );
        }
        root.add(scene);
        resolved.push({ part, object: scene });
      }
      root.updateMatrixWorld(true);
      return { success: true, root, resolved, missingNodeNames: [] };
    }
    default: {
      const exhaustiveCheck: never = assembly;
      return exhaustiveCheck;
    }
  }
}

export async function parseTeardownAssembly(
  files: readonly FetchedModelFile[],
  assembly: TeardownAssembly,
): Promise<AssemblyParseResult> {
  const resolution = await resolveParts(files, assembly);
  if (!resolution.success) {
    return { success: false, error: { code: "parse_failed", message: resolution.message } };
  }
  const { root, resolved, missingNodeNames } = resolution;
  if (resolved.length === 0) {
    return {
      success: false,
      error: {
        code: "no_parts_matched",
        message: "None of the listed parts were found in the 3D model.",
      },
    };
  }

  // Bounds are measured BEFORE flattening and are world space; `attach` preserves every world
  // transform, so they stay valid afterwards.
  const boundingBox = new Box3().setFromObject(root, true);
  const boundingSphere = boundingBox.getBoundingSphere(new Sphere());
  const partBoxes = new Map(
    resolved.map(({ part, object }) => [part.id, new Box3().setFromObject(object, true)]),
  );

  for (const { object } of resolved) root.attach(object);
  root.updateMatrixWorld(true);

  const explosionVectors = computeExplosionVectors(
    resolved.map(({ part }): ExplosionPartInput => ({
      partId: part.id,
      parentPartId: part.parentPartId,
      bounds: toBounds(partBoxes.get(part.id) ?? boundingBox),
      authoredDirection: part.explosionDirection,
      authoredDistanceMm: part.explosionDistanceMm,
    })),
    { bounds: toBounds(boundingBox), boundingSphereRadius: boundingSphere.radius },
  );
  const explosionVectorByPartId = new Map(
    explosionVectors.map((vector) => [vector.partId, vector]),
  );

  const bakedGeometries = new Set<BufferGeometry>();
  const scratchCentre = new Vector3();
  const scratchSize = new Vector3();
  const scratchInverse = new Matrix4();

  const parts: LoadedTeardownPart[] = resolved.map(({ part, object }) => {
    const partBox = partBoxes.get(part.id) ?? boundingBox;
    const vector = explosionVectorByPartId.get(part.id);
    const explosionDirection =
      vector === undefined ? new Vector3(0, 1, 0) : new Vector3(...vector.direction);
    const explosionDistance = vector?.distance ?? 0;

    const meshes = collectMeshes(object);
    const pbrMaterialsByMesh = new Map<Mesh, readonly Material[]>();
    for (const mesh of meshes) {
      const clones = toMaterialList(mesh.material).map((material) => {
        const clone = material.clone();
        clone.transparent = true;
        return clone;
      });
      mesh.material = Array.isArray(mesh.material) ? clones : (clones[0] ?? mesh.material);
      pbrMaterialsByMesh.set(mesh, clones);
    }

    // The contact face is the one the part explodes AWAY from.
    const contactAxisWorld = explosionDirection.clone().negate();
    partBox.getCenter(scratchCentre);
    partBox.getSize(scratchSize);
    const halfExtentAlongAxis =
      0.5 *
      (scratchSize.x * Math.abs(contactAxisWorld.x) +
        scratchSize.y * Math.abs(contactAxisWorld.y) +
        scratchSize.z * Math.abs(contactAxisWorld.z));

    const stressMaterial =
      part.stressRating === null ? createNotSimulatedMaterial() : createStressMaterial();
    if (part.stressRating !== null) {
      for (const mesh of meshes) {
        // Two parts sharing one geometry cannot share one heat map, so the second bake clones.
        if (bakedGeometries.has(mesh.geometry)) mesh.geometry = mesh.geometry.clone();
        bakedGeometries.add(mesh.geometry);
        scratchInverse.copy(mesh.matrixWorld).invert();
        bakeStressVertexColours(
          mesh.geometry,
          {
            axis: contactAxisWorld.clone().transformDirection(scratchInverse),
            centre: mesh.worldToLocal(scratchCentre.clone()),
            halfExtentAlongAxis,
          },
          part.stressRating,
        );
      }
    }

    const pinAnchorWorld = new Vector3(
      partBox.max.x,
      partBox.max.y + boundingSphere.radius * PIN_LIFT_RADIUS_FRACTION,
      partBox.max.z,
    );

    return {
      part,
      object,
      meshes,
      originPosition: object.position.clone(),
      explosionDirection,
      explosionDistance,
      pinAnchorLocal: object.worldToLocal(pinAnchorWorld),
      pbrMaterialsByMesh,
      stressMaterial,
      currentOpacity: 1,
      edgeOverlays: null,
    };
  });

  const partById = new Map(parts.map((loadedPart) => [loadedPart.part.id, loadedPart]));

  // Every part's box, translated to where it sits fully exploded, unioned.
  const explodedBox = new Box3();
  const scratchOffset = new Vector3();
  for (const loadedPart of parts) {
    const partBox = (partBoxes.get(loadedPart.part.id) ?? boundingBox).clone();
    scratchOffset.copy(loadedPart.explosionDirection).multiplyScalar(loadedPart.explosionDistance);
    explodedBox.union(partBox.translate(scratchOffset));
  }
  const explodedBoundingSphere = explodedBox.getBoundingSphere(new Sphere());

  function dispose(): void {
    const disposedGeometries = new Set<BufferGeometry>();
    const disposedMaterials = new Set<Material>();
    const disposedTextures = new Set<Texture>();

    function disposeMaterial(material: Material): void {
      if (disposedMaterials.has(material)) return;
      disposedMaterials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      }
      material.dispose();
    }

    root.traverse((descendant) => {
      if (!(descendant instanceof Mesh)) return;
      if (!disposedGeometries.has(descendant.geometry)) {
        disposedGeometries.add(descendant.geometry);
        descendant.geometry.dispose();
      }
      for (const material of toMaterialList(descendant.material)) disposeMaterial(material);
    });
    for (const loadedPart of parts) {
      for (const materials of loadedPart.pbrMaterialsByMesh.values()) {
        for (const material of materials) disposeMaterial(material);
      }
      disposeMaterial(loadedPart.stressMaterial);
      for (const overlay of loadedPart.edgeOverlays ?? []) {
        overlay.geometry.dispose();
        for (const material of toMaterialList(overlay.material)) disposeMaterial(material);
      }
    }
  }

  return {
    success: true,
    loadedAssembly: {
      root,
      parts,
      partById,
      boundingBox,
      boundingSphere,
      explodedBoundingBox: explodedBox,
      explodedBoundingSphere,
      missingNodeNames,
      dispose,
    },
  };
}
