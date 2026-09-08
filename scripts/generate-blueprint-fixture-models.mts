// ONE-OFF GENERATOR, NOT A BUILD STEP. Writes the procedural `.glb` fixtures and the placeholder
// manufacturing files under `public/dummy/blueprints/`, which are COMMITTED — the same
// arrangement as the eight placeholder PDFs beside them. Run with `pnpm fixtures:blueprint-models`
// and paste the byte counts it prints into `src/mocks/blueprints-mocks.ts`. It rewrites nothing
// under `src/` on purpose: a generator that edits a hand-authored fixture is the staging area that
// quietly becomes production.
//
// DETERMINISTIC. No dates, no random ids; `GLTFExporter` writes only names, geometry, materials
// and a version string, so re-running produces byte-identical files and an empty diff.
//
// THESE ARE MODELLED, NOT BLOCKED OUT, and the difference is the whole point of the fixture. A raw
// `BoxGeometry` corner is the clearest possible "this is a placeholder" signal, so every visible
// edge is chamfered (`RoundedBoxGeometry`), the enclosure is a TRAY with walls and a cavity rather
// than a slab, and the board carries pads, chips and a connector. Material separation is by
// roughness and metalness, not by colour alone — that is what makes aluminium read as metal beside
// moulded ABS under the same light.
//
// A PART MAY BE A GROUP. The loader resolves a `nodeName` to any `Object3D` and traverses it for
// meshes, so `pcb` is a group of four meshes with four materials. One mesh per material; one node
// per contract part.
//
// TWO ASSEMBLIES, TWO INGESTION MODES. The solar controller is exported as ONE composite file whose
// node names are the fixture's `nodeName`s. The borehole pump is exported as SIX per-part files —
// the shape a user upload takes — five of them in assembly coordinates and one (`seal_carrier`) at
// its own origin, so the fixture's explicit `placement` branch is exercised too.
//
// UNITS: the scene is built in METRES (glTF's unit); every dimension below is written in mm and
// divided once, so the numbers here read like a drawing.
//
// NO `@/` IMPORTS — Node does not resolve the alias. The node names below are a literal list and
// must byte-match `nodeName` in the fixture; change one, change both.

import { mkdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  type BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Path,
  Scene,
  Shape,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// --- FileReader polyfill ------------------------------------------------------------------------
// The exporter's binary path reads a Blob through `FileReader`, which Node does not have.
// `Blob#arrayBuffer()` is the whole of what it needs. The exporter assigns `onloadend` AFTER
// calling `readAsArrayBuffer`, so the read must resolve on a later tick — a promise does that.

class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    void this.finishRead(blob, (buffer) => buffer);
  }

  readAsDataURL(blob: Blob): void {
    void this.finishRead(
      blob,
      (buffer) => `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`,
    );
  }

  private async finishRead(
    blob: Blob,
    toResult: (buffer: ArrayBuffer) => ArrayBuffer | string,
  ): Promise<void> {
    this.result = toResult(await blob.arrayBuffer());
    this.onloadend?.();
  }
}

if (typeof FileReader === "undefined") {
  Object.defineProperty(globalThis, "FileReader", { value: NodeFileReader });
}

// --- Units and materials ------------------------------------------------------------------------

const MILLIMETRES_PER_METRE = 1000;
type Millimetres3 = readonly [number, number, number];

/** mm -> scene metres. Every dimension in this file goes through here exactly once. */
function mm(millimetres: number): number {
  return millimetres / MILLIMETRES_PER_METRE;
}

/**
 * ROUGHNESS AND METALNESS DO THE WORK, not the colour. Two grey parts at the same hue read as
 * anodised aluminium and moulded ABS only because one is metallic and sharp and the other is
 * dielectric and soft. Under `RoomEnvironment` that difference is what sells the render.
 */
const MATERIALS = {
  absShell: new MeshStandardMaterial({
    color: 0xe8eaec,
    roughness: 0.55,
    metalness: 0,
    name: "abs_shell",
  }),
  absShellDark: new MeshStandardMaterial({
    color: 0xb4bcc2,
    roughness: 0.6,
    metalness: 0,
    name: "abs_shell_dark",
  }),
  fr4: new MeshStandardMaterial({
    color: 0x0f5132,
    roughness: 0.6,
    metalness: 0.05,
    name: "fr4_solder_mask",
  }),
  gold: new MeshStandardMaterial({
    color: 0xd4a017,
    roughness: 0.3,
    metalness: 1,
    name: "enig_gold",
  }),
  epoxy: new MeshStandardMaterial({
    color: 0x1b1d20,
    roughness: 0.5,
    metalness: 0,
    name: "moulded_epoxy",
  }),
  aluminium: new MeshStandardMaterial({
    color: 0xc9ccd0,
    roughness: 0.25,
    metalness: 0.9,
    name: "aluminium_6063",
  }),
  tinnedSteel: new MeshStandardMaterial({
    color: 0xb8bec4,
    roughness: 0.28,
    metalness: 0.85,
    name: "tinned_steel",
  }),
  springSteel: new MeshStandardMaterial({
    color: 0x8b9197,
    roughness: 0.35,
    metalness: 0.8,
    name: "spring_steel",
  }),
  pa66: new MeshStandardMaterial({
    color: 0x1f7a4d,
    roughness: 0.55,
    metalness: 0,
    name: "pa66_terminal",
  }),
  pvcJacket: new MeshStandardMaterial({
    color: 0xd8a33a,
    roughness: 0.45,
    metalness: 0,
    name: "pvc_jacket",
  }),
  stainless: new MeshStandardMaterial({
    color: 0xb6bbc0,
    roughness: 0.3,
    metalness: 0.92,
    name: "stainless_316",
  }),
  bronze: new MeshStandardMaterial({
    color: 0xb08d57,
    roughness: 0.4,
    metalness: 0.85,
    name: "cast_bronze",
  }),
  petg: new MeshStandardMaterial({
    color: 0x3b6fd6,
    roughness: 0.5,
    metalness: 0,
    name: "petg_printed",
  }),
} as const;
type MaterialKey = keyof typeof MATERIALS;

// --- Geometry helpers ---------------------------------------------------------------------------

/** A chamfered box. `radiusMm` is the corner radius; segments 2 is enough at fixture scale. */
function roundedBoxMm(
  widthMm: number,
  heightMm: number,
  depthMm: number,
  radiusMm: number,
): RoundedBoxGeometry {
  return new RoundedBoxGeometry(mm(widthMm), mm(heightMm), mm(depthMm), 1, mm(radiusMm));
}

function cylinderMm(radiusMm: number, heightMm: number, radialSegments = 20): CylinderGeometry {
  return new CylinderGeometry(mm(radiusMm), mm(radiusMm), mm(heightMm), radialSegments);
}

/** A rounded rectangle in the XY plane, centred on the origin — the profile every shell extrudes. */
function roundedRectShape(widthMm: number, heightMm: number, cornerRadiusMm: number): Shape {
  const halfWidth = mm(widthMm) / 2;
  const halfHeight = mm(heightMm) / 2;
  const radius = mm(cornerRadiusMm);
  const shape = new Shape();
  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
  return shape;
}

/** The same outline as a `Path`, so it can be punched into a `Shape` as a hole. */
function roundedRectHole(widthMm: number, heightMm: number, cornerRadiusMm: number): Path {
  return new Path(roundedRectShape(widthMm, heightMm, cornerRadiusMm).getPoints(8));
}

/**
 * `mergeGeometries` refuses a mixed batch: every input must be indexed or none may be.
 * `ExtrudeGeometry` produces non-indexed geometry while `RoundedBoxGeometry` and
 * `CylinderGeometry` produce indexed, and every part here mixes the two — so everything is
 * flattened to non-indexed first.
 *
 * ⚠️ THEN RE-INDEXED, and that second step is not optional. Flattening triples the vertex data,
 * and skipping `mergeVertices` shipped a 2.2 MB controller — a mock that downloads on the page and
 * lives in git. Re-indexing brings it back under a couple of hundred kilobytes. `mergeVertices`
 * compares position, normal and uv together, so a chamfer's hard edge survives the deduplication.
 */
function mergeOrThrow(geometries: readonly BufferGeometry[], partName: string): BufferGeometry {
  const unindexed = geometries.map((geometry) =>
    geometry.index === null ? geometry : geometry.toNonIndexed(),
  );
  const merged = mergeGeometries(unindexed);
  if (merged === null) throw new Error(`Geometry for "${partName}" did not merge.`);
  return mergeVertices(merged);
}

/**
 * `ExtrudeGeometry` builds along +Z from a profile in XY. Every shell here is a horizontal plate,
 * so the result is rotated onto +Y once and shifted so `originYMm` is its underside.
 */
function extrudeUpwards(shape: Shape, depthMm: number, originYMm: number): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: mm(depthMm),
    bevelEnabled: true,
    bevelThickness: mm(0.4),
    bevelSize: mm(0.4),
    bevelSegments: 1,
    curveSegments: 4,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, mm(originYMm), 0);
  return geometry;
}

function addMesh(
  parent: Object3D,
  nodeName: string,
  geometry: BufferGeometry,
  material: MaterialKey,
  positionMm: Millimetres3 = [0, 0, 0],
): Mesh {
  const mesh = new Mesh(geometry, MATERIALS[material]);
  mesh.name = nodeName;
  mesh.position.set(mm(positionMm[0]), mm(positionMm[1]), mm(positionMm[2]));
  parent.add(mesh);
  return mesh;
}

// --- The solar cold-storage controller ----------------------------------------------------------
// Nesting IS the `parentPartId` tree in `blueprints-mocks.ts`. Change one, change both.

const ENCLOSURE_WIDTH_MM = 160;
const ENCLOSURE_DEPTH_MM = 100;
const ENCLOSURE_CORNER_MM = 7;
const WALL_THICKNESS_MM = 3;
const FLOOR_THICKNESS_MM = 3;
// THE WALLS ARE SIZED FROM THE TALLEST INTERNAL PART, not picked. The stack is floor 0-3, screw
// bosses 3-17, board 17-18.6, and the heatsink on top of that reaching 32.6 — so 32 mm of wall
// clears it with a little air, and the lid's lip lands on the rim at 35. Shortening any of these
// without redoing the arithmetic puts the heatsink through the lid, which is exactly what the
// first cut of this file did.
const WALL_HEIGHT_MM = 32;
const BOARD_UNDERSIDE_MM = 17;
const LID_UNDERSIDE_MM = FLOOR_THICKNESS_MM + WALL_HEIGHT_MM + 3;

/** A tray: a floor, a rim of walls punched out of the same profile, and four screw bosses. */
function enclosureBaseGeometry(): BufferGeometry {
  const outerShape = roundedRectShape(ENCLOSURE_WIDTH_MM, ENCLOSURE_DEPTH_MM, ENCLOSURE_CORNER_MM);
  const floor = extrudeUpwards(outerShape, FLOOR_THICKNESS_MM, 0);

  const wallShape = roundedRectShape(ENCLOSURE_WIDTH_MM, ENCLOSURE_DEPTH_MM, ENCLOSURE_CORNER_MM);
  wallShape.holes.push(
    roundedRectHole(
      ENCLOSURE_WIDTH_MM - WALL_THICKNESS_MM * 2,
      ENCLOSURE_DEPTH_MM - WALL_THICKNESS_MM * 2,
      ENCLOSURE_CORNER_MM - WALL_THICKNESS_MM,
    ),
  );
  const walls = extrudeUpwards(wallShape, WALL_HEIGHT_MM, FLOOR_THICKNESS_MM);

  const bossPositions: readonly (readonly [number, number])[] = [
    [66, 36],
    [-66, 36],
    [66, -36],
    [-66, -36],
  ];
  const bosses = bossPositions.map(([x, z]) =>
    cylinderMm(4.5, 14, 16).translate(mm(x), mm(FLOOR_THICKNESS_MM + 7), mm(z)),
  );

  return mergeOrThrow([floor, walls, ...bosses], "enclosure_base");
}

/** The lid, with a moulded lip that drops into the tray. */
function enclosureLidGeometry(): BufferGeometry {
  const plate = extrudeUpwards(
    roundedRectShape(ENCLOSURE_WIDTH_MM, ENCLOSURE_DEPTH_MM, ENCLOSURE_CORNER_MM),
    4,
    0,
  );
  const lipShape = roundedRectShape(
    ENCLOSURE_WIDTH_MM - WALL_THICKNESS_MM * 2 - 0.6,
    ENCLOSURE_DEPTH_MM - WALL_THICKNESS_MM * 2 - 0.6,
    ENCLOSURE_CORNER_MM - WALL_THICKNESS_MM,
  );
  lipShape.holes.push(
    roundedRectHole(
      ENCLOSURE_WIDTH_MM - WALL_THICKNESS_MM * 2 - 4,
      ENCLOSURE_DEPTH_MM - WALL_THICKNESS_MM * 2 - 4,
      ENCLOSURE_CORNER_MM - WALL_THICKNESS_MM,
    ),
  );
  const lip = extrudeUpwards(lipShape, 3, -3);
  return mergeOrThrow([plate, lip], "enclosure_lid");
}

const BOARD_WIDTH_MM = 140;
const BOARD_DEPTH_MM = 84;
const BOARD_THICKNESS_MM = 1.6;

/**
 * The board is a GROUP, not a mesh: four materials — solder mask, ENIG pads, moulded packages and
 * a tinned connector shell. The loader traverses a part node for its meshes, so a group is a legal
 * part, and this is what stops the Components tab showing a flat green slab.
 */
function buildControlBoard(): Group {
  const board = new Group();
  board.name = "pcb";

  const outline = roundedRectShape(BOARD_WIDTH_MM, BOARD_DEPTH_MM, 3);
  const mountingHoles: readonly (readonly [number, number])[] = [
    [64, 34],
    [-64, 34],
    [64, -34],
    [-64, -34],
  ];
  for (const [x, z] of mountingHoles) {
    const hole = new Path();
    hole.absarc(mm(x), mm(z), mm(2.2), 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  addMesh(board, "pcb_substrate", extrudeUpwards(outline, BOARD_THICKNESS_MM, 0), "fr4");

  // Plated rings around the mounting holes, plus two rows of pads down the middle.
  const padGeometries: BufferGeometry[] = mountingHoles.map(([x, z]) =>
    cylinderMm(3.6, BOARD_THICKNESS_MM + 0.1, 20).translate(
      mm(x),
      mm(BOARD_THICKNESS_MM / 2),
      mm(z),
    ),
  );
  for (let padIndex = 0; padIndex < 8; padIndex += 1) {
    const x = -42 + padIndex * 12;
    padGeometries.push(
      roundedBoxMm(4.5, 0.2, 2, 0.1).translate(mm(x), mm(BOARD_THICKNESS_MM + 0.1), mm(-26)),
      roundedBoxMm(4.5, 0.2, 2, 0.1).translate(mm(x), mm(BOARD_THICKNESS_MM + 0.1), mm(30)),
    );
  }
  addMesh(board, "pcb_pads", mergeOrThrow(padGeometries, "pcb_pads"), "gold");

  // Moulded packages: one large controller, two mid-size drivers, a scatter of passives.
  const packageGeometries: BufferGeometry[] = [
    roundedBoxMm(26, 3.2, 26, 0.5).translate(mm(-8), mm(BOARD_THICKNESS_MM + 1.6), mm(2)),
    roundedBoxMm(12, 2.4, 12, 0.4).translate(mm(-38), mm(BOARD_THICKNESS_MM + 1.2), mm(14)),
    roundedBoxMm(12, 2.4, 12, 0.4).translate(mm(-38), mm(BOARD_THICKNESS_MM + 1.2), mm(-12)),
    roundedBoxMm(9, 2, 6, 0.3).translate(mm(16), mm(BOARD_THICKNESS_MM + 1), mm(-24)),
    roundedBoxMm(9, 2, 6, 0.3).translate(mm(16), mm(BOARD_THICKNESS_MM + 1), mm(26)),
  ];
  for (let passiveIndex = 0; passiveIndex < 8; passiveIndex += 1) {
    packageGeometries.push(
      roundedBoxMm(3.2, 1.2, 1.6, 0.2).translate(
        mm(-54 + passiveIndex * 6),
        mm(BOARD_THICKNESS_MM + 0.6),
        mm(passiveIndex % 2 === 0 ? 18 : -18),
      ),
    );
  }
  addMesh(board, "pcb_packages", mergeOrThrow(packageGeometries, "pcb_packages"), "epoxy");

  // A USB-C shell overhanging the board edge, plus an electrolytic can.
  const connector = roundedBoxMm(9, 3.2, 7.5, 1.2).translate(
    mm(-BOARD_WIDTH_MM / 2 - 1),
    mm(BOARD_THICKNESS_MM + 1.6),
    mm(0),
  );
  const capacitor = cylinderMm(5, 11, 20).translate(mm(34), mm(BOARD_THICKNESS_MM + 5.5), mm(20));
  addMesh(
    board,
    "pcb_connectors",
    mergeOrThrow([connector, capacitor], "pcb_connectors"),
    "tinnedSteel",
  );

  return board;
}

/** A finned extrusion on a base plate, the way a real clip-on heatsink is made. */
function heatsinkGeometry(): BufferGeometry {
  const basePlate = roundedBoxMm(34, 4, 28, 0.8);
  const fins: BufferGeometry[] = [];
  for (let finIndex = 0; finIndex < 7; finIndex += 1) {
    fins.push(roundedBoxMm(30, 10, 1.6, 0.4).translate(0, mm(7), mm(-12 + finIndex * 4)));
  }
  return mergeOrThrow([basePlate, ...fins], "heatsink");
}

/**
 * A TO-247, LYING FLAT the way one clamped to a heatsink actually sits: moulded body, exposed
 * tab, three legs bent down to the board. Standing it upright made it the tallest thing in the
 * enclosure at 27 mm, which is neither how it is fitted nor something the lid could close over.
 */
function transistorGeometry(): BufferGeometry {
  const body = roundedBoxMm(15.5, 5, 20, 0.8);
  const tab = roundedBoxMm(15.5, 1.4, 6, 0.4).translate(0, mm(1.8), mm(-13));
  const legs: BufferGeometry[] = [-5.4, 0, 5.4].map((legX) =>
    roundedBoxMm(1.2, 0.6, 9, 0.2).translate(mm(legX), mm(-2.2), mm(14.5)),
  );
  return mergeOrThrow([body, tab, ...legs], "mosfet");
}

/** A three-way terminal block: moulded housing, three wire ports, three screw heads. */
function terminalBlockGeometry(): BufferGeometry {
  const housing = roundedBoxMm(50, 14, 11, 1.2);
  const parts: BufferGeometry[] = [housing];
  for (let portIndex = 0; portIndex < 3; portIndex += 1) {
    const x = -16 + portIndex * 16;
    parts.push(cylinderMm(2.6, 2.4, 16).translate(mm(x), mm(7.2), 0));
  }
  return mergeOrThrow(parts, "terminal_block");
}

/** Jacketed twisted pair with the moulded bead at the sensing end. */
function thermistorHarnessGeometry(): BufferGeometry {
  const jacket = cylinderMm(1.6, 62, 14).rotateZ(Math.PI / 2);
  const bead = roundedBoxMm(5, 3.4, 3.4, 1.4).translate(mm(-32), 0, 0);
  return mergeOrThrow([jacket, bead], "thermistor_harness");
}

/** Formed spring steel: a back plate, a returned lip and the sprung tongue. */
function dinClipGeometry(): BufferGeometry {
  const backPlate = roundedBoxMm(36, 1.2, 22, 0.4);
  const upperLip = roundedBoxMm(36, 5, 1.2, 0.4).translate(0, mm(2.4), mm(10.4));
  const lowerLip = roundedBoxMm(36, 5, 1.2, 0.4).translate(0, mm(2.4), mm(-10.4));
  const tongue = roundedBoxMm(14, 1, 8, 0.3).translate(0, mm(-1.6), mm(-7));
  return mergeOrThrow([backPlate, upperLip, lowerLip, tongue], "din_clip");
}

function buildSolarColdStorageController(): Scene {
  const scene = new Scene();
  const root = new Group();
  root.name = "solar_cold_storage_controller";
  scene.add(root);

  const enclosureBase = addMesh(root, "enclosure_base", enclosureBaseGeometry(), "absShell");
  addMesh(root, "enclosure_lid", enclosureLidGeometry(), "absShellDark", [0, LID_UNDERSIDE_MM, 0]);

  const controlBoard = buildControlBoard();
  controlBoard.position.set(0, mm(BOARD_UNDERSIDE_MM), 0);
  enclosureBase.add(controlBoard);

  // Y is board-relative from here: the substrate occupies 0 to 1.6, so everything sits above 1.6.
  addMesh(controlBoard, "heatsink", heatsinkGeometry(), "aluminium", [40, 3.6, 0]);
  addMesh(controlBoard, "mosfet_q1", transistorGeometry(), "epoxy", [40, 4.1, -24]);
  addMesh(controlBoard, "mosfet_q2", transistorGeometry(), "epoxy", [40, 4.1, 24]);
  addMesh(controlBoard, "terminal_block", terminalBlockGeometry(), "pa66", [-40, 8.6, 30]);
  addMesh(
    controlBoard,
    "thermistor_harness",
    thermistorHarnessGeometry(),
    "pvcJacket",
    [-38, 3.2, -24],
  );

  addMesh(enclosureBase, "din_clip", dinClipGeometry(), "springSteel", [0, -1.2, 0]);
  return scene;
}

// --- The borehole pump --------------------------------------------------------------------------

/** A ring: a disc profile with a concentric bore punched through it. */
function ringGeometry(
  outerRadiusMm: number,
  boreRadiusMm: number,
  heightMm: number,
): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, mm(outerRadiusMm), 0, Math.PI * 2, false);
  const bore = new Path();
  bore.absarc(0, 0, mm(boreRadiusMm), 0, Math.PI * 2, true);
  shape.holes.push(bore);
  return extrudeUpwards(shape, heightMm, -heightMm / 2);
}

/** A flanged casting: the barrel, a bolted flange at each end, and the bolt holes in them. */
function pumpHousingGeometry(): BufferGeometry {
  const barrel = ringGeometry(60, 52, 300);
  const flanges = [150, -150].map((flangeY) =>
    ringGeometry(74, 52, 12).translate(0, mm(flangeY), 0),
  );
  const boltHoles: BufferGeometry[] = [];
  for (let boltIndex = 0; boltIndex < 6; boltIndex += 1) {
    const angle = (boltIndex / 6) * Math.PI * 2;
    for (const flangeY of [150, -150]) {
      boltHoles.push(
        cylinderMm(3, 14, 12).translate(
          Math.cos(angle) * mm(67),
          mm(flangeY),
          Math.sin(angle) * mm(67),
        ),
      );
    }
  }
  return mergeOrThrow([barrel, ...flanges, ...boltHoles], "housing");
}

/** A shaft with a machined step and a keyway shoulder. */
function pumpShaftGeometry(): BufferGeometry {
  const mainShaft = cylinderMm(10, 460, 24);
  const shoulder = cylinderMm(14, 16, 24).translate(0, mm(-176), 0);
  const collar = cylinderMm(13, 10, 24).translate(0, mm(120), 0);
  return mergeOrThrow([mainShaft, shoulder, collar], "shaft");
}

/** A shrouded impeller: hub, back shroud, and six extruded vanes. */
function impellerGeometry(): BufferGeometry {
  const shroud = ringGeometry(45, 11, 6).translate(0, mm(-12), 0);
  const hub = cylinderMm(16, 30, 24);
  const vanes: BufferGeometry[] = [];
  for (let vaneIndex = 0; vaneIndex < 6; vaneIndex += 1) {
    const angle = (vaneIndex / 6) * Math.PI * 2;
    const vane = roundedBoxMm(30, 18, 3, 0.8);
    vane.rotateY(angle);
    vane.translate(Math.cos(angle) * mm(20), 0, Math.sin(angle) * mm(20));
    vanes.push(vane);
  }
  return mergeOrThrow([hub, shroud, ...vanes], "impeller");
}

/** A printed carrier: a flanged ring with a lip that registers into the housing bore. */
function sealCarrierGeometry(): BufferGeometry {
  const flange = ringGeometry(30, 12, 8);
  const lip = ringGeometry(24, 12, 12).translate(0, mm(-10), 0);
  return mergeOrThrow([flange, lip], "seal_carrier");
}

/** A deep-groove bearing: outer race, inner race, and the ball track between them. */
function bearingGeometry(): BufferGeometry {
  const outerRace = ringGeometry(20, 16, 12);
  const innerRace = ringGeometry(13.5, 10, 12);
  const balls: BufferGeometry[] = [];
  for (let ballIndex = 0; ballIndex < 9; ballIndex += 1) {
    const angle = (ballIndex / 9) * Math.PI * 2;
    balls.push(
      cylinderMm(2.4, 5, 10).translate(Math.cos(angle) * mm(14.8), 0, Math.sin(angle) * mm(14.8)),
    );
  }
  return mergeOrThrow([outerRace, innerRace, ...balls], "bearing");
}

/** The pump, in assembly coordinates. Exported part by part below. */
function buildBoreholePumpHousing(): Scene {
  const scene = new Scene();
  const root = new Group();
  root.name = "borehole_pump_housing";
  scene.add(root);

  addMesh(root, "housing", pumpHousingGeometry(), "stainless");
  addMesh(root, "shaft", pumpShaftGeometry(), "stainless");
  addMesh(root, "impeller", impellerGeometry(), "bronze", [0, -200, 0]);
  addMesh(root, "seal_carrier", sealCarrierGeometry(), "petg", [0, 140, 0]);
  addMesh(root, "bearing_upper", bearingGeometry(), "springSteel", [0, 110, 0]);
  addMesh(root, "bearing_lower", bearingGeometry(), "springSteel", [0, -110, 0]);
  return scene;
}

/** The parts exported at their own origin instead of in assembly coordinates. */
const PARTS_EXPORTED_AT_OWN_ORIGIN: ReadonlySet<string> = new Set(["seal_carrier"]);

/**
 * One mesh as its own file. Baking `matrixWorld` into the geometry is what "exported in assembly
 * coordinates" means; skipping the bake leaves the part centred on its own origin.
 */
function extractPartScene(mesh: Mesh, isBakedIntoAssemblyCoordinates: boolean): Scene {
  const partScene = new Scene();
  const geometry = mesh.geometry.clone();
  if (isBakedIntoAssemblyCoordinates) geometry.applyMatrix4(mesh.matrixWorld);
  const partMesh = new Mesh(geometry, mesh.material);
  partMesh.name = mesh.name;
  partScene.add(partMesh);
  return partScene;
}

// --- Placeholder manufacturing files ------------------------------------------------------------
// Real files in the real formats' opening syntax, so a download opens in the tool it claims to be
// for and says "placeholder" inside. Not renamed text with a lying extension.

const PLACEHOLDER_TEXT_FILES: Record<string, string> = {
  "solar-cold-storage-enclosure.step": [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('Placeholder enclosure for the Blueprints fixtures'),'2;1');",
    "FILE_NAME('solar-cold-storage-enclosure.step','',(''),(''),'','','');",
    "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));",
    "ENDSEC;",
    "DATA;",
    "#1=CARTESIAN_POINT('',(0.,0.,0.));",
    "ENDSEC;",
    "END-ISO-10303-21;",
    "",
  ].join("\n"),
  "solar-cold-storage-lid-gasket.dxf": [
    "999",
    "Placeholder lid gasket for the Blueprints fixtures",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    "0",
    "LINE",
    "8",
    "0",
    "10",
    "0.0",
    "20",
    "0.0",
    "11",
    "160.0",
    "21",
    "0.0",
    "0",
    "ENDSEC",
    "0",
    "EOF",
    "",
  ].join("\n"),
  "solar-cold-storage-top-copper.gtl": [
    "G04 Placeholder top copper for the Blueprints fixtures*",
    "%FSLAX46Y46*%",
    "%MOMM*%",
    "%ADD10C,0.250*%",
    "D10*",
    "X0Y0D02*",
    "X140000000Y0D01*",
    "M02*",
    "",
  ].join("\n"),
  "solar-cold-storage-drill.drl": [
    "M48",
    "; Placeholder drill file for the Blueprints fixtures",
    "METRIC,TZ",
    "T1C0.800",
    "%",
    "T1",
    "X10.0Y10.0",
    "M30",
    "",
  ].join("\n"),
  "solar-cold-storage-pick-and-place.csv": [
    "Ref,Val,Package,PosX,PosY,Rot,Side",
    "Q1,IRFP4668,TO-247,40.0,-20.0,0,top",
    "Q2,IRFP4668,TO-247,40.0,20.0,0,top",
    "J1,TB-10mm-3P,TB-10mm,-40.0,35.0,0,top",
    "",
  ].join("\n"),
  "solar-cold-storage-bom.csv": [
    "Ref,Qty,Value,Manufacturer,MPN",
    "Q1 Q2,2,IRFP4668,Infineon,IRFP4668PBF",
    "J1,1,Terminal block 10 mm 3P,Phoenix Contact,1935161",
    "RT1,1,10k NTC 1%,Vishay,NTCLE100E3103JB0",
    "",
  ].join("\n"),
};

// --- Write and report ---------------------------------------------------------------------------

const OUTPUT_DIRECTORY = fileURLToPath(new URL("../public/dummy/blueprints/", import.meta.url));
const PUMP_PART_DIRECTORY = `${OUTPUT_DIRECTORY}borehole-pump-housing/`;

async function exportGlb(scene: Scene, filePath: string): Promise<void> {
  const exporter = new GLTFExporter();
  const exported = await exporter.parseAsync(scene, { binary: true, trs: true });
  if (!(exported instanceof ArrayBuffer)) {
    throw new Error(`Expected a binary glTF for ${filePath}.`);
  }
  await writeFile(filePath, new Uint8Array(exported));
}

async function reportByteSize(filePath: string): Promise<void> {
  const { size } = await stat(filePath);
  const relativePath = filePath.slice(OUTPUT_DIRECTORY.length);
  process.stdout.write(`${relativePath.padEnd(48)} byteSize: ${size}\n`);
}

await mkdir(PUMP_PART_DIRECTORY, { recursive: true });

const writtenFilePaths: string[] = [];

const controllerFilePath = `${OUTPUT_DIRECTORY}solar-cold-storage-controller.glb`;
await exportGlb(buildSolarColdStorageController(), controllerFilePath);
writtenFilePaths.push(controllerFilePath);

const pumpScene = buildBoreholePumpHousing();
pumpScene.updateMatrixWorld(true);
const pumpMeshes: Mesh[] = [];
pumpScene.traverse((object) => {
  if (object instanceof Mesh) pumpMeshes.push(object);
});
for (const pumpMesh of pumpMeshes) {
  const partFilePath = `${PUMP_PART_DIRECTORY}${pumpMesh.name}.glb`;
  await exportGlb(
    extractPartScene(pumpMesh, !PARTS_EXPORTED_AT_OWN_ORIGIN.has(pumpMesh.name)),
    partFilePath,
  );
  writtenFilePaths.push(partFilePath);
}

for (const [fileName, contents] of Object.entries(PLACEHOLDER_TEXT_FILES)) {
  const textFilePath = `${OUTPUT_DIRECTORY}${fileName}`;
  await writeFile(textFilePath, contents, "utf8");
  writtenFilePaths.push(textFilePath);
}

for (const filePath of writtenFilePaths) {
  await reportByteSize(filePath);
}
