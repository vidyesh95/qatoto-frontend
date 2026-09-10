// TRANSPORT: props-only — the chip is derived from a row the page already holds.

import {
  TEARDOWN_PROVENANCE_CHIP_LABELS,
  TEARDOWN_PROVENANCE_CHIP_NOTES,
  type TeardownProvenanceChip,
} from "@/lib/blueprints/schemas";

/**
 * The provenance chip: what a reader is allowed to assume about making this thing.
 *
 * ⚠️ THE TEXT LABEL IS CANONICAL AND THE COLOUR IS SECONDARY, and on this component that is a rule
 * rather than a preference. `docs/Design.md` §6 forbids signalling anything with colour alone, and
 * this is the most consequential signal on the surface — a founder reads it and decides whether
 * they may manufacture something. So every chip carries a WORD and a GLYPH, and the three glyphs
 * differ in silhouette rather than only in hue.
 *
 * ⚠️ IT IS NOT A TRAFFIC LIGHT AND MUST NOT BECOME ONE. A green / amber / red badge was specified
 * and is implemented here in palette instead: green and amber are two new hues, and the One Hue
 * Rule (`docs/Design.md` §2) allows one family between 196 and 201 degrees plus one blue for a
 * single nav item and one red for destruction. The two ordinary states therefore differ by FILL
 * (imprint on wash versus quiet on hairline) rather than by hue, and only the reported state
 * reaches for `Destructive` — which is the one place on this surface where a red is what red
 * already means everywhere else in the product.
 *
 * A `<span>`, NEVER A BUTTON. It reports state and writes nothing, which is the Inert Span Rule.
 * The pill shape it wears is doing the second job that rule allows — "something you press OR
 * something that reports state" — and the `Report an IP concern` link beside it is the control.
 */
function AuthorizedGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0 fill-current">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 10.5 4.6-1.1 8-5.5 8-10.5V5l-8-3Zm-1.2 13.2-3-3 1.4-1.4 1.6 1.6 4.2-4.2 1.4 1.4-5.6 5.6Z" />
    </svg>
  );
}

/** A caliper: the tool the survey was made with, and a silhouette nothing else here uses. */
function SurveyGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0 fill-current">
      <path d="M3 3h4v2H5v14h2v2H3V3Zm14 0h4v18h-4v-2h2V5h-2V3ZM8 10h8v2H8v-2Zm0 4h8v2H8v-2Z" />
    </svg>
  );
}

function ReportedGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0 fill-current">
      <path d="M12 2 1 21h22L12 2Zm1 14h-2v2h2v-2Zm0-7h-2v5h2V9Z" />
    </svg>
  );
}

/**
 * Chip chrome per state. `Record` over the chip union, so a fourth state is a compile error here
 * rather than an unstyled pill somewhere on the surface.
 *
 * `border-transparent` on the authorized arm is deliberate: `docs/Design.md` §5 gives a SELECTED
 * chip a filled ground and a transparent border, and "the publisher named a licence" is the one
 * state here that is an affirmative claim rather than a description.
 */
const PROVENANCE_CHIP_CLASSES: Record<TeardownProvenanceChip, string> = {
  authorized_or_open_source: "border-transparent bg-[#00696E] text-white",
  community_reverse_engineered: "border-border bg-card text-foreground",
  ip_concern_reported: "border-destructive/40 bg-destructive/10 text-destructive",
};

const PROVENANCE_CHIP_GLYPHS: Record<TeardownProvenanceChip, () => React.ReactElement> = {
  authorized_or_open_source: AuthorizedGlyph,
  community_reverse_engineered: SurveyGlyph,
  ip_concern_reported: ReportedGlyph,
};

export default function TeardownProvenanceChipBadge({
  chip,
  /**
   * Whether the chip's own sentence renders beneath it.
   *
   * ON THE DETAIL PAGE IT DOES. A chip on an index card is a label a reader can act on later; a
   * chip above a download bundle is a condition on the download, and the condition has to be
   * readable without a hover — `title` alone is invisible on a touch device, which is where a
   * founder in this market is reading.
   */
  shouldShowNote = false,
}: {
  readonly chip: TeardownProvenanceChip;
  readonly shouldShowNote?: boolean;
}) {
  const Glyph = PROVENANCE_CHIP_GLYPHS[chip];

  return (
    <span className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${PROVENANCE_CHIP_CLASSES[chip]}`}
      >
        <Glyph />
        {TEARDOWN_PROVENANCE_CHIP_LABELS[chip]}
      </span>
      {shouldShowNote ? (
        <span className="max-w-prose text-xs text-muted-foreground">
          {TEARDOWN_PROVENANCE_CHIP_NOTES[chip]}
        </span>
      ) : null}
    </span>
  );
}
