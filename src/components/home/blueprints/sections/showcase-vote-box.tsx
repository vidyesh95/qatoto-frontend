// TRANSPORT: props-only — the count arrives from the showcase feed or its detail page.

import Image from "next/image";

import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel } from "@/lib/store/format";

/**
 * A launch's upvote count, stacked caret-over-number in a fixed 40×44 gutter — the Launch YC
 * shape, in the blueprints palette.
 *
 * A `<span>`, NEVER A BUTTON, AND THAT IS NOT AN OVERSIGHT. There is no vote endpoint on the
 * backend, and a control that incremented a number in the browser would be a business rule
 * enforced on a layer the user controls — the exact thing CLAUDE.md §1.1 forbids. It is BARE —
 * no border, no background, no hover, no `cursor-pointer` — because a bordered box reads as a
 * button, and this one does nothing. When a real vote route exists this becomes a button and this
 * comment goes away; until then it displays.
 *
 * NO `role="img"`: `jsx_a11y/prefer-tag-over-role` (deny in `.oxlintrc.json`) maps that role to
 * `<img>`. The accessible text is the exact count plus a visually-hidden noun instead, which a
 * screen reader speaks the same way. The visible number is compact ("12.4K") so a real count fits
 * the gutter; the hidden one is exact.
 */
export default function ShowcaseVoteBox({ count }: { readonly count: number }) {
  return (
    <span className="flex h-11 w-10 shrink-0 flex-col items-center justify-center select-none">
      <Image
        src="/icons/keyboard_arrow_up_24dp_6F7979_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={20}
        height={20}
        className="size-5"
      />
      <span className="text-xs leading-none font-medium text-foreground tabular-nums">
        <span aria-hidden="true">{formatCompactCountLabel(count)}</span>
        <span className="sr-only">{formatCountLabel(count)} upvotes</span>
      </span>
    </span>
  );
}
