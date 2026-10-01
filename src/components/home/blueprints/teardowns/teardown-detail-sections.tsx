import Link from "next/link";
import BlueprintAuthorLine from "@/components/home/blueprints/sections/blueprint-author-line";
import BlueprintDiscussion from "@/components/home/blueprints/sections/blueprint-discussion";
import BlueprintDocumentList from "@/components/home/blueprints/media/blueprint-document-list";
import BlueprintTagList from "@/components/home/blueprints/sections/blueprint-tag-list";
import BlueprintVideoBlock from "@/components/home/blueprints/media/blueprint-video-block";
import BlueprintViewBeacon from "@/components/home/blueprints/sections/blueprint-view-beacon";
import ReportBlueprintOpener from "@/components/home/blueprints/sections/report-blueprint-opener";
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
import TeardownFactoryHandoff from "@/components/home/blueprints/teardowns/sections/teardown-factory-handoff";
import TeardownMarketSignalBand from "@/components/home/blueprints/teardowns/sections/teardown-market-signal";
import TeardownMaterialComposition from "@/components/home/blueprints/teardowns/sections/teardown-material-composition";
import TeardownModerationNotice from "@/components/home/blueprints/teardowns/sections/teardown-moderation-notice";
import TeardownPartsList from "@/components/home/blueprints/teardowns/sections/teardown-parts-list";
import TeardownProvenanceChipBadge from "@/components/home/blueprints/teardowns/sections/teardown-provenance-chip";
import TeardownSubjectStrip from "@/components/home/blueprints/teardowns/sections/teardown-subject-strip";
import TeardownSummary from "@/components/home/blueprints/teardowns/sections/teardown-summary";
import TeardownViewSwitch from "@/components/home/blueprints/teardowns/sections/teardown-view-switch";
import TeardownExplorer from "@/components/home/blueprints/teardowns/teardown-explorer";
import TelemetryReadouts from "@/components/home/blueprints/teardowns/sections/telemetry-readouts";
import RelativeTime from "@/components/home/shared/relative-time";
import {
  BLUEPRINT_DIFFICULTY_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
  canRenderTeardownPayload,
  type TeardownBlueprint,
  type TeardownMarketSignal,
  type TeardownProvenanceChip,
} from "@/lib/blueprints/schemas";
import {
  TEARDOWN_VIEW_INITIAL_VIEWER_TAB,
  TEARDOWN_VIEW_OPENS_DETAIL_TABLES,
  type TeardownView,
} from "@/lib/blueprints/teardown-views";
import type { RawSearchParams } from "@/lib/filter-href";
import { formatCentsRangeLabel, formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

function buildSpecifications(teardown: TeardownBlueprint): SpecificationRow[] {
  const isPayloadVisible = canRenderTeardownPayload(teardown.moderationState);

  const billOfMaterialsLabel =
    teardown.billOfMaterialsCostRange === null || !isPayloadVisible
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
    ...(teardown.assembly === null || !isPayloadVisible
      ? []
      : [{ label: "Parts modelled", value: formatCountLabel(teardown.assembly.parts.length) }]),
  ];
}

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
    { label: "Difficulty", value: BLUEPRINT_DIFFICULTY_LABELS[teardown.difficulty] },
  ];
}

export function TeardownHeaderMeta({
  teardown,
  teardownHref,
  provenanceChip,
  rawSearchParams,
  activeView,
}: {
  readonly teardown: TeardownBlueprint;
  readonly teardownHref: string;
  readonly provenanceChip: TeardownProvenanceChip;
  readonly rawSearchParams: RawSearchParams;
  readonly activeView: TeardownView;
}) {
  return (
    <>
      <p className="text-xs font-medium tracking-wider text-primary-imprint uppercase">Teardown</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-medium text-foreground lg:text-2xl">{teardown.title}</h1>
        <TeardownProvenanceChipBadge chip={provenanceChip} />
        <Link
          href={`${teardownHref}/report`}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive lg:ms-auto"
        >
          Report an IP concern
        </Link>
      </div>

      <BlueprintAuthorLine author={teardown.author} />

      <BlueprintViewBeacon arm="teardown" slug={teardown.slug} />

      <TeardownSubjectStrip provenance={teardown.provenance} />

      <TeardownModerationNotice moderationState={teardown.moderationState} />

      <TeardownViewSwitch searchParams={rawSearchParams} activeView={activeView} />

      <TeardownDecisionRow facts={buildDecisionFacts(teardown)} />

      <TeardownSummary summary={teardown.summary} />
    </>
  );
}

export function TeardownDensityLayout({
  teardown,
  activeView,
  isPayloadVisible,
  marketSignal,
}: {
  readonly teardown: TeardownBlueprint;
  readonly activeView: TeardownView;
  readonly isPayloadVisible: boolean;
  readonly marketSignal: TeardownMarketSignal | null;
}) {
  const shouldOpenDetailTables = TEARDOWN_VIEW_OPENS_DETAIL_TABLES[activeView];

  const compositionSection = isPayloadVisible ? (
    <TeardownMaterialComposition
      materials={teardown.materials}
      isOpenByDefault={shouldOpenDetailTables}
    />
  ) : null;

  const explorerSection =
    teardown.assembly === null || !isPayloadVisible ? (
      <>
        <SpecificationList specifications={buildSpecifications(teardown)} />
        <RepairabilityIndexPanel repairabilityIndex={teardown.repairabilityIndex} />
        {isPayloadVisible ? <TeardownPartsList partsList={teardown.partsList} /> : null}
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
            <TeardownPartsList partsList={teardown.partsList} />
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

  if (activeView === "business") {
    return (
      <>
        {marketSignalSection}
        {explorerSection}
        {compositionSection}
      </>
    );
  }

  return (
    <>
      {compositionSection}
      {explorerSection}
      {marketSignalSection}
    </>
  );
}

export function TeardownSupplementarySections({
  teardown,
  isPayloadVisible,
  isViewerSignedIn,
}: {
  readonly teardown: TeardownBlueprint;
  readonly isPayloadVisible: boolean;
  readonly isViewerSignedIn: boolean;
}) {
  return (
    <>
      {isPayloadVisible ? <TelemetryReadouts telemetry={teardown.simulationTelemetry} /> : null}

      {isPayloadVisible && teardown.assembly === null ? (
        <AssemblyStepList steps={teardown.assemblySteps} store={null} />
      ) : null}

      {isPayloadVisible && teardown.walkthroughVideo !== null ? (
        <BlueprintVideoBlock video={teardown.walkthroughVideo} title="Walkthrough" />
      ) : null}

      {isPayloadVisible ? <BlueprintDocumentList documents={teardown.documents} /> : null}

      {isPayloadVisible ? (
        <ManufacturingFileBundles manufacturingFiles={teardown.manufacturingFiles} />
      ) : null}

      <TeardownFactoryHandoff />

      <BlueprintTagList tags={teardown.tags} />

      <div className="mt-6 flex justify-end">
        <ReportBlueprintOpener arm="teardown" slug={teardown.slug} targetTitle={teardown.title} />
      </div>

      <BlueprintDiscussion
        arm="teardown"
        slug={teardown.slug}
        isViewerSignedIn={isViewerSignedIn}
        canComment={teardown.moderationState === "published"}
      />

      <p className="mt-6 text-xs text-outline-strong">
        Published{" "}
        <span title={formatIsoInstantLabel(teardown.createdAt)}>
          <RelativeTime isoInstant={teardown.createdAt} />
        </span>{" "}
        · {formatCountLabel(teardown.viewCount)} views
      </p>
    </>
  );
}
