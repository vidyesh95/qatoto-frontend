// TRANSPORT: props-only — authored constants. No fetching, no React, no DOM.
//
// THE MASCOT'S VOCABULARY, AND IT IS WIDER THAN ANY ONE ATLAS ON PURPOSE.
//
// AI Assist Mode draws its character from three independent sprite layers stacked in one
// container: a BODY in a pose, a FACE wearing an expression, and an optional EFFECT (sparkles,
// tears, a vein mark) over both. Layering is what keeps the art affordable — 26 expressions cost 26
// face strips, not 26 full-body animations per pose.
//
// These tuples are the catalogue the CODE speaks. The atlas on disk may draw only some of them (the
// placeholder draws eight faces), and the fallback maps below are how a request for an undrawn
// expression lands on the nearest drawn one. So commissioning more art is an atlas swap, never a
// code change, and code may ask for `embarrassed` today without knowing whether anyone drew it.
//
// No directive, deliberately: the reaction table and the atlas parser both import these values,
// and a value from a `"use client"` module is a client reference on the server (AGENTS.md).

export const MASCOT_EXPRESSIONS = [
  "neutral",
  "smile",
  "joy",
  "laughing",
  "excited",
  "love",
  "proud",
  "smug",
  "wink",
  "determined",
  "relieved",
  "thinking",
  "curious",
  "confused",
  "surprised",
  "shocked",
  "embarrassed",
  "nervous",
  "scared",
  "sad",
  "crying",
  "annoyed",
  "angry",
  "disgusted",
  "bored",
  "sleepy",
] as const;

export type MascotExpression = (typeof MASCOT_EXPRESSIONS)[number];

export const MASCOT_POSES = ["float_idle", "sit", "travel", "wave", "point", "celebrate"] as const;

export type MascotPose = (typeof MASCOT_POSES)[number];

export const MASCOT_EFFECTS = [
  "sparkles",
  "anger_mark",
  "sweat_drop",
  "tears",
  "hearts",
  "question_mark",
  "zzz",
] as const;

export type MascotEffect = (typeof MASCOT_EFFECTS)[number];

/**
 * The one step toward a more basic expression, for when the atlas did not draw this one.
 *
 * A `Record` so a new expression is a compile error until it says where it falls back to. Every
 * chain ends at `neutral`, which maps to itself, and `neutral` is the one face an atlas is REQUIRED
 * to draw — so resolution always terminates on a drawn face.
 */
export const MASCOT_EXPRESSION_FALLBACK: Record<MascotExpression, MascotExpression> = {
  neutral: "neutral",
  smile: "joy",
  joy: "neutral",
  laughing: "joy",
  excited: "joy",
  love: "joy",
  proud: "joy",
  smug: "smile",
  wink: "smile",
  determined: "angry",
  relieved: "smile",
  thinking: "neutral",
  curious: "thinking",
  confused: "thinking",
  surprised: "neutral",
  shocked: "surprised",
  embarrassed: "nervous",
  nervous: "surprised",
  scared: "surprised",
  sad: "neutral",
  crying: "sad",
  annoyed: "angry",
  angry: "neutral",
  disgusted: "annoyed",
  bored: "sleepy",
  sleepy: "neutral",
};

/**
 * Same idea for poses. `float_idle` and `sit` are the two an atlas must draw: the mascot is either
 * hovering or perched on something, and every other pose is a flourish on top of those two.
 */
export const MASCOT_POSE_FALLBACK: Record<MascotPose, MascotPose> = {
  float_idle: "float_idle",
  sit: "sit",
  travel: "float_idle",
  wave: "float_idle",
  point: "float_idle",
  celebrate: "float_idle",
};

/** The poses and face every atlas must draw for fallback resolution to terminate. */
export const MASCOT_REQUIRED_POSES: readonly MascotPose[] = ["float_idle", "sit"];
export const MASCOT_REQUIRED_EXPRESSION: MascotExpression = "neutral";
