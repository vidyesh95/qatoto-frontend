// TRANSPORT: props-only — presentational server component. Fetches nothing, holds no
// state: each chip is a Link that rewrites the query string, and the server component above
// re-reads `searchParams` and re-queries the backend.
//
// THIS IS WHAT MAKES FILTERING SERVER-SIDE. It also means a filtered view is shareable and
// survives back-navigation, which a `useState` selection never did — and it is why these
// rows are NOT client islands.
//
// HOISTED from `research-and-development/sections/` because the store's search and category
// pages need exactly this and nothing about it is R&D-specific. The old path re-exports it,
// so the six R&D call sites are untouched.

import Link from "next/link";

const FILTER_CHIP_CLASS =
  "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors";

export interface FilterChipOption {
  /** The chip's label. */
  readonly label: string;
  /** Where clicking it goes — build with `buildFilterHref`. */
  readonly href: string;
  readonly isSelected: boolean;
}

/**
 * One horizontally scrolling row of filter chips.
 *
 * `scroll={false}` on every chip: re-querying a filter should not yank the viewport to the
 * top of the document, because the chips the visitor is using are usually below it.
 */
export default function FilterChipRow({
  options,
  ariaLabel,
}: {
  options: FilterChipOption[];
  ariaLabel: string;
}) {
  // A `nav` rather than a `div role="group"`: these chips are links that change the URL, so
  // a screen reader should announce them as a set of destinations. The label is what
  // distinguishes one filter row from the next when several are stacked.
  //
  // `items-center` is load-bearing, not cosmetic. A row placed beside a taller flex sibling
  // (the problem map's "Report a problem" trigger) inherits that sibling's 36px line
  // height, and without it every chip stretches to fill — `rounded-full` clamps to an 18px
  // radius and the pill reads as a lozenge.
  return (
    <nav className="flex items-center gap-2 overflow-x-auto" aria-label={ariaLabel}>
      {options.map((option) => (
        <Link
          key={option.href + option.label}
          href={option.href}
          scroll={false}
          aria-current={option.isSelected ? "true" : undefined}
          className={`${FILTER_CHIP_CLASS} ${
            option.isSelected
              ? "bg-[#00696E] text-white"
              : "bg-muted text-foreground hover:bg-muted/70"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
