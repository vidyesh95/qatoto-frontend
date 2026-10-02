// TRANSPORT: props-only — parses a static file the app itself ships. No React, no DOM.
//
// THE MASCOT ATLAS CONTRACT.
//
// The character is one PixiJS v8 spritesheet: `atlas.json` beside `atlas.png`, in the TexturePacker
// "hash" shape Pixi reads natively. Its `animations` keys are namespaced by layer:
//
//   body/<pose>          e.g. body/float_idle, body/sit
//   face/<expression>    e.g. face/neutral, face/joy
//   effect/<effect>      e.g. effect/sparkles
//
// with names drawn from `mascot-expressions.ts`. Every frame in every layer is the SAME size and
// shares one anchor (feet centre, bottom middle of the frame), so the three layers stack without
// per-frame offsets. `scripts/build-mascot-placeholder-atlas.mjs` writes the placeholder and states
// the full asset contract in its header; a commissioned atlas drops in by replacing the two files.
//
// It is a file we ship, but it is still parsed rather than cast. An atlas is the one thing in this
// feature an artist hands over, and a misnamed key should be a stated failure (the mascot shows its
// static fallback) rather than an AnimatedSprite built from `undefined`.

import { z } from "zod";

import {
  MASCOT_EXPRESSION_FALLBACK,
  MASCOT_EXPRESSIONS,
  MASCOT_POSE_FALLBACK,
  MASCOT_POSES,
  MASCOT_REQUIRED_EXPRESSION,
  MASCOT_REQUIRED_POSES,
  type MascotEffect,
  type MascotExpression,
  type MascotPose,
} from "@/lib/assistant/mascot-expressions";

/** Where the active art set lives. Swapping art sets is this one path. */
export const MASCOT_ART_DIRECTORY = "/assistant/mascot/placeholder";
export const MASCOT_ATLAS_JSON_URL = `${MASCOT_ART_DIRECTORY}/atlas.json`;
/** A single composited neutral frame, for a browser with no WebGL. */
export const MASCOT_STATIC_FALLBACK_URL = `${MASCOT_ART_DIRECTORY}/fallback.png`;
/** CSS pixels. The frame's logical size once `meta.scale` is applied; layout uses it before Pixi loads. */
export const MASCOT_FRAME_SIZE_PX = 128;

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
    // A string in TexturePacker output ("2"), a number from some other packers. Pixi accepts both.
    scale: z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().positive()]),
  }),
});

export type MascotSpritesheetData = z.infer<typeof MascotSpritesheetDataSchema>;

export interface MascotAtlas {
  readonly spritesheetData: MascotSpritesheetData;
  /** Absolute path of the PNG, resolved against the JSON's directory. */
  readonly imageUrl: string;
  readonly animationKeys: ReadonlySet<string>;
}

export type MascotAtlasParseResult =
  | { readonly success: true; readonly data: MascotAtlas }
  | {
      readonly success: false;
      readonly error: { readonly code: string; readonly message: string };
    };

const buildBodyKey = (pose: MascotPose) => `body/${pose}`;
const buildFaceKey = (expression: MascotExpression) => `face/${expression}`;
const buildEffectKey = (effect: MascotEffect) => `effect/${effect}`;

export function parseMascotAtlas(rawAtlas: unknown): MascotAtlasParseResult {
  const parsed = MascotSpritesheetDataSchema.safeParse(rawAtlas);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "atlas_shape", message: "The mascot atlas does not match the contract." },
    };
  }

  const spritesheetData = parsed.data;
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
  const requiredKeys = [
    ...MASCOT_REQUIRED_POSES.map(buildBodyKey),
    buildFaceKey(MASCOT_REQUIRED_EXPRESSION),
  ];
  const missingRequiredKey = requiredKeys.find((requiredKey) => !animationKeys.has(requiredKey));
  if (missingRequiredKey !== undefined) {
    return {
      success: false,
      error: {
        code: "atlas_missing_required_animation",
        message: `The mascot atlas must draw "${missingRequiredKey}".`,
      },
    };
  }

  // `meta.image` is relative to the JSON, the way every packer writes it.
  const atlasDirectory = MASCOT_ATLAS_JSON_URL.slice(0, MASCOT_ATLAS_JSON_URL.lastIndexOf("/"));
  return {
    success: true,
    data: {
      spritesheetData,
      imageUrl: `${atlasDirectory}/${spritesheetData.meta.image}`,
      animationKeys,
    },
  };
}

/**
 * Walks the fallback chain until it reaches a drawn animation. Bounded by the tuple length, so a
 * chain that cycles (a bad edit to the fallback map) ends at the required key instead of spinning.
 */
function resolveDrawnKey<Name extends string>(
  atlas: MascotAtlas,
  requestedName: Name,
  fallbackByName: Record<Name, Name>,
  buildKey: (name: Name) => string,
  requiredName: Name,
  maximumSteps: number,
): string {
  let candidateName = requestedName;
  for (let stepIndex = 0; stepIndex < maximumSteps; stepIndex += 1) {
    const candidateKey = buildKey(candidateName);
    if (atlas.animationKeys.has(candidateKey)) return candidateKey;
    candidateName = fallbackByName[candidateName];
  }
  return buildKey(requiredName);
}

export function resolveMascotFaceKey(atlas: MascotAtlas, expression: MascotExpression): string {
  return resolveDrawnKey(
    atlas,
    expression,
    MASCOT_EXPRESSION_FALLBACK,
    buildFaceKey,
    MASCOT_REQUIRED_EXPRESSION,
    MASCOT_EXPRESSIONS.length,
  );
}

export function resolveMascotBodyKey(atlas: MascotAtlas, pose: MascotPose): string {
  return resolveDrawnKey(
    atlas,
    pose,
    MASCOT_POSE_FALLBACK,
    buildBodyKey,
    "float_idle",
    MASCOT_POSES.length,
  );
}

/** Effects have no fallback: an undrawn effect is simply not shown. */
export function resolveMascotEffectKey(
  atlas: MascotAtlas,
  effect: MascotEffect | null,
): string | null {
  if (effect === null) return null;
  const effectKey = buildEffectKey(effect);
  return atlas.animationKeys.has(effectKey) ? effectKey : null;
}
