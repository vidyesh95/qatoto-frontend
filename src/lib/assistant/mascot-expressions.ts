// TRANSPORT: props-only — authored constants. No fetching, no React, no DOM.
//
// THE MASCOT'S VOCABULARY, AND IT IS WIDER THAN ANY ONE ATLAS ON PURPOSE.
//
// AI Assist Mode draws its character as whole figures, one animation per expression
// (`figure/<expression>` in the atlas). This tuple is the catalogue the CODE speaks. The atlas on
// disk may draw only some of it (the opera atlas draws eleven), and the fallback map below is how a
// request for an undrawn expression lands on the nearest drawn one. So more art is an atlas swap,
// never a code change, and code may ask for `smug` today without knowing whether anyone drew it.
//
// No directive, deliberately: the reaction table, the reply schema and the atlas parser all import
// these values, and a value from a `"use client"` module is a client reference on the server.

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
  "pouting",
  "enlightened",
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

/**
 * The one step toward a more basic expression, for when the atlas did not draw this one.
 *
 * A `Record` so a new expression is a compile error until it says where it falls back to. Every
 * chain ends at `neutral`, which maps to itself, and `neutral` is the one figure an atlas is
 * REQUIRED to draw — so resolution always terminates on a drawn figure.
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
  pouting: "annoyed",
  enlightened: "relieved",
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

/** The one expression every atlas must draw, so fallback resolution always ends on a drawn figure. */
export const MASCOT_REQUIRED_EXPRESSION: MascotExpression = "neutral";
