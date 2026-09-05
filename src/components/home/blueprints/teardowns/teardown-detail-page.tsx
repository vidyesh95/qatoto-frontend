// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` from
// `@/lib/blueprints/api`, which serves fixtures from `@/mocks/blueprints-mocks`.

import Image from "next/image";
import { notFound } from "next/navigation";

import BlueprintDocumentList from "@/components/home/blueprints/media/blueprint-document-list";
import BlueprintVideoBlock from "@/components/home/blueprints/media/blueprint-video-block";
import BlueprintAuthorLine from "@/components/home/blueprints/sections/blueprint-author-line";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import SpecificationList, {
  type SpecificationRow,
} from "@/components/home/blueprints/sections/specification-list";
import { getBlueprintByCategory } from "@/lib/blueprints/api";
import { BLUEPRINT_DIFFICULTY_LABELS, type TeardownBlueprint } from "@/lib/blueprints/schemas";
import { formatCentsRangeLabel, formatCountLabel } from "@/lib/store/format";

/**
 * The spec table.
 *
 * ABSENT VALUES ARE OMITTED, NOT DASHED — see `SpecificationList`. `cadFormat: null` means no CAD
 * source was published and `partCount: null` means nobody counted; neither is a zero, and printing
 * one would invent a fact the publisher never stated.
 */
function buildSpecifications(teardown: TeardownBlueprint): SpecificationRow[] {
  const billOfMaterialsLabel =
    teardown.billOfMaterialsCostRange === null
      ? null
      : formatCentsRangeLabel(
          teardown.billOfMaterialsCostRange.minimumInCents,
          teardown.billOfMaterialsCostRange.maximumInCents,
          teardown.billOfMaterialsCostRange.currency,
        );

  return [
    { label: "Difficulty", value: BLUEPRINT_DIFFICULTY_LABELS[teardown.difficulty] },
    ...(teardown.cadFormat === null ? [] : [{ label: "CAD format", value: teardown.cadFormat }]),
    ...(billOfMaterialsLabel === null
      ? []
      : [{ label: "Bill of materials", value: billOfMaterialsLabel }]),
    ...(teardown.partCount === null
      ? []
      : [{ label: "Parts", value: formatCountLabel(teardown.partCount) }]),
  ];
}

export default async function TeardownDetailPage({ slug }: { slug: string }) {
  const teardown = await getBlueprintByCategory("teardown", slug);
  if (teardown === null) notFound();

  return (
    <article className="pb-12">
      <div className="relative aspect-video w-full bg-muted lg:aspect-[21/9]">
        <Image
          src={teardown.thumbnailUrl}
          alt={teardown.title}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
      </div>

      <div className="px-4 pt-5 lg:px-6">
        <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">
          Teardown
        </p>
        <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">{teardown.title}</h1>

        <BlueprintAuthorLine author={teardown.author} />

        <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground">{teardown.summary}</p>

        <SpecificationList specifications={buildSpecifications(teardown)} />

        {teardown.walkthroughVideo === null ? null : (
          <BlueprintVideoBlock video={teardown.walkthroughVideo} title="Walkthrough" />
        )}

        <BlueprintDocumentList documents={teardown.documents} />

        <BlueprintTagList tags={teardown.tags} />

        <p className="mt-6 text-[11px] text-[#6F7979]">
          {formatCountLabel(teardown.viewCount)} views · {formatCountLabel(teardown.likeCount)}{" "}
          likes
        </p>
      </div>
    </article>
  );
}
