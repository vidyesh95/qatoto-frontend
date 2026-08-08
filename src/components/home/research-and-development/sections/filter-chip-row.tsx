// TRANSPORT: props-only — re-export only.
//
// MOVED to `@/components/home/shared/filter-chip-row`, because the store's search and
// category pages need the same control and nothing about it was ever R&D-specific. This
// path stays so the six R&D call sites keep importing from where they already do — renaming
// them would be a diff with no behavior in it.
//
// New code should import from `@/components/home/shared/filter-chip-row` directly.

export { default, type FilterChipOption } from "@/components/home/shared/filter-chip-row";
