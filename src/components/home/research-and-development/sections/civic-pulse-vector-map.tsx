// TRANSPORT: props-only — clusters, selection and the rendered list arrive as props from
// `problem-map-canvas`. Fetches no Qatoto endpoint; the only network reads are OpenFreeMap's
// style, fonts and vector tiles, none of which carry a key. It REPORTS its viewport upward and
// the parent does the fetching, so the canvas still owns no transport of its own.
"use client";

import Image from "next/image";
import { type RefObject } from "react";
import { createPortal } from "react-dom";

import {
  PIN_ICON_SRC_BY_ICON_KEY,
  PIN_RING_CLASS,
  PIN_SIZE_CLASS,
} from "@/components/home/research-and-development/sections/problem-map-pins";
import {
  type MapViewportReport,
  type VectorMapStatus,
  useCivicPulseMaplibreController,
} from "@/hooks/rnd/use-civic-pulse-maplibre-controller";
import type { MapViewMode } from "@/lib/rnd/civic-pulse-map";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import { toOpportunityBand } from "@/lib/rnd/map-projection";
import type { MapCamera } from "@/lib/rnd/map-viewport";

export type { MapViewportReport };

type CivicPulseVectorMapProps = {
  readonly clusters: ProblemCluster[];
  readonly selectedClusterId: string | null;
  readonly onSelectCluster: (clusterId: string) => void;
  readonly initialCamera: MapCamera | null;
  readonly onViewportChange: (viewport: MapViewportReport) => void;
  readonly viewMode: MapViewMode;
  readonly onUnavailable: () => void;
  readonly mapOverlayRef: RefObject<HTMLElement | null>;
  readonly matchRadiusMeters: number | null;
};

function VectorMapStatusOverlay({ status }: { readonly status: VectorMapStatus }) {
  switch (status.kind) {
    case "loading":
      return (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-xs text-muted-foreground">Loading map…</span>
        </div>
      );
    case "ready":
      return null;
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

export default function CivicPulseVectorMap({
  clusters,
  selectedClusterId,
  onSelectCluster,
  initialCamera,
  onViewportChange,
  viewMode,
  onUnavailable,
  mapOverlayRef,
  matchRadiusMeters,
}: CivicPulseVectorMapProps) {
  const { mapContainerRef, status, markerContainersByClusterId } = useCivicPulseMaplibreController({
    clusters,
    selectedClusterId,
    initialCamera,
    onViewportChange,
    viewMode,
    onUnavailable,
    mapOverlayRef,
    matchRadiusMeters,
  });

  return (
    <div className="absolute inset-0 overflow-hidden bg-primary-imprint/5">
      <div
        ref={mapContainerRef}
        className="h-full w-full"
        role="application"
        aria-label="Map of reported problem clusters"
      />
      <VectorMapStatusOverlay status={status} />

      {[...markerContainersByClusterId].map(([clusterId, markerContainer]) => {
        const cluster = clusters.find((candidate) => candidate.id === clusterId);
        if (!cluster) return null;

        const isSelected = cluster.id === selectedClusterId;
        const opportunityBand = toOpportunityBand(cluster.opportunityScorePoints);

        return createPortal(
          <button
            key={clusterId}
            type="button"
            onClick={() => onSelectCluster(cluster.id)}
            aria-label={`${cluster.title} — ${cluster.locationLabel ?? "location not resolved"}`}
            aria-pressed={isSelected}
            className={`cursor-pointer overflow-hidden rounded-full bg-white ring-2 ${PIN_SIZE_CLASS[opportunityBand]} ${PIN_RING_CLASS[opportunityBand]} ${
              isSelected ? "z-10 ring-4 ring-offset-2" : ""
            }`}
          >
            <Image
              src={PIN_ICON_SRC_BY_ICON_KEY[cluster.category.pinIconKey]}
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          </button>,
          markerContainer,
          clusterId,
        );
      })}
    </div>
  );
}
