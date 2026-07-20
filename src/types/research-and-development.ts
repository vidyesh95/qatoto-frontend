// Shared domain types for the Research & Development surface (concept-to-consumer
// pipeline). Data truth lives in the Express backend; these shapes are the
// client-side contract only. UI-building phase: consumed from static mocks in
// `src/mocks/research-and-development-mocks.ts`, no fetch layer yet.
//
// Split across `./research-and-development/*` by domain — this file is a thin
// re-export composer so the ~55 existing importers of
// `@/types/research-and-development` keep working unchanged.

export * from "./research-and-development/shared";
export * from "./research-and-development/project";
export * from "./research-and-development/discovery";
export * from "./research-and-development/workshop";
export * from "./research-and-development/immortal";
export * from "./research-and-development/proof-of-effort";
