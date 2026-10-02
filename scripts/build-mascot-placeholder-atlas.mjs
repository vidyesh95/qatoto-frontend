// Builds the PLACEHOLDER art for AI Assist Mode's mascot:
//
//   public/assistant/mascot/placeholder/atlas.png     the packed sprite sheet
//   public/assistant/mascot/placeholder/atlas.json    PixiJS v8 spritesheet data (TexturePacker "hash")
//   public/assistant/mascot/placeholder/fallback.png  one composited still, for browsers with no WebGL
//
// Run once, commit the output:   node scripts/build-mascot-placeholder-atlas.mjs
//
// The drawing is deliberately simple vector SVG rasterised with sharp. It exists so the runtime has
// something real to load while the actual character is commissioned. NOTHING IN THE RUNTIME KNOWS
// THIS IS A PLACEHOLDER: a commissioned atlas replaces these three files (or sets a new directory in
// `MASCOT_ART_DIRECTORY`, `src/lib/assistant/mascot-atlas.schemas.ts`) and no code changes.
//
// ─── THE ASSET CONTRACT, which a commissioned atlas must follow ─────────────────────────────────────
//
//  1. Three LAYERS, stacked bottom to top in one container, each its own animation:
//       body/<pose>          poses from MASCOT_POSES        (src/lib/assistant/mascot-expressions.ts)
//       face/<expression>    expressions from MASCOT_EXPRESSIONS
//       effect/<effect>      effects from MASCOT_EFFECTS
//     A face strip draws ONLY the face (eyes, brows, mouth, blush) on a transparent frame, so any
//     face sits on any body. That is why 26 expressions cost 26 strips, not 26 per pose.
//  2. REQUIRED: body/float_idle, body/sit and face/neutral. Everything else is optional; an undrawn
//     expression or pose falls back along MASCOT_EXPRESSION_FALLBACK / MASCOT_POSE_FALLBACK, and an
//     undrawn effect is simply not shown.
//  3. EVERY FRAME IN EVERY LAYER IS THE SAME SIZE and shares ONE ANCHOR: feet centre, which is the
//     bottom-middle of the frame. Body poses keep the head in the same place, so faces line up.
//     For `sit`, the bottom of the frame is the seat: that line rests on the perch's top edge.
//  4. Frames are drawn at 2x and the JSON says `"scale": "2"`. The runtime lays the character out
//     in a MASCOT_FRAME_SIZE_PX (128) CSS-pixel box, so a frame is 256x256 device pixels.
//  5. FRAME 0 OF EVERY ANIMATION IS THE RESTING FRAME (eyes open, effect at rest). Under
//     prefers-reduced-motion the runtime shows only frame 0 of each layer.
//  6. Frame names may repeat inside an animation list; that is how `face/neutral` holds its open
//     eyes for eleven ticks and blinks on the twelfth.
//
// ─── THE RECOMMENDED ROUTE FOR THE REAL ART ─────────────────────────────────────────────────────────
//
// A flat 2D sprite will not match a live-rendered 3D figure: no rim light, no depth, no turning in
// space. Close most of that gap in the ART, not the runtime: model and pose the character in 3D
// (Blender, or VRoid for an anime figure), render each layer's frames to PNG with the lighting baked
// in, and pack them into this same contract (TexturePacker, or Pixi's AssetPack, "hash" format with
// animations). Shading and depth come for free, and the runtime, this contract and the file size
// stay what they are.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(repositoryRoot, "public/assistant/mascot/placeholder");

const FRAME_SIZE_PX = 256;
const ATLAS_COLUMN_COUNT = 8;

const INK = "#1E2433";
const SKIN = "#FFE0CC";
const HAIR = "#24324A";
const HAIR_SHINE = "#3B4F70";
const HOODIE = "#00696E";
const HOODIE_LIGHT = "#1F8A8F";
const IRIS = "#2A9DA3";
const MOUTH = "#8A3B3B";
const TONGUE = "#E07A7A";
const BLUSH = "#F4A0A0";
const SPARKLE = "#F5C542";
const HEART = "#E8607A";

const wrapFrameSvg = (innerSvg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_SIZE_PX}" height="${FRAME_SIZE_PX}" viewBox="0 0 ${FRAME_SIZE_PX} ${FRAME_SIZE_PX}">${innerSvg}</svg>`;

// ─── body ──────────────────────────────────────────────────────────────────────────────────────────

const drawHead = () => `
  <path d="M50,118 Q46,40 128,34 Q210,40 206,118 L204,170 Q190,150 186,128 L70,128 Q66,150 52,170 Z" fill="${HAIR}" />
  <circle cx="128" cy="114" r="70" fill="${SKIN}" stroke="${INK}" stroke-width="3" />
  <path d="M58,112 Q56,40 128,38 Q200,40 198,112 Q186,84 170,96 Q160,74 140,92 Q128,70 112,92 Q96,74 86,96 Q72,84 58,112 Z"
        fill="${HAIR}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" />
  <path d="M84,62 Q100,48 120,48" fill="none" stroke="${HAIR_SHINE}" stroke-width="5" stroke-linecap="round" />
  <path d="M128,40 Q116,12 142,8 Q126,22 136,40 Z" fill="${HAIR}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" />`;

const drawTorso = () => `
  <path d="M90,238 Q88,180 128,174 Q168,180 166,238 Z" fill="${HOODIE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" />
  <path d="M118,186 L116,206 M138,186 L140,206" stroke="${HOODIE_LIGHT}" stroke-width="3" stroke-linecap="round" />`;

const drawFloatingBody = (armDropPx) => {
  const armY = 200 + armDropPx;
  return `
  <rect x="104" y="224" width="20" height="26" rx="9" fill="${HAIR}" stroke="${INK}" stroke-width="3" />
  <rect x="132" y="224" width="20" height="26" rx="9" fill="${HAIR}" stroke="${INK}" stroke-width="3" />
  ${drawTorso()}
  <ellipse cx="86" cy="${armY}" rx="11" ry="21" fill="${HOODIE}" stroke="${INK}" stroke-width="3" transform="rotate(22 86 ${armY})" />
  <ellipse cx="170" cy="${armY}" rx="11" ry="21" fill="${HOODIE}" stroke="${INK}" stroke-width="3" transform="rotate(-22 170 ${armY})" />
  <circle cx="78" cy="${armY + 20}" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="3" />
  <circle cx="178" cy="${armY + 20}" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="3" />
  ${drawHead()}`;
};

const drawSittingBody = (footSwingPx) => `
  <ellipse cx="${108 - footSwingPx}" cy="240" rx="22" ry="11" fill="${HAIR}" stroke="${INK}" stroke-width="3" />
  <ellipse cx="${148 + footSwingPx}" cy="240" rx="22" ry="11" fill="${HAIR}" stroke="${INK}" stroke-width="3" />
  ${drawTorso()}
  <ellipse cx="98" cy="214" rx="11" ry="19" fill="${HOODIE}" stroke="${INK}" stroke-width="3" transform="rotate(-30 98 214)" />
  <ellipse cx="158" cy="214" rx="11" ry="19" fill="${HOODIE}" stroke="${INK}" stroke-width="3" transform="rotate(30 158 214)" />
  <circle cx="110" cy="228" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="3" />
  <circle cx="146" cy="228" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="3" />
  ${drawHead()}`;

// ─── face parts (face layer only: eyes, brows, mouth, blush) ──────────────────────────────────────

const LEFT_EYE_X = 104;
const RIGHT_EYE_X = 152;
const EYE_Y = 126;

const strokeLine = (pathData, widthPx = 3.5) =>
  `<path d="${pathData}" fill="none" stroke="${INK}" stroke-width="${widthPx}" stroke-linecap="round" stroke-linejoin="round" />`;

const drawOpenEye = (centerX, { lookX = 0, lookY = 0, heightPx = 13, isWatery = false } = {}) => `
  <ellipse cx="${centerX}" cy="${EYE_Y}" rx="9" ry="${heightPx}" fill="${INK}" />
  <ellipse cx="${centerX + lookX}" cy="${EYE_Y + 3 + lookY}" rx="6" ry="${Math.max(4, heightPx - 5)}" fill="${IRIS}" />
  <circle cx="${centerX - 3 + lookX}" cy="${EYE_Y - 6 + lookY}" r="${isWatery ? 4.5 : 3.2}" fill="#FFFFFF" />
  ${isWatery ? `<circle cx="${centerX + 3 + lookX}" cy="${EYE_Y + 6 + lookY}" r="2" fill="#FFFFFF" />` : ""}`;

const drawOpenEyes = (options) =>
  drawOpenEye(LEFT_EYE_X, options) + drawOpenEye(RIGHT_EYE_X, options);

const drawBlush = () => `
  <ellipse cx="84" cy="148" rx="11" ry="5" fill="${BLUSH}" opacity="0.7" />
  <ellipse cx="172" cy="148" rx="11" ry="5" fill="${BLUSH}" opacity="0.7" />`;

const drawOpenMouth = (depthPx) => `
  <path d="M112,146 L144,146 Q142,${146 + depthPx} 128,${146 + depthPx} Q114,${146 + depthPx} 112,146 Z" fill="${MOUTH}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" />
  <path d="M119,${140 + depthPx} Q128,${133 + depthPx} 137,${140 + depthPx} Q133,${145 + depthPx} 128,${145 + depthPx} Q123,${145 + depthPx} 119,${140 + depthPx} Z" fill="${TONGUE}" />`;

const SMALL_SMILE = strokeLine("M120,150 Q128,157 136,150", 3);
const FROWN = strokeLine("M119,157 Q128,149 137,157", 3);

const FACE_FRAMES = {
  neutral_open: drawOpenEyes() + drawBlush() + SMALL_SMILE,
  neutral_blink:
    strokeLine(`M95,${EYE_Y + 1} Q104,${EYE_Y + 5} 113,${EYE_Y + 1}`) +
    strokeLine(`M143,${EYE_Y + 1} Q152,${EYE_Y + 5} 161,${EYE_Y + 1}`) +
    drawBlush() +
    SMALL_SMILE,
  joy:
    strokeLine("M94,130 Q104,116 114,130") +
    strokeLine("M142,130 Q152,116 162,130") +
    drawBlush() +
    drawOpenMouth(18),
  laughing_open:
    strokeLine("M96,118 L112,126 L96,134") +
    strokeLine("M160,118 L144,126 L160,134") +
    drawBlush() +
    drawOpenMouth(22),
  laughing_wide:
    strokeLine("M96,116 L112,125 L96,134") +
    strokeLine("M160,116 L144,125 L160,134") +
    drawBlush() +
    drawOpenMouth(26),
  angry:
    strokeLine("M90,103 L116,114", 5) +
    strokeLine("M166,103 L140,114", 5) +
    drawOpenEyes({ heightPx: 10 }) +
    FROWN,
  sad:
    strokeLine("M92,113 L115,104", 4) +
    strokeLine("M164,113 L141,104", 4) +
    drawOpenEyes({ isWatery: true }) +
    FROWN,
  surprised: `
    ${strokeLine("M94,101 Q104,93 114,101", 4)}
    ${strokeLine("M142,101 Q152,93 162,101", 4)}
    <circle cx="${LEFT_EYE_X}" cy="${EYE_Y}" r="12" fill="#FFFFFF" stroke="${INK}" stroke-width="3" />
    <circle cx="${RIGHT_EYE_X}" cy="${EYE_Y}" r="12" fill="#FFFFFF" stroke="${INK}" stroke-width="3" />
    <circle cx="${LEFT_EYE_X}" cy="${EYE_Y}" r="5" fill="${INK}" />
    <circle cx="${RIGHT_EYE_X}" cy="${EYE_Y}" r="5" fill="${INK}" />
    <ellipse cx="128" cy="158" rx="6" ry="8" fill="${MOUTH}" stroke="${INK}" stroke-width="3" />`,
  thinking:
    strokeLine("M94,108 L114,108", 4) +
    strokeLine("M142,101 Q152,94 162,101", 4) +
    drawOpenEyes({ lookX: 3, lookY: -4 }) +
    strokeLine("M119,155 L136,150", 3),
  sleepy: `
    ${strokeLine(`M94,${EYE_Y} Q104,${EYE_Y + 8} 114,${EYE_Y}`)}
    ${strokeLine(`M142,${EYE_Y} Q152,${EYE_Y + 8} 162,${EYE_Y}`)}
    ${drawBlush()}
    <ellipse cx="128" cy="156" rx="4" ry="5" fill="${MOUTH}" stroke="${INK}" stroke-width="2.5" />`,
};

// ─── effects ───────────────────────────────────────────────────────────────────────────────────────

const drawSparkle = (centerX, centerY, sizePx) =>
  `<path d="M${centerX},${centerY - sizePx} Q${centerX},${centerY} ${centerX + sizePx},${centerY} Q${centerX},${centerY} ${centerX},${centerY + sizePx} Q${centerX},${centerY} ${centerX - sizePx},${centerY} Q${centerX},${centerY} ${centerX},${centerY - sizePx} Z" fill="${SPARKLE}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" />`;

const drawHeart = (centerX, centerY, sizePx) =>
  `<path d="M${centerX},${centerY + sizePx * 0.9} C${centerX - sizePx * 1.6},${centerY - sizePx * 0.2} ${centerX - sizePx * 0.6},${centerY - sizePx * 1.2} ${centerX},${centerY - sizePx * 0.35} C${centerX + sizePx * 0.6},${centerY - sizePx * 1.2} ${centerX + sizePx * 1.6},${centerY - sizePx * 0.2} ${centerX},${centerY + sizePx * 0.9} Z" fill="${HEART}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" />`;

const drawZ = (leftX, topY, sizePx) =>
  `<path d="M${leftX},${topY} h${sizePx} l${-sizePx},${sizePx} h${sizePx}" fill="none" stroke="${INK}" stroke-width="${Math.max(2.5, sizePx / 6)}" stroke-linecap="round" stroke-linejoin="round" />`;

const EFFECT_FRAMES = {
  sparkles_0: drawSparkle(40, 70, 14) + drawSparkle(214, 52, 10) + drawSparkle(220, 150, 12),
  sparkles_1:
    drawSparkle(40, 70, 9) +
    drawSparkle(214, 52, 15) +
    drawSparkle(220, 150, 8) +
    drawSparkle(30, 160, 10),
  sparkles_2:
    drawSparkle(40, 70, 12) +
    drawSparkle(214, 52, 8) +
    drawSparkle(220, 150, 15) +
    drawSparkle(30, 160, 6),
  hearts_0: drawHeart(212, 70, 12) + drawHeart(40, 96, 9),
  hearts_1: drawHeart(214, 54, 13) + drawHeart(38, 80, 10),
  hearts_2: drawHeart(216, 38, 14) + drawHeart(36, 64, 11),
  zzz_0: drawZ(190, 50, 14) + drawZ(212, 26, 10),
  zzz_1: drawZ(194, 44, 16) + drawZ(216, 20, 11),
  zzz_2: drawZ(198, 38, 18) + drawZ(220, 14, 12),
};

// ─── frames and animations ────────────────────────────────────────────────────────────────────────

/** Ordered list of [frameName, svg]. */
const frameEntries = [
  ["body/float_idle/0", drawFloatingBody(0)],
  ["body/float_idle/1", drawFloatingBody(3)],
  ["body/sit/0", drawSittingBody(0)],
  ["body/sit/1", drawSittingBody(3)],
  ...Object.entries(FACE_FRAMES).map(([faceName, faceSvg]) => [`face/${faceName}`, faceSvg]),
  ...Object.entries(EFFECT_FRAMES).map(([effectName, effectSvg]) => [
    `effect/${effectName}`,
    effectSvg,
  ]),
];

const repeatFrame = (frameName, repeatCount) =>
  Array.from({ length: repeatCount }, () => frameName);

const animations = {
  "body/float_idle": ["body/float_idle/0", "body/float_idle/1"],
  "body/sit": ["body/sit/0", "body/sit/1"],
  "face/neutral": [...repeatFrame("face/neutral_open", 11), "face/neutral_blink"],
  "face/joy": ["face/joy"],
  "face/laughing": ["face/laughing_open", "face/laughing_wide"],
  "face/angry": ["face/angry"],
  "face/sad": ["face/sad"],
  "face/surprised": ["face/surprised"],
  "face/thinking": ["face/thinking"],
  "face/sleepy": ["face/sleepy"],
  "effect/sparkles": ["effect/sparkles_0", "effect/sparkles_1", "effect/sparkles_2"],
  "effect/hearts": ["effect/hearts_0", "effect/hearts_1", "effect/hearts_2"],
  "effect/zzz": ["effect/zzz_0", "effect/zzz_1", "effect/zzz_2"],
};

const atlasRowCount = Math.ceil(frameEntries.length / ATLAS_COLUMN_COUNT);
const atlasWidthPx = ATLAS_COLUMN_COUNT * FRAME_SIZE_PX;
const atlasHeightPx = atlasRowCount * FRAME_SIZE_PX;

const frames = {};
const composites = frameEntries.map(([frameName, frameSvg], frameIndex) => {
  const left = (frameIndex % ATLAS_COLUMN_COUNT) * FRAME_SIZE_PX;
  const top = Math.floor(frameIndex / ATLAS_COLUMN_COUNT) * FRAME_SIZE_PX;
  frames[frameName] = {
    frame: { x: left, y: top, w: FRAME_SIZE_PX, h: FRAME_SIZE_PX },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: FRAME_SIZE_PX, h: FRAME_SIZE_PX },
    sourceSize: { w: FRAME_SIZE_PX, h: FRAME_SIZE_PX },
  };
  return { input: Buffer.from(wrapFrameSvg(frameSvg)), left, top };
});

const transparentCanvas = (widthPx, heightPx) =>
  sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

await mkdir(outputDirectory, { recursive: true });

const atlasPngBuffer = await transparentCanvas(atlasWidthPx, atlasHeightPx)
  .composite(composites)
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toBuffer();
await writeFile(path.join(outputDirectory, "atlas.png"), atlasPngBuffer);

const atlasJson = {
  frames,
  animations,
  meta: {
    app: "scripts/build-mascot-placeholder-atlas.mjs",
    image: "atlas.png",
    format: "RGBA8888",
    size: { w: atlasWidthPx, h: atlasHeightPx },
    scale: "2",
  },
};
await writeFile(
  path.join(outputDirectory, "atlas.json"),
  `${JSON.stringify(atlasJson, null, 2)}\n`,
);

const fallbackPngBuffer = await transparentCanvas(FRAME_SIZE_PX, FRAME_SIZE_PX)
  .composite([
    { input: Buffer.from(wrapFrameSvg(drawFloatingBody(0))), left: 0, top: 0 },
    { input: Buffer.from(wrapFrameSvg(FACE_FRAMES.neutral_open)), left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toBuffer();
await writeFile(path.join(outputDirectory, "fallback.png"), fallbackPngBuffer);

process.stdout.write(
  `Wrote ${frameEntries.length} frames (${atlasWidthPx}x${atlasHeightPx}, ${Math.round(atlasPngBuffer.length / 1024)} KB) and fallback.png (${Math.round(fallbackPngBuffer.length / 1024)} KB) to ${path.relative(repositoryRoot, outputDirectory)}\n`,
);
