// TRANSPORT: props-only
//
// One engagement count on a blueprint — an icon over a number, sized to sit in a row beside the
// share button.
//
// A `<span>`, NEVER A BUTTON, for the reason `ShowcaseVoteBox` states at length: there is no like,
// comment or save route for a blueprint, and a control that moved one of these numbers would be
// moving it in the browser only — a business rule enforced on the layer the user controls, which
// CLAUDE.md §1.1 forbids. It is BARE — no border, no background, no hover, no `cursor-pointer` —
// because a bordered pill reads as a button, and this one does nothing. When real routes exist this
// becomes a button and this comment goes away; until then it displays.
//
// NO `role="img"`: `jsx_a11y/prefer-tag-over-role` (deny in `.oxlintrc.json`) maps that role to
// `<img>`. And NO `aria-label` on the span either — on a role-less generic it is ignored by
// assistive tech, so the name would vanish with nothing to warn you. The accessible text is a
// visually-hidden exact count plus its noun, which a screen reader speaks as "7,822 likes". The
// visible number is compact ("7.8K") so a real count fits the row; the hidden one is exact.

import Image from "next/image";

import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel } from "@/lib/store/format";

export default function BlueprintStatReadout({
  icon,
  count,
  noun,
}: {
  /** Icon base name, e.g. "favorite" — always the FILL0 (unfilled) variant, since nothing is set. */
  readonly icon: string;
  readonly count: number;
  /** Plural noun spoken after the exact count, e.g. "likes". */
  readonly noun: string;
}) {
  return (
    <span className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-[#6F7979] select-none">
      {/* Only the black variants of these four are checked in; the muted weight comes from
          `opacity` rather than a second colourway nobody else would use. */}
      <Image
        src={`/icons/${icon}_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg`}
        alt=""
        width={18}
        height={18}
        className="size-[18px] shrink-0 opacity-55"
      />
      <span className="tabular-nums">
        <span aria-hidden="true">{formatCompactCountLabel(count)}</span>
        <span className="sr-only">
          {formatCountLabel(count)} {noun}
        </span>
      </span>
    </span>
  );
}
