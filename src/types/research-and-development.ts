// Shared domain types for the STILL-MOCK Research & Development surfaces.
//
// THIS BARREL IS SHRINKING, on purpose. A wired surface takes its types from the Zod
// schemas in `src/lib/rnd/*.schemas.ts`, which are inferred from what the backend
// actually sends; what is left here is exactly what is still fabricated. When a phase
// wires up, its module leaves this list rather than being kept as a parallel shape.
//
// `./research-and-development/workshop` is gone — phase 3 replaced it with
// `@/lib/rnd/workshop.schemas`. `./proof-of-effort` and `./oversight` are gone the same
// way: phase 4 replaced both with `@/lib/rnd/proof-of-effort.schemas`, and their mocks
// were deleted rather than kept as a fallback, because a silent fallback hides a broken
// endpoint.

export * from "./research-and-development/shared";
export * from "./research-and-development/project";
export * from "./research-and-development/discovery";
export * from "./research-and-development/compensation";
