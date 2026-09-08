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
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Scene,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

// --- Scene helpers ------------------------------------------------------------------------------

const MILLIMETRES_PER_METRE = 1000;
type Millimetres3 = readonly [number, number, number];

const MATERIALS = {
  abs_grey: new MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.6, name: "abs_grey" }),
  abs_light: new MeshStandardMaterial({ color: 0xb8c0c4, roughness: 0.6, name: "abs_light" }),
  fr4_green: new MeshStandardMaterial({ color: 0x1f6f3f, roughness: 0.5, name: "fr4_green" }),
  aluminium: new MeshStandardMaterial({
    color: 0xc8c8c8,
    roughness: 0.35,
    metalness: 0.8,
    name: "aluminium",
  }),
  epoxy_black: new MeshStandardMaterial({ color: 0x202020, roughness: 0.7, name: "epoxy_black" }),
  pa66_green: new MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.6, name: "pa66_green" }),
  pvc_amber: new MeshStandardMaterial({ color: 0xd0a030, roughness: 0.5, name: "pvc_amber" }),
  spring_steel: new MeshStandardMaterial({
    color: 0x606060,
    roughness: 0.4,
    metalness: 0.7,
    name: "spring_steel",
  }),
  stainless: new MeshStandardMaterial({
    color: 0xb0b4b8,
    roughness: 0.3,
    metalness: 0.9,
    name: "stainless",
  }),
  bronze: new MeshStandardMaterial({
    color: 0xb08d57,
    roughness: 0.45,
    metalness: 0.8,
    name: "bronze",
  }),
  petg_blue: new MeshStandardMaterial({ color: 0x3b6fd6, roughness: 0.55, name: "petg_blue" }),
} as const;
type MaterialKey = keyof typeof MATERIALS;

function toMetres([x, y, z]: Millimetres3): [number, number, number] {
  return [x / MILLIMETRES_PER_METRE, y / MILLIMETRES_PER_METRE, z / MILLIMETRES_PER_METRE];
}

function boxMm(widthMm: number, heightMm: number, depthMm: number): BoxGeometry {
  return new BoxGeometry(
    widthMm / MILLIMETRES_PER_METRE,
    heightMm / MILLIMETRES_PER_METRE,
    depthMm / MILLIMETRES_PER_METRE,
  );
}

function cylinderMm(radiusMm: number, heightMm: number, radialSegments = 32): CylinderGeometry {
  return new CylinderGeometry(
    radiusMm / MILLIMETRES_PER_METRE,
    radiusMm / MILLIMETRES_PER_METRE,
    heightMm / MILLIMETRES_PER_METRE,
    radialSegments,
  );
}

/** ONE PART IS ONE MESH NODE, named exactly as the fixture's `nodeName`. */
function addPart(
  parent: Object3D,
  nodeName: string,
  geometry: BufferGeometry,
  material: MaterialKey,
  positionMm: Millimetres3,
): Mesh {
  const mesh = new Mesh(geometry, MATERIALS[material]);
  mesh.name = nodeName;
  mesh.position.set(...toMetres(positionMm));
  parent.add(mesh);
  return mesh;
}

/**
 * A floor slab plus four walls merged into ONE geometry, so the closed assembly reads as a closed
 * box — the lid sits on the wall tops and the board is hidden until the view explodes.
 */
function enclosureBaseGeometry(): BufferGeometry {
  const floorSlab = boxMm(160, 20, 100);
  const wallHeightMm = 18;
  const wallTopMm = 10 + wallHeightMm; // slab top is +10 mm; the lid's underside sits at +28 mm
  const wallCentreYMm = (10 + wallTopMm) / 2;
  const walls = [
    boxMm(160, wallHeightMm, 4).translate(
      0,
      wallCentreYMm / MILLIMETRES_PER_METRE,
      48 / MILLIMETRES_PER_METRE,
    ),
    boxMm(160, wallHeightMm, 4).translate(
      0,
      wallCentreYMm / MILLIMETRES_PER_METRE,
      -48 / MILLIMETRES_PER_METRE,
    ),
    boxMm(4, wallHeightMm, 92).translate(
      78 / MILLIMETRES_PER_METRE,
      wallCentreYMm / MILLIMETRES_PER_METRE,
      0,
    ),
    boxMm(4, wallHeightMm, 92).translate(
      -78 / MILLIMETRES_PER_METRE,
      wallCentreYMm / MILLIMETRES_PER_METRE,
      0,
    ),
  ];
  const merged = mergeGeometries([floorSlab, ...walls]);
  if (merged === null) throw new Error("The enclosure base did not merge.");
  return merged;
}

/** Six fins merged into ONE geometry so the heatsink is one node, not a group of seven. */
function heatsinkGeometry(): BufferGeometry {
  const finGeometries = Array.from({ length: 6 }, (_, finIndex) =>
    boxMm(30, 12, 1.5).translate(0, 0, (-11.25 + finIndex * 4.5) / MILLIMETRES_PER_METRE),
  );
  const merged = mergeGeometries(finGeometries);
  if (merged === null) throw new Error("The heatsink fins did not merge.");
  return merged;
}

// --- The two assemblies -------------------------------------------------------------------------
// The nesting below IS the `parentPartId` tree in `blueprints-mocks.ts`. Change one, change both.

function buildSolarColdStorageController(): Scene {
  const scene = new Scene();
  const root = new Group();
  root.name = "solar_cold_storage_controller";
  scene.add(root);

  const enclosureBase = addPart(
    root,
    "enclosure_base",
    enclosureBaseGeometry(),
    "abs_grey",
    [0, 0, 0],
  );
  addPart(root, "enclosure_lid", boxMm(160, 4, 100), "abs_light", [0, 30, 0]);

  const controlBoard = addPart(enclosureBase, "pcb", boxMm(140, 1.6, 85), "fr4_green", [0, 12, 0]);
  addPart(controlBoard, "heatsink", heatsinkGeometry(), "aluminium", [40, 8, 0]);
  addPart(controlBoard, "mosfet_q1", boxMm(10, 4.5, 15), "epoxy_black", [40, 3, -20]);
  addPart(controlBoard, "mosfet_q2", boxMm(10, 4.5, 15), "epoxy_black", [40, 3, 20]);
  addPart(controlBoard, "terminal_block", boxMm(50, 12, 10), "pa66_green", [-40, 6, 35]);
  // A harness lies flat along the board, so the cylinder is rotated in geometry space.
  addPart(
    controlBoard,
    "thermistor_harness",
    cylinderMm(1.5, 60, 12).rotateZ(Math.PI / 2),
    "pvc_amber",
    [-50, 2, -20],
  );

  addPart(enclosureBase, "din_clip", boxMm(35, 6, 20), "spring_steel", [0, -13, 0]);
  return scene;
}

/** The pump, in assembly coordinates. Exported part by part below. */
function buildBoreholePumpHousing(): Scene {
  const scene = new Scene();
  const root = new Group();
  root.name = "borehole_pump_housing";
  scene.add(root);

  const housing = addPart(root, "housing", cylinderMm(60, 300), "stainless", [0, 0, 0]);
  const shaft = addPart(root, "shaft", cylinderMm(10, 460, 24), "stainless", [0, 0, 0]);
  addPart(shaft, "impeller", cylinderMm(45, 30), "bronze", [0, -200, 0]);
  addPart(housing, "seal_carrier", cylinderMm(30, 20), "petg_blue", [0, 140, 0]);
  addPart(housing, "bearing_upper", cylinderMm(20, 12), "spring_steel", [0, 110, 0]);
  addPart(housing, "bearing_lower", cylinderMm(20, 12), "spring_steel", [0, -110, 0]);
  return scene;
}

/** The parts that are exported at their own origin instead of in assembly coordinates. */
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
