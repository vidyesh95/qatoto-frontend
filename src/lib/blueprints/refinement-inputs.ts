// TRANSPORT: props-only — a Zod helper for the Blueprints form contracts. No network.
//
// ⚠️ WHY THIS EXISTS. Zod 4 skips an object's refinements whenever one of its fields produced an
// ABORTING issue: a wrong type (a `NaN` cost included) or a miss on an enum or literal. Every
// Blueprints form starts in exactly that state, with an unchosen select, so a cross-field message
// such as "tick both statements" stayed hidden until the maker fixed the select and pressed again.
// `when` lets a refinement run anyway; this builds that predicate from a small schema naming the
// fields the refinement actually reads, so it runs exactly when those fields are well-typed.
//
// ⚠️ THE REFINEMENT BODY MUST RE-PARSE THE SAME SCHEMA AND READ ONLY WHAT THAT RETURNS. Once `when`
// lets a partly invalid payload through, the body's argument is typed as valid output while holding
// raw input (`difficulty: ""`, `NaN`). Re-parsing keeps that honest without an `as`.
//
// ⚠️ `.pick()` IS NOT A SHORTCUT for the inputs schema. Zod 4 throws when picking from an object that
// carries refinements, so each refinement declares its own small `z.object`, which also ignores
// every key it does not name.

import type { z } from "zod";

/** A `when` predicate: run the refinement exactly when the fields it reads are well-typed. */
export function buildWellTypedInputsPredicate(
  refinementInputsSchema: z.ZodType,
): (payload: { readonly value: unknown }) => boolean {
  return (payload) => refinementInputsSchema.safeParse(payload.value).success;
}
