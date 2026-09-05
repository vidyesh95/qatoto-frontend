// TRANSPORT: props-only — the blueprint arrives from whichever rail, grid or feed rendered it.
// This component fetches nothing.

import Image from "next/image";

import {
  BLUEPRINT_CATEGORY_LABELS,
  BLUEPRINT_DIFFICULTY_LABELS,
  type BlueprintCardFields,
} from "@/lib/blueprints/schemas";
import { formatCentsRangeLabel } from "@/lib/store/format";

/**
 * The inside of a blueprint card — everything except the link wrapper and its width.
 *
 * EXTRACTED SO THE RAIL AND THE GRID CANNOT DIVERGE. The rail card is a fixed
 * `w-56/64/72 shrink-0 snap-start`; the grid card fills its column. That is the ONLY difference
 * between them, and before this split the obvious way to build the second was to copy the first —
 * after which a change to the byline lands in one of them.
 *
 * THE BOM BAND IS RENDERED ONLY WHEN THERE IS ONE. `formatCentsRangeLabel` returns `null` for a
 * blueprint nobody costed, and that `null` renders NOTHING rather than "$0.00" or a dash. A zero
 * here would read as a free build, which is a different claim from "not costed".
 */
export default function BlueprintCardBody({
  blueprint,
  imageSizes,
  badge,
}: {
  readonly blueprint: BlueprintCardFields;
  /** The `sizes` hint for this card's slot — a rail card and a grid cell are different widths. */
  readonly imageSizes: string;
  /** Rendered in the thumbnail's bottom-right — the grid card's media affordances go here. */
  readonly badge?: React.ReactNode;
}) {
  const billOfMaterialsLabel =
    blueprint.billOfMaterialsCostRange === null
      ? null
      : formatCentsRangeLabel(
          blueprint.billOfMaterialsCostRange.minimumInCents,
          blueprint.billOfMaterialsCostRange.maximumInCents,
          blueprint.billOfMaterialsCostRange.currency,
        );

  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded bg-muted">
        <Image
          src={blueprint.thumbnailUrl}
          alt={blueprint.title}
          fill
          sizes={imageSizes}
          className="object-cover transition-transform duration-300 group-hover/card:scale-105"
        />
        <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tracking-[0.5px] text-white">
          {BLUEPRINT_CATEGORY_LABELS[blueprint.category]}
        </span>
        {badge === undefined ? null : (
          <div className="absolute right-2 bottom-2 flex items-center gap-1">{badge}</div>
        )}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm leading-5 font-medium text-foreground">
        {blueprint.title}
      </h3>

      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#6F7979]">
        <Image
          src={blueprint.author.avatarUrl}
          alt=""
          width={16}
          height={16}
          className="size-4 rounded-full object-cover"
        />
        {blueprint.author.displayName}
      </p>

      <p className="mt-1 text-[11px] tracking-[0.3px] text-[#6F7979]">
        {BLUEPRINT_DIFFICULTY_LABELS[blueprint.difficulty]}
        {billOfMaterialsLabel === null ? null : <> · BOM {billOfMaterialsLabel}</>}
      </p>
    </>
  );
}
