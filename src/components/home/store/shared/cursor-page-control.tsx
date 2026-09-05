// TRANSPORT: props-only — re-export only.
//
// MOVED to `@/components/home/shared/cursor-page-control`, because the Blueprints category
// indexes are keyset-paged server components with exactly this need and nothing about the control
// was ever store-specific. This path stays so the nine store call sites keep importing from where
// they already do — renaming them would be a diff with no behavior in it. The same move
// `filter-chip-row.tsx` made, for the same reason.
//
// New code should import from `@/components/home/shared/cursor-page-control` directly.

export { default } from "@/components/home/shared/cursor-page-control";
