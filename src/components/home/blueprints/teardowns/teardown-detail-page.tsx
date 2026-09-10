// TRANSPORT: mock — async server component. Reads `getBlueprintByCategory` and
// `getTeardownMarketSignal` from `@/lib/blueprints/api`, which serve fixtures from
// `@/mocks/blueprints-mocks`.

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
import TeardownDecisionRow, {
  type TeardownDecisionFact,
} from "@/components/home/blueprints/teardowns/sections/teardown-decision-row";
import TeardownEngagementBar from "@/components/home/blueprints/teardowns/sections/teardown-engagement-bar";
import TeardownFactoryHandoff from "@/components/home/blueprints/teardowns/sections/teardown-factory-handoff";
import TeardownMarketSignalBand from "@/components/home/blueprints/teardowns/sections/teardown-market-signal";
import TeardownMaterialComposition from "@/components/home/blueprints/teardowns/sections/teardown-material-composition";
import TeardownModerationNotice, {
  canRenderTeardownPayload,
} from "@/components/home/blueprints/teardowns/sections/teardown-moderation-notice";
import TeardownProvenanceBlock from "@/components/home/blueprints/teardowns/sections/teardown-provenance-block";
import TeardownProvenanceChipBadge from "@/components/home/blueprints/teardowns/sections/teardown-provenance-chip";
import TeardownSummary from "@/components/home/blueprints/teardowns/sections/teardown-summary";
import TelemetryReadouts from "@/components/home/blueprints/teardowns/sections/telemetry-readouts";
import TeardownViewSwitch from "@/components/home/blueprints/teardowns/sections/teardown-view-switch";
import TeardownExplorer from "@/components/home/blueprints/teardowns/teardown-explorer";
import RelativeTime from "@/components/home/shared/relative-time";
import { getBlueprintByCategory, getTeardownMarketSignal } from "@/lib/blueprints/api";
import {
  BLUEPRINT_DIFFICULTY_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
  resolveTeardownProvenanceChip,
  type TeardownBlueprint,
} from "@/lib/blueprints/schemas";
import {
  DEFAULT_TEARDOWN_VIEW,
  TEARDOWN_VIEW_INITIAL_VIEWER_TAB,
  TEARDOWN_VIEW_OPENS_DETAIL_TABLES,
  TEARDOWN_VIEW_QUERY_KEY,
  TEARDOWN_VIEWS,
  type TeardownView,
} from "@/lib/blueprints/teardown-views";
import { readEnumParam, type RawSearchParams } from "@/lib/filter-href";
import { formatCentsRangeLabel, formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

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

/**
 * The decision row: what a founder came for, before any prose.
 *
 * ⚠️ IT OVERLAPS `buildSpecifications` ON PURPOSE AND THAT IS NOT DUPLICATION. The spec list is the
 * complete record, read by somebody already reading; this is the four facts that decide whether
 * they read at all, and it sits above the fold where the spec list cannot. The overlap is two
 * facts, both of them the ones a reader would otherwise scroll to find twice.
 *
 * ⚠️ THE FORMATS ARE DEDUPED AND EMITTED IN ENUM ORDER, never publish order — the same call the
 * index card makes. Six files can be three formats, and "STEP · STEP · DXF" would be counting files
 * while appearing to list formats.
 *
 * A QUARANTINED ROW GETS NO BILL OF MATERIALS AND NO FORMAT LIST. Those are the payload, and the
 * payload is withheld — printing the cost band beside a withheld file list would be telling a
 * reader what they may not have.
 */
function buildDecisionFacts(teardown: TeardownBlueprint): TeardownDecisionFact[] {
  const isPayloadVisible = canRenderTeardownPayload(teardown.moderationState);

  const billOfMaterialsLabel =
    teardown.billOfMaterialsCostRange === null || !isPayloadVisible
      ? null
      : formatCentsRangeLabel(
          teardown.billOfMaterialsCostRange.minimumInCents,
          teardown.billOfMaterialsCostRange.maximumInCents,
          teardown.billOfMaterialsCostRange.currency,
        );

  const publishedFileKinds = isPayloadVisible
    ? TEARDOWN_MANUFACTURING_FILE_KINDS.filter((kind) =>
        teardown.manufacturingFiles.some((file) => file.kind === kind),
      )
    : [];

  return [
    { label: "Parts cost", value: billOfMaterialsLabel },
    {
      label: "Parts",
      value: teardown.partCount === null ? null : formatCountLabel(teardown.partCount),
    },
    {
      label: "Fabrication files",
      value:
        publishedFileKinds.length === 0
          ? null
          : publishedFileKinds
              .map((kind) => TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS[kind])
              .join(" · "),
    },
    // Difficulty is never null, so the row always has at least this one cell and never disappears.
    { label: "Difficulty", value: BLUEPRINT_DIFFICULTY_LABELS[teardown.difficulty] },
  ];
}

export default async function TeardownDetailPage({
  slug,
  searchParams,
}: {
  readonly slug: string;
  readonly searchParams: Promise<RawSearchParams>;
}) {
  const teardown = await getBlueprintByCategory("teardown", slug);
  if (teardown === null) notFound();

  const rawSearchParams = await searchParams;
  // A hand-edited `?view=banana` is DROPPED to the default rather than erroring, which is this
  // repo's documented behaviour for an unrecognized param on a server page (`readEnumParam`).
  const activeView: TeardownView =
    readEnumParam(rawSearchParams, TEARDOWN_VIEW_QUERY_KEY, TEARDOWN_VIEWS) ??
    DEFAULT_TEARDOWN_VIEW;

  const provenanceChip = resolveTeardownProvenanceChip(teardown);
  const isPayloadVisible = canRenderTeardownPayload(teardown.moderationState);
  const shouldOpenDetailTables = TEARDOWN_VIEW_OPENS_DETAIL_TABLES[activeView];

  /**
   * ⚠️ THE MARKET SIGNAL IS READ EVEN WHEN THE PAYLOAD IS WITHHELD, and that is deliberate. A
   * quarantine is a claim about the publisher's FILES; it says nothing about whether a market for
   * the product exists, and suppressing the band would let a moderation action quietly delete an
   * unrelated fact. `null` means there was nothing real to show, and `null` renders no section.
   */
  const marketSignal = await getTeardownMarketSignal(teardown);

  /**
   * THE COMPOSITION SECTION, ASSEMBLED ONCE because the three views place it differently. Business
   * reads it after the market signal, engineering and factory read it before the explorer — a
   * manufacturer's first question about a part is what it is made of, and scrolling past a 3D
   * viewer to reach that is the page failing the persona it was switched into.
   */
  const compositionSection = isPayloadVisible ? (
    <TeardownMaterialComposition
      materials={teardown.materials}
      isOpenByDefault={shouldOpenDetailTables}
    />
  ) : null;

  const explorerSection =
    teardown.assembly === null || !isPayloadVisible ? (
      // NO MODEL, NO TABS TO PUT THE SPEC LIST IN, so it renders as an ordinary section — and the
      // same three components serve both paths so the two cannot say different things.
      <>
        <SpecificationList specifications={buildSpecifications(teardown)} />
        <RepairabilityIndexPanel repairabilityIndex={teardown.repairabilityIndex} />
        {isPayloadVisible ? <FastenerBillOfMaterials fasteners={teardown.fasteners} /> : null}
      </>
    ) : (
      <TeardownExplorer
        initialTab={TEARDOWN_VIEW_INITIAL_VIEWER_TAB[activeView]}
        assembly={teardown.assembly}
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
    );

  const marketSignalSection =
    marketSignal === null ? null : (
      <TeardownMarketSignalBand
        marketSignal={marketSignal}
        productClassLabel={teardown.storeProductClass?.label ?? null}
      />
    );

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

      {/*
        NO SEEK PROVIDER HERE ANY MORE. A step's timestamp used to seek the walkthrough, which
        needed a channel wrapped around both this page's step list and its video block. Blueprint
        video is YouTube-only now, so there is nothing to seek and no channel to mount.
      */}
      <div className="px-4 pt-5 lg:px-6">
        <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">
          Teardown
        </p>

        {/*
          THE CHIP SITS WITH THE TITLE, not in a footer and not beside the files. It answers "may I
          make this" and that question is asked at the top of the page, before a reader has spent
          the attention that makes them want the answer to be yes.
        */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-xl font-medium text-foreground lg:text-2xl">{teardown.title}</h1>
          <TeardownProvenanceChipBadge chip={provenanceChip} />
        </div>

        <BlueprintAuthorLine author={teardown.author} />

        <TeardownModerationNotice moderationState={teardown.moderationState} />

        <TeardownViewSwitch searchParams={rawSearchParams} activeView={activeView} />

        <TeardownDecisionRow facts={buildDecisionFacts(teardown)} />

        <TeardownSummary summary={teardown.summary} />

        {/*
          THE BAR SITS HERE, ABOVE THE SPEC BRANCH, so both paths below get it identically — and
          because anything placed after the explorer reads as belonging to the viewer's tab stack
          rather than to the teardown.
        */}
        <TeardownEngagementBar teardown={teardown} />

        {/*
          ⚠️ PROVENANCE RENDERS ABOVE THE BILL OF MATERIALS AND ABOVE EVERY FILE, in all three
          views. The files are what a reader takes away; a provenance claim placed after them is a
          disclaimer, and a disclaimer is what a reader has already scrolled past.
        */}
        <TeardownProvenanceBlock
          provenance={teardown.provenance}
          chip={provenanceChip}
          teardownSlug={teardown.slug}
        />

        {/*
          ⚠️ THE ORDER BELOW IS THE DENSITY SWITCH, AND IT IS THE ONLY THING THE SWITCH DOES BESIDES
          OPENING DISCLOSURES. Business leads with the market answer and meets the model before the
          chemistry; engineering and factory meet the chemistry first, because "what is it made of"
          is the question they open the page with. Nothing is hidden in either order.
        */}
        {activeView === "business" ? (
          <>
            {marketSignalSection}
            {explorerSection}
            {compositionSection}
          </>
        ) : (
          <>
            {compositionSection}
            {explorerSection}
            {marketSignalSection}
          </>
        )}

        {/*
          MOUNTED HERE RATHER THAN INSIDE THE EXPLORER, which is where it used to live. The contract
          allows telemetry with no model — a bench test on a product nobody modelled — and inside the
          viewer that entirely legal payload rendered nothing at all.
        */}
        {isPayloadVisible ? <TelemetryReadouts telemetry={teardown.simulationTelemetry} /> : null}

        {/* Steps stand alone only when there is no viewer to hold them. */}
        {isPayloadVisible && teardown.assembly === null ? (
          <AssemblyStepList steps={teardown.assemblySteps} store={null} />
        ) : null}

        {isPayloadVisible && teardown.walkthroughVideo !== null ? (
          <BlueprintVideoBlock video={teardown.walkthroughVideo} title="Walkthrough" />
        ) : null}

        {isPayloadVisible ? <BlueprintDocumentList documents={teardown.documents} /> : null}

        {/* The take-it-away payload sits last, after everything that explains what it is. */}
        {isPayloadVisible ? (
          <ManufacturingFileBundles manufacturingFiles={teardown.manufacturingFiles} />
        ) : null}

        {/* And the handoff sits after the payload, because "who makes this" is the question a reader
            has once they have seen what there is to send. */}
        <TeardownFactoryHandoff />

        <BlueprintTagList tags={teardown.tags} />

        {/*
          `createdAt` reached no renderer before this — it sorted the index and then vanished, so a
          teardown page carried no date at all while a showcase printed its launch date. Same pairing
          showcase uses: a relative label with the absolute instant on `title`, because "3 weeks ago"
          is the readable form and the exact date is the checkable one.

          LIKES USED TO PRINT HERE TOO and now do not — `TeardownEngagementBar` carries them. Views
          stay, because the bar has no view readout and both sibling arms print the same line.
        */}
        <p className="mt-6 text-[11px] text-[#6F7979]">
          Published{" "}
          <span title={formatIsoInstantLabel(teardown.createdAt)}>
            <RelativeTime isoInstant={teardown.createdAt} />
          </span>{" "}
          · {formatCountLabel(teardown.viewCount)} views
        </p>
      </div>
    </article>
  );
}
