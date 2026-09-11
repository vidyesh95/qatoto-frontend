// TRANSPORT: props-only — layout only. No data, and no logic beyond which separators to draw.

import type { ReactNode } from "react";

/**
 * A wrapping `·`-separated metadata line whose separators never strand at the end of a line.
 *
 * ⚠️ THE BUG IT FIXES WAS MEASURED ON A PHONE. `ShowcaseFeedRow` drew its meta line as flex
 * siblings — item, `·`, item — and at 400px five of the seven launches on `/blueprints/showcase`
 * wrapped between a separator and the item after it, leaving "3 days ago ·" at the end of one line
 * and "1 comment" at the start of the next. A trailing dot promises another item on that line, and
 * there is none.
 *
 * THE FIX IS GEOMETRY, NOT JAVASCRIPT. Every item carries its own leading 16px gutter holding its
 * separator, and the whole line is shifted 16px left inside an `overflow-hidden` box. Whichever item
 * starts a line — the first one, or one a wrap pushed down — has its gutter in the clipped strip, so
 * its separator is never seen; every other item's separator sits between it and its left neighbour.
 * No measurement and no resize listener, and it holds at any width for any set of conditional items,
 * which a "drop the separator before the first item" rule cannot, because it cannot know where the
 * browser will wrap.
 *
 * ⚠️ EVERY CHILD MUST BE A `BlueprintMetaItem`, INCLUDING ONES WITH NO SEPARATOR. The shift is
 * exactly one gutter wide, so a bare child would start inside the clipped strip and lose its first
 * characters the moment a wrap put it at the start of a line.
 */
export default function BlueprintMetaLine({
  className,
  children,
}: {
  /** Type size, colour and top margin. The line sets no typography of its own. */
  readonly className: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <p className="-ml-4 flex flex-wrap items-center gap-y-1">{children}</p>
    </div>
  );
}

export function BlueprintMetaItem({
  hasSeparator = true,
  shouldHideBelowSm = false,
  children,
}: {
  /** False only for an item that should never be preceded by a dot, e.g. the author or a run of tags. */
  readonly hasSeparator?: boolean;
  /** A `display` choice, so it is a flag rather than a class: `hidden` and `flex` cannot both be passed. */
  readonly shouldHideBelowSm?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <span className={`${shouldHideBelowSm ? "hidden sm:flex" : "flex"} min-w-0 items-center`}>
      <span aria-hidden="true" className="w-4 shrink-0 text-center">
        {hasSeparator ? "·" : null}
      </span>
      {children}
    </span>
  );
}
