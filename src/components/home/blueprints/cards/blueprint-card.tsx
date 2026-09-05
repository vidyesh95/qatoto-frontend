// TRANSPORT: props-only — the blueprint arrives from whichever rail or grid rendered it.
// This component fetches nothing.

import Image from "next/image";
import Link from "next/link";

import {
  BLUEPRINT_CATEGORY_LABELS,
  BLUEPRINT_DIFFICULTY_LABELS,
  type Blueprint,
} from "@/lib/blueprints/schemas";
import { formatCentsRangeLabel } from "@/lib/store/format";

/**
 * One blueprint in a rail.
 *
 * THE BOM BAND IS RENDERED ONLY WHEN THERE IS ONE. `formatCentsRangeLabel` returns `null` for a
 * blueprint nobody costed, and that `null` renders NOTHING rather than "$0.00" or a dash. A zero
 * here would read as a free build, which is a different claim from "not costed".
 */
export default function BlueprintCard({ blueprint }: { blueprint: Blueprint }) {
  const billOfMaterialsLabel =
    blueprint.billOfMaterialsCostRange === null
      ? null
      : formatCentsRangeLabel(
          blueprint.billOfMaterialsCostRange.minimumInCents,
          blueprint.billOfMaterialsCostRange.maximumInCents,
          blueprint.billOfMaterialsCostRange.currency,
        );

  return (
    <Link
      href={`/blueprints/${blueprint.slug}`}
      className="group/card block w-56 shrink-0 snap-start sm:w-64 lg:w-72"
    >
      <div className="relative aspect-video overflow-hidden rounded bg-muted">
        <Image
          src={blueprint.thumbnailUrl}
          alt={blueprint.title}
          fill
          sizes="288px"
          className="object-cover transition-transform duration-300 group-hover/card:scale-105"
        />
        <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tracking-[0.5px] text-white">
          {BLUEPRINT_CATEGORY_LABELS[blueprint.category]}
        </span>
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
    </Link>
  );
}
