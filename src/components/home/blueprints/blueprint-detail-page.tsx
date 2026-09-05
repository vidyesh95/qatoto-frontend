// TRANSPORT: mock — async server component. Reads `getBlueprint` from `@/lib/blueprints/api`,
// which serves fixtures from `@/mocks/blueprints-mocks`.

import Image from "next/image";
import { notFound } from "next/navigation";

import { getBlueprint } from "@/lib/blueprints/api";
import {
  BLUEPRINT_CATEGORY_LABELS,
  BLUEPRINT_DIFFICULTY_LABELS,
  type Blueprint,
} from "@/lib/blueprints/schemas";
import { formatCentsRangeLabel } from "@/lib/store/format";

/**
 * One specification row.
 *
 * A ROW WITH NO VALUE DOES NOT RENDER. An absent CAD format or an uncosted bill of materials is
 * an absence, and printing "—" against a label invents a fact the publisher never stated. The
 * caller filters before mapping rather than this returning `null`, so the grid never contains a
 * gap it has to style around.
 */
function SpecificationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-black/5 py-2">
      <dt className="text-[11px] tracking-[0.5px] text-[#6F7979] uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function buildSpecifications(blueprint: Blueprint): { label: string; value: string }[] {
  const billOfMaterialsLabel =
    blueprint.billOfMaterialsCostRange === null
      ? null
      : formatCentsRangeLabel(
          blueprint.billOfMaterialsCostRange.minimumInCents,
          blueprint.billOfMaterialsCostRange.maximumInCents,
          blueprint.billOfMaterialsCostRange.currency,
        );

  return [
    { label: "Category", value: BLUEPRINT_CATEGORY_LABELS[blueprint.category] },
    { label: "Difficulty", value: BLUEPRINT_DIFFICULTY_LABELS[blueprint.difficulty] },
    ...(blueprint.cadFormat === null ? [] : [{ label: "CAD format", value: blueprint.cadFormat }]),
    ...(billOfMaterialsLabel === null
      ? []
      : [{ label: "Bill of materials", value: billOfMaterialsLabel }]),
  ];
}

export default async function BlueprintDetailPage({ slug }: { slug: string }) {
  const blueprint = await getBlueprint(slug);
  if (blueprint === null) notFound();

  const specifications = buildSpecifications(blueprint);

  return (
    <article className="pb-12">
      <div className="relative aspect-video w-full bg-muted lg:aspect-[21/9]">
        <Image
          src={blueprint.thumbnailUrl}
          alt={blueprint.title}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
      </div>

      <div className="px-4 pt-5 lg:px-6">
        <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">
          {BLUEPRINT_CATEGORY_LABELS[blueprint.category]}
        </p>
        <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">{blueprint.title}</h1>

        <div className="mt-3 flex items-center gap-2">
          <Image
            src={blueprint.author.avatarUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium text-foreground">{blueprint.author.displayName}</p>
            <p className="text-[11px] text-[#6F7979]">@{blueprint.author.handle}</p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground">{blueprint.summary}</p>

        <dl className="mt-6 max-w-md">
          {specifications.map((specification) => (
            <SpecificationRow
              key={specification.label}
              label={specification.label}
              value={specification.value}
            />
          ))}
        </dl>

        {blueprint.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-1.5">
            {blueprint.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-[#6F7979]"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-[11px] text-[#6F7979]">
          {blueprint.viewCount.toLocaleString("en-US")} views ·{" "}
          {blueprint.likeCount.toLocaleString("en-US")} likes
        </p>
      </div>
    </article>
  );
}
