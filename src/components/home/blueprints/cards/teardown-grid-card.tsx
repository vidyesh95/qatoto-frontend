// TRANSPORT: props-only — the teardown arrives from `teardowns-index-page` or from the hub's
// teardown lane, both of which read `@/lib/blueprints/api`. This component fetches nothing.

import Image from "next/image";
import Link from "next/link";

import TeardownProvenanceChipBadge from "@/components/home/blueprints/teardowns/sections/teardown-provenance-chip";
import {
  BLUEPRINT_DIFFICULTY_LABELS,
  resolveTeardownProvenanceChip,
  TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
  buildBlueprintHref,
  type TeardownBlueprint,
} from "@/lib/blueprints/schemas";
import { formatCentsRangeLabel, formatCountLabel } from "@/lib/store/format";

/** The play triangle. Inline rather than an asset — `public/icons` has no play glyph. */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3 fill-current">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

const MEDIA_BADGE_CLASS =
  "flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white";

/**
 * How many CAD/fabrication formats the card names before it counts the rest. Four is one line at
 * the narrowest column the grid produces; past that the line wraps under the thumbnail and the
 * card stops being scannable, which is the only thing this list is for.
 */
const NAMED_FILE_KIND_LIMIT = 4;

/**
 * One teardown in the index grid, and in the hub's teardown lane.
 *
 * ⚠️ IT WAS A VIDEO CARD AND IT IS NOW A DECISION SET. It used to render `BlueprintCardBody` —
 * thumbnail, category pill, title, author avatar, then difficulty — which is the YouTube card
 * shape, and a founder asking "can I make this, and what will it cost" cannot answer either
 * question from it. The card now leads with what the answer is made of: the bill-of-materials
 * band, how many parts, which fabrication formats were published, and how hard it is.
 *
 * `BlueprintCardBody` IS GONE AND ITS MARKUP LIVES HERE. That file existed so "the rail and the
 * grid cannot diverge", and the rail was deleted with the hub redesign — an indirection whose only
 * reason was a second caller that no longer exists.
 *
 * THE CATEGORY PILL WENT WITH IT. It stamped "Teardown" on every card, which earned its place when
 * one card design served three mixed rails. Both callers now show teardowns only, one under a
 * heading that says Teardowns and one on a page called Teardowns.
 *
 * THE AUTHOR BYLINE WENT TOO, and that is a ranking rather than a slight. Four facts about the
 * build and one about the builder do not fit in a grid cell at 12px, and on this surface the
 * question is what the thing costs to make. The byline is on the detail page, where a reader who
 * wants to know who did the work has already decided to care.
 *
 * ⚠️ EVERY FIGURE HERE IS NULLABLE AND EVERY ABSENCE RENDERS NOTHING. `formatCentsRangeLabel`
 * returns `null` for a build nobody costed, and `null` renders NO LINE rather than "$0" or a dash —
 * a zero would read as a free build, which is a different claim from "not costed". `partCount`
 * behaves the same. THE FLOOR IS A CARD WITH A TITLE AND A DIFFICULTY, which
 * `thermal-camera-module-teardown` actually is, and the title is doing the work there. Inventing a
 * number to fill the space is the one thing this surface refuses.
 */
export default function TeardownGridCard({ teardown }: { teardown: TeardownBlueprint }) {
  const documentCount = teardown.documents.length;
  const hasNoMedia =
    teardown.assembly === null && teardown.walkthroughVideo === null && documentCount === 0;

  const billOfMaterialsLabel =
    teardown.billOfMaterialsCostRange === null
      ? null
      : formatCentsRangeLabel(
          teardown.billOfMaterialsCostRange.minimumInCents,
          teardown.billOfMaterialsCostRange.maximumInCents,
          teardown.billOfMaterialsCostRange.currency,
        );

  // Difficulty is never null, so this line always renders and the part count joins it when counted.
  const scaleLabel = [
    teardown.partCount === null ? undefined : `${formatCountLabel(teardown.partCount)} parts`,
    BLUEPRINT_DIFFICULTY_LABELS[teardown.difficulty],
  ]
    .filter((part) => part !== undefined)
    .join(" · ");

  const fileKindLabels = buildFileKindLabels(teardown);

  return (
    // The focus outline is offset past the image's rounded corner so a keyboard reader sees the
    // whole card selected, not a ring drawn over the photograph. The link had none at all before.
    <Link
      href={buildBlueprintHref(teardown)}
      className="group/card block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00696E]"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        <Image
          src={teardown.thumbnailUrl}
          alt={teardown.title}
          fill
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-300 group-hover/card:scale-105"
        />

        {/* The badges answer "is there anything to look at", which is a different question from
            "what would it take to build". They stay on the image; the decision set is below it.
            All three render nothing when there is nothing — a "0 files" badge would be an answer
            to a question nobody asked. */}
        {hasNoMedia ? null : (
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {teardown.assembly === null ? null : <span className={MEDIA_BADGE_CLASS}>3D</span>}
            {teardown.walkthroughVideo === null ? null : (
              <span className={MEDIA_BADGE_CLASS}>
                <PlayGlyph />
                Video
              </span>
            )}
            {documentCount === 0 ? null : (
              <span className={MEDIA_BADGE_CLASS}>
                {documentCount} {documentCount === 1 ? "file" : "files"}
              </span>
            )}
          </div>
        )}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm leading-5 font-medium text-foreground">
        {teardown.title}
      </h3>

      {/*
        THE PROVENANCE CHIP IS THE ONE THING ADDED BACK AFTER THE CATEGORY PILL WAS REMOVED, and the
        difference is what it answers. The pill said "Teardown" on a page called Teardowns; this says
        whether the reader may manufacture what they are about to open, which changes whether the
        card is worth opening at all. NO NOTE HERE — a card is a label a reader acts on later, and
        the sentence belongs on the detail page above the files it qualifies.

        A flagged teardown carries the reported chip here too. The index excludes quarantined rows
        entirely (`src/lib/blueprints/api.ts`), so that state never reaches this card.
      */}
      <div className="mt-1.5">
        <TeardownProvenanceChipBadge chip={resolveTeardownProvenanceChip(teardown)} />
      </div>

      {/* THE LABEL IS NOT DECORATION. A bare "$45 - $60" on a card reads as the price of the
          teardown rather than the cost of the parts, which is the kind of ambiguity PRODUCT.md
          calls a wrong part in a crate. One size throughout, hierarchy from weight and colour. */}
      {billOfMaterialsLabel === null ? null : (
        <p className="mt-1.5 text-sm leading-5 text-[#6F7979]">
          BOM{" "}
          <span className="font-medium text-foreground tabular-nums">{billOfMaterialsLabel}</span>
        </p>
      )}

      <p className="mt-1 text-xs leading-4 text-[#6F7979]">{scaleLabel}</p>

      {fileKindLabels === null ? null : (
        <p className="mt-0.5 text-xs leading-4 text-[#6F7979]">{fileKindLabels}</p>
      )}
    </Link>
  );
}

/**
 * Which fabrication formats this teardown published, as one line, or `null` for none.
 *
 * DEDUPED AND IN ENUM ORDER, NEVER IN PUBLISH ORDER. Six files can be three formats, and a card
 * that said "STEP · STEP · DXF" would be counting files while appearing to list formats. Iterating
 * `TEARDOWN_MANUFACTURING_FILE_KINDS` rather than the files themselves gives both properties at
 * once and makes the order stable across teardowns, so a reader scanning a column of cards is
 * comparing the same positions.
 *
 * THE SHORT LABELS, NOT THE LONG ONES. `TEARDOWN_MANUFACTURING_FILE_KIND_LABELS` heads a download
 * bundle on the detail page and is right there; on a card, "Bill of materials (CSV)" wrapped the
 * line and made this row of the grid taller than its neighbours. Measured before the split.
 *
 * ⚠️ IT DOES NOT COUNT `documents[]`. Those are published PDFs and they have their own badge on the
 * thumbnail; a schematic PDF is something to read and a STEP file is something to send a factory.
 * `schemas.ts` keeps the two lists separate for that reason and this line must not merge them.
 */
function buildFileKindLabels(teardown: TeardownBlueprint): string | null {
  const publishedKinds = new Set(teardown.manufacturingFiles.map((file) => file.kind));
  if (publishedKinds.size === 0) return null;

  const orderedLabels = TEARDOWN_MANUFACTURING_FILE_KINDS.filter((kind) =>
    publishedKinds.has(kind),
  ).map((kind) => TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS[kind]);

  const namedLabels = orderedLabels.slice(0, NAMED_FILE_KIND_LIMIT);
  const remainingCount = orderedLabels.length - namedLabels.length;

  return remainingCount === 0
    ? namedLabels.join(" · ")
    : `${namedLabels.join(" · ")} +${remainingCount}`;
}
