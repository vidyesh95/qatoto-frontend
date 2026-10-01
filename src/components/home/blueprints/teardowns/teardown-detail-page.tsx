// TRANSPORT: mixed — async server component. The teardown itself comes from the Express backend
// via `getPublicTeardown`; `getTeardownMarketSignal` is still a fixture read, because the market
// signal has no table yet.
//
// ⚠️ THE QUARANTINE WITHHOLDING IS THE SERVER'S NOW. A quarantined teardown arrives with
// `assembly`, `documents`, `manufacturingFiles`, `materials`, `assemblySteps`, `fasteners`,
// `simulationTelemetry`, `walkthroughVideo`, `billOfMaterialsCostRange` and `repairabilityIndex`
// already empty or null — the disputed bytes never reach this component. The
// `canRenderTeardownPayload` calls below are now BELT AND BRACES, not the control; they stay
// because they also keep the page's own derived labels honest (a cost band assembled from three
// nulls, a "parts modelled" count of a withheld model), and because a component that assumes a
// server guarantee reads as one that enforces it.

import Image from "next/image";
import { notFound } from "next/navigation";

import TeardownEngagementBar from "@/components/home/blueprints/teardowns/sections/teardown-engagement-bar";
import TeardownProvenanceBlock from "@/components/home/blueprints/teardowns/sections/teardown-provenance-block";
import {
  TeardownDensityLayout,
  TeardownHeaderMeta,
  TeardownSupplementarySections,
} from "@/components/home/blueprints/teardowns/teardown-detail-sections";
import { getPublicTeardown, getTeardownMarketSignal } from "@/lib/blueprints/teardown-public.api";
import { hasCallerSession } from "@/lib/server-http";
import {
  buildBlueprintHref,
  canRenderTeardownPayload,
  resolveTeardownProvenanceChip,
} from "@/lib/blueprints/schemas";
import {
  DEFAULT_TEARDOWN_VIEW,
  TEARDOWN_VIEW_QUERY_KEY,
  TEARDOWN_VIEWS,
  type TeardownView,
} from "@/lib/blueprints/teardown-views";
import { readEnumParam, type RawSearchParams } from "@/lib/filter-href";

export default async function TeardownDetailPage({
  slug,
  searchParams,
}: {
  readonly slug: string;
  readonly searchParams: Promise<RawSearchParams>;
}) {
  const teardownResponse = await getPublicTeardown(slug);
  if (!teardownResponse.success) notFound();
  const teardown = teardownResponse.data;

  const rawSearchParams = await searchParams;
  const activeView: TeardownView =
    readEnumParam(rawSearchParams, TEARDOWN_VIEW_QUERY_KEY, TEARDOWN_VIEWS) ??
    DEFAULT_TEARDOWN_VIEW;

  const provenanceChip = resolveTeardownProvenanceChip(teardown);
  const teardownHref = buildBlueprintHref(teardown);
  const isPayloadVisible = canRenderTeardownPayload(teardown.moderationState);

  const [marketSignalResponse, isViewerSignedIn] = await Promise.all([
    getTeardownMarketSignal(teardown.slug),
    hasCallerSession(),
  ]);

  const marketSignal =
    marketSignalResponse.success &&
    (marketSignalResponse.data.storeListings.length > 0 ||
      marketSignalResponse.data.showcases.length > 0)
      ? marketSignalResponse.data
      : null;

  return (
    <article className="pb-12">
      <div className="relative aspect-video w-full bg-muted lg:aspect-21/9">
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
        <TeardownHeaderMeta
          teardown={teardown}
          teardownHref={teardownHref}
          provenanceChip={provenanceChip}
          rawSearchParams={rawSearchParams}
          activeView={activeView}
        />

        <TeardownEngagementBar teardown={teardown} isViewerSignedIn={isViewerSignedIn} />

        <TeardownProvenanceBlock
          provenance={teardown.provenance}
          chip={provenanceChip}
          reportHref={`${teardownHref}/report`}
        />

        <TeardownDensityLayout
          teardown={teardown}
          activeView={activeView}
          isPayloadVisible={isPayloadVisible}
          marketSignal={marketSignal}
        />

        <TeardownSupplementarySections
          teardown={teardown}
          isPayloadVisible={isPayloadVisible}
          isViewerSignedIn={isViewerSignedIn}
        />
      </div>
    </article>
  );
}
