// Builds the mascot ART for AI Assist Mode from the character sheet:
//
//   public/assistant/mascot/opera/atlas.webp     the packed sprite sheet
//   public/assistant/mascot/opera/atlas.json     PixiJS v8 spritesheet data (TexturePacker "hash")
//   public/assistant/mascot/opera/fallback.webp  one still, for browsers with no WebGL
//
// Run, then commit the output:   node scripts/build-mascot-figure-atlas.mjs
//
// SOURCE. `art/mascot/sprite_sheet.png` — outside `public/` on purpose, so the 3 MB original is
// never served. Labelled groups of full-body poses on a transparent background: a hero figure,
// Neutral, Joy, Sad, Pouting, Surprised, Shy, Thinking, Dancing, Enlightened, and a row of eight
// Direction Pointing poses. Within a group the poses are drawn IN ORDER, so they play as a
// sequence.
//
// WHY A HAND-MEASURED LAYOUT MAP AND NOT CONNECTED COMPONENTS. On this sheet neighbouring figures
// touch (three Pouting and three Thinking figures fuse into one blob) and several pointing figures
// touch their label pills through faint pixels, so "one component = one figure" cuts wrongly.
// Instead SHEET_GROUPS below gives each group its region, starting just under its label pill, and
// how many figures it holds; the region is split at its emptiest columns. The script stops if a
// group does not yield the expected count, rather than shipping a sliced figure.
//
// ─── THE ASSET CONTRACT, which any replacement atlas must follow ────────────────────────────────────
//
//  1. ONE LAYER OF WHOLE FIGURES. Expression animations are `figure/<expression>` (names from
//     MASCOT_EXPRESSIONS, src/lib/assistant/mascot-expressions.ts); pointing poses are
//     `figure/point_<direction>` (MASCOT_POINTING_DIRECTIONS). Face and body are drawn together.
//  2. REQUIRED: `figure/neutral`. Every other expression falls back along
//     MASCOT_EXPRESSION_FALLBACK; a missing pointing pose means the mascot simply does not point.
//  3. EVERY FRAME IS THE SAME SIZE and shares ONE ANCHOR: feet centre, the bottom-middle of the
//     frame. That line is what stands on a perch's top edge.
//  4. `meta.scale` says how many stored pixels make one CSS pixel (ATLAS_SCALE here); the runtime
//     lays a frame out at its stored size divided by that.
//  5. FRAME 0 OF EVERY ANIMATION IS THE RESTING FRAME. Under prefers-reduced-motion the runtime
//     shows only frame 0, with no crossfade.
//  6. `meta.frameHoldMs[<animation>]` sets how long each frame holds (default 1600 ms); the runtime
//     crossfades between frames by opacity, capped at half the hold.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sheetPath = path.join(repositoryRoot, "art/mascot/sprite_sheet.png");
const outputDirectory = path.join(repositoryRoot, "public/assistant/mascot/opera");

const ALPHA_THRESHOLD = 40;
/**
 * The sheet's "transparent" background is not quite: it is alpha 1–2 over a grey-blue haze, and
 * lossy WebP alpha amplifies that into a visible box behind every figure. Anything at or below this
 * is treated as fully transparent, colour included.
 */
const BACKGROUND_ALPHA_CEILING = 10;
/** Anti-aliased rims and the Enlightened glow sit below the threshold; keep this much of them. */
const SOFT_HALO_MARGIN_PX = 6;

/**
 * Stored cell size (device pixels). With `"scale": "1.7"` that is a ~96×116 CSS-pixel frame, the
 * size the runtime lays out. 1.7 because the tallest figures are ~191 px: they fit a 198 px cell
 * at native size, so nothing on the sheet is resampled except the hero.
 */
const ATLAS_SCALE = 1.7;
const CELL_WIDTH_PX = 164;
const CELL_HEIGHT_PX = 198;
const CELL_FOOT_MARGIN_PX = 2;
const ATLAS_COLUMN_COUNT = 16;

/**
 * The sheet, group by group. Regions are inclusive pixel bounds measured on the 1536×1024 sheet,
 * each starting just below its label pill. `expression` is the animation the group becomes;
 * `pointingDirection` marks a single pointing pose; `role: "hero"` is the large unlabelled figure.
 */
const SHEET_GROUPS = [
  { name: "hero", role: "hero", region: { x0: 40, x1: 200, y0: 5, y1: 246 }, figureCount: 1 },
  {
    name: "neutral",
    expression: "neutral",
    region: { x0: 240, x1: 362, y0: 55, y1: 245 },
    figureCount: 1,
  },
  { name: "joy", expression: "joy", region: { x0: 405, x1: 966, y0: 55, y1: 245 }, figureCount: 5 },
  {
    name: "sad",
    expression: "sad",
    region: { x0: 1000, x1: 1500, y0: 55, y1: 245 },
    figureCount: 4,
  },
  {
    name: "pouting",
    expression: "pouting",
    region: { x0: 20, x1: 475, y0: 299, y1: 500 },
    figureCount: 4,
  },
  {
    name: "surprised",
    expression: "surprised",
    region: { x0: 480, x1: 976, y0: 299, y1: 500 },
    figureCount: 4,
  },
  {
    name: "shy",
    expression: "embarrassed",
    region: { x0: 995, x1: 1505, y0: 299, y1: 500 },
    figureCount: 4,
  },
  {
    name: "thinking",
    expression: "thinking",
    region: { x0: 20, x1: 452, y0: 555, y1: 745 },
    figureCount: 4,
  },
  {
    name: "dancing",
    expression: "excited",
    region: { x0: 465, x1: 1045, y0: 546, y1: 745 },
    figureCount: 5,
  },
  {
    name: "enlightened",
    expression: "enlightened",
    region: { x0: 1055, x1: 1520, y0: 556, y1: 745 },
    figureCount: 4,
  },
  { name: "point_left", pointingDirection: "left", region: { x0: 30, x1: 185, y0: 824, y1: 1015 } },
  { name: "point_up", pointingDirection: "up", region: { x0: 245, x1: 400, y0: 824, y1: 1015 } },
  {
    name: "point_right",
    pointingDirection: "right",
    region: { x0: 440, x1: 600, y0: 824, y1: 1015 },
  },
  {
    name: "point_down",
    pointingDirection: "down",
    region: { x0: 650, x1: 790, y0: 824, y1: 1015 },
  },
  {
    name: "point_left_up",
    pointingDirection: "left_up",
    region: { x0: 830, x1: 975, y0: 824, y1: 1015 },
  },
  {
    name: "point_right_up",
    pointingDirection: "right_up",
    region: { x0: 1015, x1: 1165, y0: 824, y1: 1015 },
  },
  {
    name: "point_left_down",
    pointingDirection: "left_down",
    region: { x0: 1190, x1: 1345, y0: 824, y1: 1015 },
  },
  {
    name: "point_right_down",
    pointingDirection: "right_down",
    region: { x0: 1370, x1: 1510, y0: 824, y1: 1015 },
  },
];

/** Poses are drawn in order, so they play as sequences; the holds are per animation. */
const FRAME_HOLD_MS = {
  "figure/neutral": 2_400,
  "figure/joy": 450,
  "figure/sad": 600,
  "figure/pouting": 500,
  "figure/surprised": 400,
  "figure/embarrassed": 600,
  "figure/thinking": 700,
  "figure/excited": 280,
  "figure/enlightened": 600,
};

// ─── reading the sheet ──────────────────────────────────────────────────────────────────────────────

const { data: sheetPixels, info: sheetInfo } = await sharp(sheetPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const sheetWidth = sheetInfo.width;

const readAlpha = (pixelX, pixelY) => sheetPixels[(pixelY * sheetWidth + pixelX) * 4 + 3];

/** The column, within ±searchRadius of `centerX`, with the fewest solid pixels in the region. */
function findEmptiestColumn(region, centerX, searchRadius) {
  let bestColumnX = Math.round(centerX);
  let bestCoverage = Number.POSITIVE_INFINITY;
  const firstColumnX = Math.round(centerX - searchRadius);
  const lastColumnX = Math.round(centerX + searchRadius);
  for (let columnX = firstColumnX; columnX <= lastColumnX; columnX += 1) {
    let coverage = 0;
    for (let pixelY = region.y0; pixelY <= region.y1; pixelY += 1) {
      if (readAlpha(columnX, pixelY) > ALPHA_THRESHOLD) coverage += 1;
    }
    const isBetter =
      coverage < bestCoverage ||
      (coverage === bestCoverage && Math.abs(columnX - centerX) < Math.abs(bestColumnX - centerX));
    if (isBetter) {
      bestCoverage = coverage;
      bestColumnX = columnX;
    }
  }
  return bestColumnX;
}

/** Splits a group's region into `figureCount` vertical slabs at its emptiest columns. */
function splitIntoSlabs(region, figureCount) {
  const slabWidth = (region.x1 - region.x0 + 1) / figureCount;
  const cutColumns = [region.x0];
  for (let boundaryIndex = 1; boundaryIndex < figureCount; boundaryIndex += 1) {
    cutColumns.push(
      findEmptiestColumn(region, region.x0 + boundaryIndex * slabWidth, slabWidth * 0.4),
    );
  }
  cutColumns.push(region.x1 + 1);
  return cutColumns.slice(0, -1).map((slabStartX, slabIndex) => ({
    x0: slabStartX,
    x1: cutColumns[slabIndex + 1] - 1,
    y0: region.y0,
    y1: region.y1,
  }));
}

/** The solid bbox inside a slab, or null if the slab is empty. */
function findSolidBox(slab) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  for (let pixelY = slab.y0; pixelY <= slab.y1; pixelY += 1) {
    for (let pixelX = slab.x0; pixelX <= slab.x1; pixelX += 1) {
      if (readAlpha(pixelX, pixelY) <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, pixelX);
      maxX = Math.max(maxX, pixelX);
      minY = Math.min(minY, pixelY);
      maxY = Math.max(maxY, pixelY);
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

/**
 * Copies one figure out of its slab: everything solid, plus the soft halo up to
 * SOFT_HALO_MARGIN_PX beyond the solid box (still inside the slab), faded to nothing at the edge.
 */
function extractFigure(slab, solidBox) {
  const cropMinX = Math.max(slab.x0, solidBox.minX - SOFT_HALO_MARGIN_PX);
  const cropMaxX = Math.min(slab.x1, solidBox.maxX + SOFT_HALO_MARGIN_PX);
  const cropMinY = Math.max(slab.y0, solidBox.minY - SOFT_HALO_MARGIN_PX);
  const cropMaxY = Math.min(slab.y1, solidBox.maxY + SOFT_HALO_MARGIN_PX);
  const cropWidth = cropMaxX - cropMinX + 1;
  const cropHeight = cropMaxY - cropMinY + 1;
  const cropPixels = Buffer.alloc(cropWidth * cropHeight * 4);
  for (let cropY = 0; cropY < cropHeight; cropY += 1) {
    for (let cropX = 0; cropX < cropWidth; cropX += 1) {
      const sheetX = cropMinX + cropX;
      const sheetY = cropMinY + cropY;
      const sheetIndex = (sheetY * sheetWidth + sheetX) * 4;
      const cropIndex = (cropY * cropWidth + cropX) * 4;
      if (sheetPixels[sheetIndex + 3] <= BACKGROUND_ALPHA_CEILING) continue;
      sheetPixels.copy(cropPixels, cropIndex, sheetIndex, sheetIndex + 4);
      const distanceOutsidePx = Math.max(
        0,
        solidBox.minX - sheetX,
        sheetX - solidBox.maxX,
        solidBox.minY - sheetY,
        sheetY - solidBox.maxY,
      );
      if (distanceOutsidePx > 0) {
        const fade = Math.max(0, 1 - distanceOutsidePx / SOFT_HALO_MARGIN_PX);
        cropPixels[cropIndex + 3] = Math.round(cropPixels[cropIndex + 3] * fade);
      }
    }
  }
  return {
    cropPixels,
    cropWidth,
    cropHeight,
    solidHeight: solidBox.maxY - solidBox.minY + 1,
    footOffsetX: (solidBox.minX + solidBox.maxX) / 2 - cropMinX,
    footOffsetY: solidBox.maxY - cropMinY,
  };
}

/** Places a figure feet-centre in one cell at `scale`, clipping any halo that overhangs the cell. */
async function placeInCell(figure, scale) {
  const scaledWidth = Math.max(1, Math.round(figure.cropWidth * scale));
  const scaledHeight = Math.max(1, Math.round(figure.cropHeight * scale));
  const rawFigure = sharp(figure.cropPixels, {
    raw: { width: figure.cropWidth, height: figure.cropHeight, channels: 4 },
  });
  const scaledBuffer =
    scale === 1
      ? await rawFigure.png().toBuffer()
      : await rawFigure.resize(scaledWidth, scaledHeight, { kernel: "lanczos3" }).png().toBuffer();

  const left = Math.round(CELL_WIDTH_PX / 2 - figure.footOffsetX * scale);
  const top = Math.round(CELL_HEIGHT_PX - CELL_FOOT_MARGIN_PX - figure.footOffsetY * scale);
  const visibleLeft = Math.max(0, left);
  const visibleTop = Math.max(0, top);
  const visibleRight = Math.min(CELL_WIDTH_PX, left + scaledWidth);
  const visibleBottom = Math.min(CELL_HEIGHT_PX, top + scaledHeight);
  const clippedBuffer = await sharp(scaledBuffer)
    .extract({
      left: visibleLeft - left,
      top: visibleTop - top,
      width: visibleRight - visibleLeft,
      height: visibleBottom - visibleTop,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: CELL_WIDTH_PX,
      height: CELL_HEIGHT_PX,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: clippedBuffer, left: visibleLeft, top: visibleTop }])
    .png()
    .toBuffer();
}

// ─── building ───────────────────────────────────────────────────────────────────────────────────────

/** Every figure, cut, per group. Stops the build if a group does not hold what the map says. */
const figuresByGroup = new Map();
const reportLines = [];
for (const group of SHEET_GROUPS) {
  const figureCount = group.figureCount ?? 1;
  const figures = splitIntoSlabs(group.region, figureCount)
    .map((slab) => ({ slab, solidBox: findSolidBox(slab) }))
    .filter(({ solidBox }) => solidBox !== null)
    .map(({ slab, solidBox }) => extractFigure(slab, solidBox));
  if (figures.length !== figureCount) {
    throw new Error(`${group.name}: expected ${figureCount} figures, found ${figures.length}.`);
  }
  figuresByGroup.set(group.name, figures);
  reportLines.push(
    `${group.name}: ${figures.map((figure) => `${figure.cropWidth}x${figure.cropHeight}`).join(" ")}`,
  );
}

const sheetFigureHeights = [...figuresByGroup.entries()]
  .filter(([groupName]) => groupName !== "hero")
  .flatMap(([, figures]) => figures.map((figure) => figure.solidHeight))
  .toSorted((leftHeight, rightHeight) => leftHeight - rightHeight);
const medianFigureHeight = sheetFigureHeights[Math.floor(sheetFigureHeights.length / 2)];

/** [frameName, cellPngBuffer] in atlas order. */
const frameCells = [];
const animations = {};

for (const group of SHEET_GROUPS) {
  const frameNames = [];
  for (const [figureIndex, figure] of figuresByGroup.get(group.name).entries()) {
    const frameName = `figure/${group.name}/${figureIndex}`;
    // Only the hero is resampled: it is drawn larger than the rest and must stand at their height.
    const scale = group.role === "hero" ? medianFigureHeight / figure.solidHeight : 1;
    frameCells.push([frameName, await placeInCell(figure, scale)]);
    frameNames.push(frameName);
  }
  if (group.expression !== undefined) animations[`figure/${group.expression}`] = frameNames;
  if (group.pointingDirection !== undefined) {
    animations[`figure/point_${group.pointingDirection}`] = frameNames;
  }
}

// Resting: the Neutral pose first (frame 0 is what reduced motion shows), then the hero's welcome.
animations["figure/neutral"] = [...animations["figure/neutral"], "figure/hero/0"];

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
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
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

const neutralCell = frameCells.find(([frameName]) => frameName === "figure/neutral/0")?.[1];
const fallbackBuffer = await sharp(neutralCell).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
await writeFile(path.join(outputDirectory, "fallback.webp"), fallbackBuffer);

process.stdout.write(
  `${reportLines.join("\n")}\nWrote ${frameCells.length} frames (${atlasWidthPx}x${atlasHeightPx}, ${Math.round(atlasBuffer.length / 1024)} KB) and fallback.webp (${Math.round(fallbackBuffer.length / 1024)} KB) to ${path.relative(repositoryRoot, outputDirectory)}\n`,
);
