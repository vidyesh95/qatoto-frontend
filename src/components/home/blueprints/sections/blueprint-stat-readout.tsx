// TRANSPORT: props-only
//
// One engagement count on a blueprint — an icon over a number, sized to sit in a row beside the
// share button.
//
// A `<span>`, NEVER A BUTTON, for the reason `ShowcaseVoteBox` states at length: there is no like,
// comment or save route for a blueprint, and a control that moved one of these numbers would be
// moving it in the browser only — a business rule enforced on the layer the user controls, which
// CLAUDE.md §1.1 forbids. It WEARS the same pill look as `StatPill` (rounded-full, `#CCE8E9`
// background) so the row reads as one visual family with the real Share button beside it — but no
// `cursor-pointer`, no `hover:`, no `onClick`: the chrome is copied, the interactivity is not. When
// real routes exist this becomes an actual button and this comment goes away; until then it only
// displays.
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
    <span className="flex w-full flex-row items-center justify-center gap-2 rounded-full bg-[#CCE8E9] px-2.5 py-1.5 text-sm font-medium text-[#041F21] select-none lg:w-24">
      <Image
        src={`/icons/${icon}_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg`}
        alt=""
        width={18}
        height={18}
        className="size-[18px] shrink-0"
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
