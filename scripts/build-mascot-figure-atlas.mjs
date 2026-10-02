// Builds the mascot ART for AI Assist Mode from the character sheet:
//
//   public/assistant/mascot/opera/atlas.webp     the packed sprite sheet
//   public/assistant/mascot/opera/atlas.json     PixiJS v8 spritesheet data (TexturePacker "hash")
//   public/assistant/mascot/opera/fallback.webp  one still, for browsers with no WebGL
//
// Run, then commit the output:   node scripts/build-mascot-figure-atlas.mjs
//
// SOURCES. `public/dummy/mascot_sheet.png` is a grid of full-body poses, ten labelled rows of one
// emotion each, already on a transparent background. `public/dummy/mascot.png` is one larger, crisper
// render of the same character, used as the resting frame because it is the frame people see most.
// The sheet is not on a fixed grid, so figures are found by connected components of the alpha
// channel rather than by slicing: anything at least FIGURE_MINIMUM_AREA_PX is a figure, and smaller
// marks beside it (a "!", a "?", an anger vein) are merged into the figure they sit next to.
//
// ─── THE ASSET CONTRACT, which any replacement atlas must follow ────────────────────────────────────
//
//  1. ONE LAYER OF WHOLE FIGURES. Each animation is `figure/<expression>`, with expression names
//     from MASCOT_EXPRESSIONS (src/lib/assistant/mascot-expressions.ts). The character's face and
//     body are drawn together; there is no separate face or effect layer.
//  2. REQUIRED: `figure/neutral`. Every other expression is optional and falls back along
//     MASCOT_EXPRESSION_FALLBACK to the nearest one the atlas draws.
//  3. EVERY FRAME IS THE SAME SIZE and shares ONE ANCHOR: feet centre, the bottom-middle of the
//     frame. That line is what stands on a perch's top edge.
//  4. `meta.scale` says how many stored pixels make one CSS pixel (1.5 here); the runtime lays a
//     frame out at its stored size divided by that.
//  5. FRAME 0 OF EVERY ANIMATION IS THE RESTING FRAME. Under prefers-reduced-motion the runtime
//     shows only frame 0, with no crossfade.
//  6. The frames of an animation are POSES, not motion steps. The runtime holds each one for
//     `meta.frameHoldMs[<animation>]` (default 1600 ms) and crossfades to the next by opacity.
//     A row that is genuinely sequential (dancing) sets a short hold.
//
// ─── RE-PICKING FRAMES ──────────────────────────────────────────────────────────────────────────────
//
// SHEET_ROWS below maps each sheet row to an expression and says which figures in it to use (by
// left-to-right index, printed when this script runs). Edit, re-run, commit the three files.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sheetPath = path.join(repositoryRoot, "public/dummy/mascot_sheet.png");
const restingFigurePath = path.join(repositoryRoot, "public/dummy/mascot.png");
const outputDirectory = path.join(repositoryRoot, "public/assistant/mascot/opera");

const SHEET_ROW_COUNT = 10;
/** The label pills ("Joy (Happy)") sit left of this x and are never figures. */
const SHEET_LABEL_COLUMN_WIDTH_PX = 120;
const ALPHA_THRESHOLD = 40;
const FIGURE_MINIMUM_AREA_PX = 1_500;
const MARK_MINIMUM_AREA_PX = 12;
const MARK_MERGE_DISTANCE_PX = 24;
/**
 * The Enlightened glow and every figure's anti-aliased rim are alpha below ALPHA_THRESHOLD, so they
 * belong to no component. A crop takes that soft halo this far past the figure's box and fades it to
 * nothing at the crop edge, so a glow ends softly instead of as a square.
 */
const SOFT_HALO_MARGIN_PX = 12;

/**
 * Stored cell size (device pixels). With `"scale": "1.5"` that is a 96×116 CSS-pixel frame.
 *
 * 1.5 and not 2 on purpose: a sheet figure is only ~95 px tall, so storing it at 2x adds bytes and
 * no detail. The 2x build was 639 KB against a 512 KB budget for the same on-screen sharpness.
 */
const ATLAS_SCALE = 1.5;
const CELL_WIDTH_PX = 144;
const CELL_HEIGHT_PX = 174;
const CELL_FOOT_MARGIN_PX = 3;
const SHEET_UPSCALE = ATLAS_SCALE;
const ATLAS_COLUMN_COUNT = 16;

/** Default number of poses taken from a row, spread evenly across it. */
const DEFAULT_PICK_COUNT = 5;

/**
 * Row index (top to bottom) → expression, and which figures to use. `picks: null` means
 * DEFAULT_PICK_COUNT spread evenly; an array lists left-to-right figure indices in play order.
 */
const SHEET_ROWS = [
  { rowLabel: "Joy (Happy)", expression: "joy", picks: null },
  { rowLabel: "Sad (Crying)", expression: "sad", picks: null },
  { rowLabel: "Angry", expression: "angry", picks: null },
  { rowLabel: "Pouting", expression: "pouting", picks: null },
  { rowLabel: "Surprised", expression: "surprised", picks: null },
  { rowLabel: "Shy / Bashful", expression: "embarrassed", picks: null },
  { rowLabel: "Thinking", expression: "thinking", picks: null },
  { rowLabel: "Dancing", expression: "excited", picks: [0, 1, 2, 3, 4, 5, 6, 7] },
  { rowLabel: "Enlightened", expression: "enlightened", picks: null },
  // Other Gestures are not an expression of their own: three of them give the resting animation
  // some variety between returns to the crisp resting render.
  { rowLabel: "Other Gestures", expression: null, picks: [3, 6, 13] },
];

const FRAME_HOLD_MS = {
  "figure/neutral": 2_400,
  "figure/excited": 450,
};

// ─── reading the sheet ──────────────────────────────────────────────────────────────────────────────

async function readRgba(imagePath) {
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { pixels: data, width: info.width, height: info.height };
}

/** 4-connected components over the alpha mask. Returns the label image and each component's box. */
function findComponents({ pixels, width, height }) {
  const componentLabels = new Int32Array(width * height);
  const components = [];
  for (let startIndex = 0; startIndex < width * height; startIndex += 1) {
    if (componentLabels[startIndex] !== 0 || pixels[startIndex * 4 + 3] <= ALPHA_THRESHOLD)
      continue;
    const componentId = components.length + 1;
    const box = { componentId, minX: width, minY: height, maxX: 0, maxY: 0, area: 0 };
    const pendingIndices = [startIndex];
    componentLabels[startIndex] = componentId;
    while (pendingIndices.length > 0) {
      const pixelIndex = pendingIndices.pop();
      const pixelX = pixelIndex % width;
      const pixelY = Math.floor(pixelIndex / width);
      box.area += 1;
      box.minX = Math.min(box.minX, pixelX);
      box.maxX = Math.max(box.maxX, pixelX);
      box.minY = Math.min(box.minY, pixelY);
      box.maxY = Math.max(box.maxY, pixelY);
      const neighbourIndices = [
        pixelX > 0 ? pixelIndex - 1 : -1,
        pixelX < width - 1 ? pixelIndex + 1 : -1,
        pixelY > 0 ? pixelIndex - width : -1,
        pixelY < height - 1 ? pixelIndex + width : -1,
      ];
      for (const neighbourIndex of neighbourIndices) {
        if (neighbourIndex < 0 || componentLabels[neighbourIndex] !== 0) continue;
        if (pixels[neighbourIndex * 4 + 3] <= ALPHA_THRESHOLD) continue;
        componentLabels[neighbourIndex] = componentId;
        pendingIndices.push(neighbourIndex);
      }
    }
    components.push(box);
  }
  return { componentLabels, components };
}

function groupSheetFigures(sheet) {
  const { componentLabels, components } = findComponents(sheet);
  const rowHeightPx = sheet.height / SHEET_ROW_COUNT;
  const figures = components
    .filter((box) => box.area >= FIGURE_MINIMUM_AREA_PX && box.minX >= SHEET_LABEL_COLUMN_WIDTH_PX)
    .map((box) => ({
      footX: (box.minX + box.maxX) / 2,
      footY: box.maxY,
      rowIndex: Math.floor((box.minY + box.maxY) / 2 / rowHeightPx),
      haloTopPx: 0,
      haloBottomPx: sheet.height - 1,
      componentIds: new Set([box.componentId]),
      minX: box.minX,
      minY: box.minY,
      maxX: box.maxX,
      maxY: box.maxY,
    }));

  const marks = components.filter(
    (box) =>
      box.area >= MARK_MINIMUM_AREA_PX &&
      box.area < FIGURE_MINIMUM_AREA_PX &&
      box.minX >= SHEET_LABEL_COLUMN_WIDTH_PX,
  );
  for (const mark of marks) {
    const markCenterX = (mark.minX + mark.maxX) / 2;
    const markCenterY = (mark.minY + mark.maxY) / 2;
    const owner = figures.find(
      (figure) =>
        markCenterX >= figure.minX - MARK_MERGE_DISTANCE_PX &&
        markCenterX <= figure.maxX + MARK_MERGE_DISTANCE_PX &&
        markCenterY >= figure.minY - MARK_MERGE_DISTANCE_PX &&
        markCenterY <= figure.maxY + MARK_MERGE_DISTANCE_PX,
    );
    if (owner === undefined) continue;
    owner.componentIds.add(mark.componentId);
    owner.minX = Math.min(owner.minX, mark.minX);
    owner.minY = Math.min(owner.minY, mark.minY);
    owner.maxX = Math.max(owner.maxX, mark.maxX);
    owner.maxY = Math.max(owner.maxY, mark.maxY);
  }

  const figuresByRow = Array.from({ length: SHEET_ROW_COUNT }, () => []);
  for (const figure of figures) figuresByRow[figure.rowIndex]?.push(figure);
  for (const rowFigures of figuresByRow) rowFigures.sort((left, right) => left.minX - right.minX);

  // A halo stops short of the neighbouring rows' figures: a base disc's rim from the row above
  // otherwise prints as a faint line over every head in this row.
  for (const [rowIndex, rowFigures] of figuresByRow.entries()) {
    const rowAbove = figuresByRow[rowIndex - 1] ?? [];
    const rowBelow = figuresByRow[rowIndex + 1] ?? [];
    const haloTopPx =
      rowAbove.length === 0 ? 0 : Math.max(...rowAbove.map((figure) => figure.maxY)) + 3;
    const haloBottomPx =
      rowBelow.length === 0
        ? sheet.height - 1
        : Math.min(...rowBelow.map((figure) => figure.minY)) - 3;
    for (const figure of rowFigures) {
      figure.haloTopPx = Math.min(haloTopPx, figure.minY);
      figure.haloBottomPx = Math.max(haloBottomPx, figure.maxY);
    }
  }
  return { componentLabels, figuresByRow };
}

/** Copies only this figure's own components out of the sheet, so a neighbour never bleeds in. */
function extractFigurePixels(sheet, componentLabels, figure) {
  const cropMinX = Math.max(0, figure.minX - SOFT_HALO_MARGIN_PX);
  // The halo never crosses into the row above or below: their figures' rims would print as lines.
  const cropMinY = Math.max(figure.haloTopPx, figure.minY - SOFT_HALO_MARGIN_PX);
  const cropMaxX = Math.min(sheet.width - 1, figure.maxX + SOFT_HALO_MARGIN_PX);
  const cropMaxY = Math.min(figure.haloBottomPx, figure.maxY + SOFT_HALO_MARGIN_PX);
  const cropWidth = cropMaxX - cropMinX + 1;
  const cropHeight = cropMaxY - cropMinY + 1;
  const cropPixels = Buffer.alloc(cropWidth * cropHeight * 4);
  for (let cropY = 0; cropY < cropHeight; cropY += 1) {
    for (let cropX = 0; cropX < cropWidth; cropX += 1) {
      const sheetIndex = (cropMinY + cropY) * sheet.width + cropMinX + cropX;
      const sheetLabel = componentLabels[sheetIndex];
      const isOwnComponent = figure.componentIds.has(sheetLabel);
      const isSoftHalo = sheetLabel === 0 && sheet.pixels[sheetIndex * 4 + 3] > 0;
      if (!isOwnComponent && !isSoftHalo) continue;
      const cropIndex = (cropY * cropWidth + cropX) * 4;
      sheet.pixels.copy(cropPixels, cropIndex, sheetIndex * 4, sheetIndex * 4 + 4);
      if (isSoftHalo) {
        const distanceToCropEdgePx = Math.min(
          cropX,
          cropY,
          cropWidth - 1 - cropX,
          cropHeight - 1 - cropY,
        );
        const edgeFade = Math.min(1, distanceToCropEdgePx / SOFT_HALO_MARGIN_PX);
        cropPixels[cropIndex + 3] = Math.round(cropPixels[cropIndex + 3] * edgeFade);
      }
    }
  }
  return {
    cropPixels,
    cropWidth,
    cropHeight,
    footOffsetX: figure.footX - cropMinX,
    footOffsetY: figure.footY - cropMinY,
  };
}

/** Scales a crop and places it feet-centre in one cell. Returns the cell as a PNG buffer. */
async function placeInCell({ cropPixels, cropWidth, cropHeight, footOffsetX, footOffsetY }, scale) {
  const availableHeight = CELL_HEIGHT_PX - CELL_FOOT_MARGIN_PX;
  const fittedScale = Math.min(scale, availableHeight / cropHeight, CELL_WIDTH_PX / cropWidth);
  const scaledWidth = Math.max(1, Math.round(cropWidth * fittedScale));
  const scaledHeight = Math.max(1, Math.round(cropHeight * fittedScale));
  const scaledBuffer = await sharp(cropPixels, {
    raw: { width: cropWidth, height: cropHeight, channels: 4 },
  })
    .resize(scaledWidth, scaledHeight, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  const left = Math.round(CELL_WIDTH_PX / 2 - footOffsetX * fittedScale);
  const top = Math.round(CELL_HEIGHT_PX - CELL_FOOT_MARGIN_PX - footOffsetY * fittedScale);
  return sharp({
    create: {
      width: CELL_WIDTH_PX,
      height: CELL_HEIGHT_PX,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: scaledBuffer,
        left: Math.max(0, Math.min(left, CELL_WIDTH_PX - scaledWidth)),
        top: Math.max(0, top),
      },
    ])
    .png()
    .toBuffer();
}

function spreadPicks(figureCount, pickCount) {
  if (figureCount <= pickCount) return Array.from({ length: figureCount }, (_, index) => index);
  return Array.from({ length: pickCount }, (_, index) =>
    Math.round((index * (figureCount - 1)) / (pickCount - 1)),
  );
}

// ─── building ───────────────────────────────────────────────────────────────────────────────────────

const sheet = await readRgba(sheetPath);
const { componentLabels, figuresByRow } = groupSheetFigures(sheet);

const typicalFigureHeightPx = (() => {
  const heights = figuresByRow
    .flat()
    .map((figure) => figure.footY - figure.minY + 1)
    .toSorted((leftHeight, rightHeight) => leftHeight - rightHeight);
  return heights[Math.floor(heights.length / 2)];
})();

/** [frameName, cellPngBuffer] in atlas order. */
const frameCells = [];
const animations = {};
const reportLines = [];

// The resting render: same on-screen height as a sheet figure, but from a 3x larger source.
const restingFigure = await readRgba(restingFigurePath);
const { components: restingComponents } = findComponents(restingFigure);
const restingBody = restingComponents.reduce((largest, box) =>
  box.area > largest.area ? box : largest,
);
const restingCrop = extractFigurePixels(
  restingFigure,
  findComponents(restingFigure).componentLabels,
  {
    componentIds: new Set([restingBody.componentId]),
    minX: restingBody.minX,
    minY: restingBody.minY,
    maxX: restingBody.maxX,
    maxY: restingBody.maxY,
    footX: (restingBody.minX + restingBody.maxX) / 2,
    footY: restingBody.maxY,
    haloTopPx: 0,
    haloBottomPx: restingFigure.height - 1,
  },
);
// The resting render is drawn with a smaller head than the sheet's chibi poses, so at equal height it
// reads as a smaller character. A little taller lines the heads up when frames crossfade.
const RESTING_HEIGHT_FACTOR = 1.15;
const restingScale =
  (typicalFigureHeightPx * SHEET_UPSCALE * RESTING_HEIGHT_FACTOR) / restingCrop.cropHeight;
frameCells.push(["figure/neutral/rest", await placeInCell(restingCrop, restingScale)]);

const neutralGestureFrameNames = [];
for (const [rowIndex, rowSpec] of SHEET_ROWS.entries()) {
  const rowFigures = figuresByRow[rowIndex];
  const pickedIndices = (
    rowSpec.picks ?? spreadPicks(rowFigures.length, DEFAULT_PICK_COUNT)
  ).filter((figureIndex) => figureIndex < rowFigures.length);
  reportLines.push(
    `row ${rowIndex} ${rowSpec.rowLabel}: ${rowFigures.length} figures, using [${pickedIndices.join(", ")}]`,
  );
  const frameNames = [];
  for (const figureIndex of pickedIndices) {
    const frameName = `figure/${rowSpec.expression ?? "gesture"}/${figureIndex}`;
    const crop = extractFigurePixels(sheet, componentLabels, rowFigures[figureIndex]);
    frameCells.push([frameName, await placeInCell(crop, SHEET_UPSCALE)]);
    frameNames.push(frameName);
  }
  if (rowSpec.expression === null) neutralGestureFrameNames.push(...frameNames);
  else animations[`figure/${rowSpec.expression}`] = frameNames;
}

// Rest, gesture, rest, gesture: the character mostly stands still and now and then does something.
animations["figure/neutral"] = neutralGestureFrameNames.flatMap((gestureFrameName) => [
  "figure/neutral/rest",
  gestureFrameName,
]);
if (animations["figure/neutral"].length === 0)
  animations["figure/neutral"] = ["figure/neutral/rest"];

const atlasRowCount = Math.ceil(frameCells.length / ATLAS_COLUMN_COUNT);
const atlasWidthPx = ATLAS_COLUMN_COUNT * CELL_WIDTH_PX;
const atlasHeightPx = atlasRowCount * CELL_HEIGHT_PX;

const frames = {};
const composites = frameCells.map(([frameName, cellBuffer], frameIndex) => {
  const left = (frameIndex % ATLAS_COLUMN_COUNT) * CELL_WIDTH_PX;
  const top = Math.floor(frameIndex / ATLAS_COLUMN_COUNT) * CELL_HEIGHT_PX;
  frames[frameName] = {
    frame: { x: left, y: top, w: CELL_WIDTH_PX, h: CELL_HEIGHT_PX },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: CELL_WIDTH_PX, h: CELL_HEIGHT_PX },
    sourceSize: { w: CELL_WIDTH_PX, h: CELL_HEIGHT_PX },
  };
  return { input: cellBuffer, left, top };
});

await mkdir(outputDirectory, { recursive: true });

const atlasBuffer = await sharp({
  create: {
    width: atlasWidthPx,
    height: atlasHeightPx,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .webp({ quality: 80, alphaQuality: 90, effort: 6 })
  .toBuffer();
await writeFile(path.join(outputDirectory, "atlas.webp"), atlasBuffer);

const atlasJson = {
  frames,
  animations,
  meta: {
    app: "scripts/build-mascot-figure-atlas.mjs",
    image: "atlas.webp",
    format: "RGBA8888",
    size: { w: atlasWidthPx, h: atlasHeightPx },
    scale: String(ATLAS_SCALE),
    frameHoldMs: FRAME_HOLD_MS,
  },
};
await writeFile(
  path.join(outputDirectory, "atlas.json"),
  `${JSON.stringify(atlasJson, null, 2)}\n`,
);

const fallbackBuffer = await sharp(frameCells[0][1])
  .webp({ quality: 90, alphaQuality: 100 })
  .toBuffer();
await writeFile(path.join(outputDirectory, "fallback.webp"), fallbackBuffer);

process.stdout.write(
  `${reportLines.join("\n")}\nWrote ${frameCells.length} frames (${atlasWidthPx}x${atlasHeightPx}, ${Math.round(atlasBuffer.length / 1024)} KB) and fallback.webp (${Math.round(fallbackBuffer.length / 1024)} KB) to ${path.relative(repositoryRoot, outputDirectory)}\n`,
);
