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
import AssemblyStepList from "@/components/home/blueprints/teardowns/sections/assembly-step-list";
import FastenerBillOfMaterials from "@/components/home/blueprints/teardowns/sections/fastener-bill-of-materials";
import ManufacturingFileBundles from "@/components/home/blueprints/teardowns/sections/manufacturing-file-bundles";
import RepairabilityIndexPanel from "@/components/home/blueprints/teardowns/sections/repairability-index-panel";
import TeardownExplorer from "@/components/home/blueprints/teardowns/teardown-explorer";
import { getBlueprintByCategory } from "@/lib/blueprints/api";
import { BLUEPRINT_DIFFICULTY_LABELS, type TeardownBlueprint } from "@/lib/blueprints/schemas";
import { formatCentsRangeLabel, formatCountLabel } from "@/lib/store/format";

/**
 * The spec table.
 *
 * ABSENT VALUES ARE OMITTED, NOT DASHED — see `SpecificationList`. `cadFormat: null` means no CAD
 * source was published and `partCount: null` means nobody counted; neither is a zero, and printing
 * one would invent a fact the publisher never stated.
 *
 * "Parts modelled" is a COUNT OF THE PAYLOAD, not a claim the author made — the same class of
 * number as the index card's "{n} files" — which is why it may appear when `partCount` is null:
 * one is a tally the author typed, the other is how many meshes the model moves. It sits after
 * "Parts" so the two read as the subset they are ("Parts 148 / Parts modelled 9").
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
    ...(teardown.assembly === null
      ? []
      : [{ label: "Parts modelled", value: formatCountLabel(teardown.assembly.parts.length) }]),
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

        {/*
          THE SPEC LIST HAS TWO HOMES, and the same component serves both. With a model it is the
          Specifications tab of the viewer; without one there are no tabs to put it in, so it
          renders here as an ordinary section. Passing it in as a SLOT keeps it a server component
          either way rather than dragging it into the viewer's client island.
        */}
        {teardown.assembly === null ? (
          <>
            <SpecificationList specifications={buildSpecifications(teardown)} />
            <RepairabilityIndexPanel repairabilityIndex={teardown.repairabilityIndex} />
            <FastenerBillOfMaterials fasteners={teardown.fasteners} />
          </>
        ) : (
          <TeardownExplorer
            assembly={teardown.assembly}
            simulationTelemetry={teardown.simulationTelemetry}
            assemblySteps={teardown.assemblySteps}
            title={teardown.title}
            specificationsSlot={
              <div className="space-y-2">
                <SpecificationList
                  specifications={buildSpecifications(teardown)}
                  className="max-w-md"
                />
                <RepairabilityIndexPanel repairabilityIndex={teardown.repairabilityIndex} />
                <FastenerBillOfMaterials fasteners={teardown.fasteners} />
              </div>
            }
          />
        )}

        {/* Steps stand alone only when there is no viewer to hold them. */}
        {teardown.assembly === null ? (
          <AssemblyStepList steps={teardown.assemblySteps} store={null} />
        ) : null}

        {teardown.walkthroughVideo === null ? null : (
          <BlueprintVideoBlock video={teardown.walkthroughVideo} title="Walkthrough" />
        )}

        <BlueprintDocumentList documents={teardown.documents} />

        {/* The take-it-away payload sits last, after everything that explains what it is. */}
        <ManufacturingFileBundles manufacturingFiles={teardown.manufacturingFiles} />

        <BlueprintTagList tags={teardown.tags} />

        <p className="mt-6 text-[11px] text-[#6F7979]">
          {formatCountLabel(teardown.viewCount)} views · {formatCountLabel(teardown.likeCount)}{" "}
          likes
        </p>
      </div>
    </article>
  );
}
