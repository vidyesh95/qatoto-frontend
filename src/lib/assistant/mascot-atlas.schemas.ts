// TRANSPORT: props-only — parses a static file the app itself ships. No React, no DOM.
//
// THE MASCOT ATLAS CONTRACT.
//
// The character is one PixiJS v8 spritesheet: `atlas.json` beside its image, in the TexturePacker
// "hash" shape Pixi reads natively. Its `animations` are whole figures, one per expression, plus
// optional pointing poses:
//
//   figure/<expression>         e.g. figure/neutral, figure/joy, figure/excited
//   figure/point_<direction>    e.g. figure/point_down, figure/point_left_up
//
// with names drawn from `mascot-expressions.ts`. Every frame is the SAME size and shares one anchor
// (feet centre, bottom middle of the frame). The frames of an animation are POSES rather than motion
// steps, so the runtime holds each one and crossfades to the next; `meta.frameHoldMs` lets the art
// say how long, per animation. `scripts/build-mascot-figure-atlas.mjs` writes the shipped atlas and
// states the full asset contract in its header; replacement art drops in by replacing the files.
//
// It is a file we ship, but it is still parsed rather than cast. An atlas is the one thing in this
// feature an artist hands over, and a misnamed key should be a stated failure (the mascot shows its
// static fallback) rather than a sprite built from `undefined`.

import { z } from "zod";

import {
  MASCOT_EXPRESSION_FALLBACK,
  MASCOT_EXPRESSIONS,
  MASCOT_REQUIRED_EXPRESSION,
  type MascotExpression,
  type MascotPointingDirection,
} from "@/lib/assistant/mascot-expressions";

/** Where the active art set lives. Swapping art sets is this one path. */
export const MASCOT_ART_DIRECTORY = "/assistant/mascot/opera";
export const MASCOT_ATLAS_JSON_URL = `${MASCOT_ART_DIRECTORY}/atlas.json`;
/** A single resting figure, for a browser with no WebGL. */
export const MASCOT_STATIC_FALLBACK_URL = `${MASCOT_ART_DIRECTORY}/fallback.webp`;
/**
 * CSS pixels. The shipped atlas's frame size once `meta.scale` is applied. Layout uses it before the
 * atlas has loaded and for the no-WebGL fallback; once loaded, the controller reads the real size.
 */
export const MASCOT_FRAME_WIDTH_PX = 96;
export const MASCOT_FRAME_HEIGHT_PX = 116;

/**
 * How much larger than its frame the mascot is drawn on screen. Desktop shows it at about
 * 145×175 CSS px, a phone at about 106×128 so it does not crowd the bottom nav. Above 1 the art is
 * upscaled (the sheet's figures are ~182 px tall, drawn at 1.7 stored px per CSS px), so it softens
 * slightly on a 2x screen; a sheet rendered larger fixes that with no code change.
 */
export const MASCOT_DISPLAY_SCALE_DESKTOP = 1.5;
export const MASCOT_DISPLAY_SCALE_MOBILE = 1.1;

/** How long one pose holds when the atlas does not say. */
export const MASCOT_DEFAULT_FRAME_HOLD_MS = 1_600;

const PixelRectangleSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

const PixelSizeSchema = z.object({
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

const MascotAtlasFrameSchema = z.object({
  frame: PixelRectangleSchema,
  rotated: z.boolean(),
  trimmed: z.boolean(),
  spriteSourceSize: PixelRectangleSchema,
  sourceSize: PixelSizeSchema,
});

const MascotSpritesheetDataSchema = z.object({
  frames: z.record(z.string().min(1), MascotAtlasFrameSchema),
  animations: z.record(z.string().min(1), z.array(z.string().min(1)).min(1)),
  meta: z.object({
    image: z.string().min(1),
    size: PixelSizeSchema,
    // A string in TexturePacker output ("1.5"), a number from some other packers. Pixi accepts both.
    scale: z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().positive()]),
    frameHoldMs: z.record(z.string().min(1), z.number().int().min(100).max(10_000)).optional(),
  }),
});

export type MascotSpritesheetData = z.infer<typeof MascotSpritesheetDataSchema>;

export interface MascotAtlas {
  readonly spritesheetData: MascotSpritesheetData;
  /** Absolute path of the image, resolved against the JSON's directory. */
  readonly imageUrl: string;
  readonly animationKeys: ReadonlySet<string>;
  /** CSS pixels: stored frame size divided by `meta.scale`. */
  readonly frameWidthPx: number;
  readonly frameHeightPx: number;
}

export type MascotAtlasParseResult =
  | { readonly success: true; readonly data: MascotAtlas }
  | {
      readonly success: false;
      readonly error: { readonly code: string; readonly message: string };
    };

const buildFigureKey = (expression: MascotExpression) => `figure/${expression}`;

export function parseMascotAtlas(rawAtlas: unknown): MascotAtlasParseResult {
  const parsed = MascotSpritesheetDataSchema.safeParse(rawAtlas);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "atlas_shape", message: "The mascot atlas does not match the contract." },
    };
  }

  const spritesheetData = parsed.data;
  const frameEntries = Object.values(spritesheetData.frames);
  const firstFrame = frameEntries[0];
  if (firstFrame === undefined) {
    return {
      success: false,
      error: { code: "atlas_empty", message: "The mascot atlas has no frames." },
    };
  }
  const hasUniformFrames = frameEntries.every(
    (frameEntry) =>
      frameEntry.sourceSize.w === firstFrame.sourceSize.w &&
      frameEntry.sourceSize.h === firstFrame.sourceSize.h,
  );
  if (!hasUniformFrames) {
    return {
      success: false,
      error: { code: "atlas_frame_size", message: "Every mascot frame must be the same size." },
    };
  }

  const frameNames = new Set(Object.keys(spritesheetData.frames));
  for (const [animationKey, animationFrameNames] of Object.entries(spritesheetData.animations)) {
    const missingFrameName = animationFrameNames.find((frameName) => !frameNames.has(frameName));
    if (missingFrameName !== undefined) {
      return {
        success: false,
        error: {
          code: "atlas_missing_frame",
          message: `Animation "${animationKey}" names frame "${missingFrameName}", which the atlas does not contain.`,
        },
      };
    }
  }

  const animationKeys = new Set(Object.keys(spritesheetData.animations));
  const requiredKey = buildFigureKey(MASCOT_REQUIRED_EXPRESSION);
  if (!animationKeys.has(requiredKey)) {
    return {
      success: false,
      error: {
        code: "atlas_missing_required_animation",
        message: `The mascot atlas must draw "${requiredKey}".`,
      },
    };
  }

  const atlasScale = Number(spritesheetData.meta.scale);
  // `meta.image` is relative to the JSON, the way every packer writes it.
  const atlasDirectory = MASCOT_ATLAS_JSON_URL.slice(0, MASCOT_ATLAS_JSON_URL.lastIndexOf("/"));
  return {
    success: true,
    data: {
      spritesheetData,
      imageUrl: `${atlasDirectory}/${spritesheetData.meta.image}`,
      animationKeys,
      frameWidthPx: firstFrame.sourceSize.w / atlasScale,
      frameHeightPx: firstFrame.sourceSize.h / atlasScale,
    },
  };
}

/**
 * Walks the fallback chain until it reaches a drawn animation. Bounded by the tuple length, so a
 * chain that cycles (a bad edit to the fallback map) ends at the required key instead of spinning.
 */
export function resolveMascotFigureKey(atlas: MascotAtlas, expression: MascotExpression): string {
  let candidateExpression = expression;
  for (let stepIndex = 0; stepIndex < MASCOT_EXPRESSIONS.length; stepIndex += 1) {
    const candidateKey = buildFigureKey(candidateExpression);
    if (atlas.animationKeys.has(candidateKey)) return candidateKey;
    candidateExpression = MASCOT_EXPRESSION_FALLBACK[candidateExpression];
  }
  return buildFigureKey(MASCOT_REQUIRED_EXPRESSION);
}

/** The pointing pose, or null when this atlas draws none: the mascot then simply does not point. */
export function resolveMascotPointingKey(
  atlas: MascotAtlas,
  direction: MascotPointingDirection,
): string | null {
  const pointingKey = `figure/point_${direction}`;
  return atlas.animationKeys.has(pointingKey) ? pointingKey : null;
}

export function readMascotFrameHoldMs(atlas: MascotAtlas, animationKey: string): number {
  return atlas.spritesheetData.meta.frameHoldMs?.[animationKey] ?? MASCOT_DEFAULT_FRAME_HOLD_MS;
}
