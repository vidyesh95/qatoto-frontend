// TRANSPORT: props-only — client island. Holds pin/card SELECTION state only; clusters
// arrive as props from the server page, which read GET /discovery/problem-clusters.
// Fetches nothing, so it needs no QueryProvider.
//
// It used to import MOCK_PROBLEM_REPORTS directly — the one island on this surface that
// pulled a whole dataset into the client bundle. Category filtering moved to the query
// string (the chips are server-rendered Links), so all that is left here is the one thing
// that genuinely belongs on the client: syncing a clicked pin with its card.
"use client";

import Image from "next/image";
import { useState } from "react";

import ProblemClusterList from "@/components/home/research-and-development/sections/problem-report-list";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import {
  projectMicrodegreesToMapPercent,
  toOpportunityBand,
  type OpportunityBand,
} from "@/lib/rnd/map-projection";
import type { CategoryPinIconKey } from "@/lib/rnd/shared.schemas";

/**
 * Pin art per category, keyed off the wire's `pinIconKey` enum rather than off a display
 * label. The old map was keyed on English category names, so renaming a category in the
 * CMS silently fell back to the default pin.
 *
 * Six SVGs cover eleven keys: the built-environment keys share the infrastructure pin
 * because no dedicated art exists for them yet.
 */
const PIN_ICON_SRC_BY_ICON_KEY: Record<CategoryPinIconKey, string> = {
  water: "/dummy/icons/rnd_pin_water.svg",
  agriculture: "/dummy/icons/rnd_pin_agriculture.svg",
  health: "/dummy/icons/rnd_pin_health.svg",
  energy: "/dummy/icons/rnd_pin_energy.svg",
  education: "/dummy/icons/rnd_pin_education.svg",
  housing: "/dummy/icons/rnd_pin_infrastructure.svg",
  transport: "/dummy/icons/rnd_pin_infrastructure.svg",
  waste: "/dummy/icons/rnd_pin_infrastructure.svg",
  connectivity: "/dummy/icons/rnd_pin_infrastructure.svg",
  manufacturing: "/dummy/icons/rnd_pin_infrastructure.svg",
  other: "/dummy/icons/rnd_pin_infrastructure.svg",
};

const PIN_SIZE_CLASS: Record<OpportunityBand, string> = {
  high: "size-5",
  medium: "size-4",
  low: "size-3",
  unscored: "size-3",
};

// `unscored` is grey on purpose: a ring colour is a judgement, and there is no judgement
// to render before the scoring job has run.
const PIN_RING_CLASS: Record<OpportunityBand, string> = {
  high: "ring-red-500",
  medium: "ring-amber-500",
  low: "ring-[#00696E]",
  unscored: "ring-[#CAC4D0]",
};

/**
 * Civic Pulse map canvas. Pins are absolutely positioned over a static world-map image —
 * no map library — by projecting each cluster's centroid microdegrees
 * (`@/lib/rnd/map-projection`).
 *
 * There is no `mapPosition` on the wire and there must not be: a CSS offset into one
 * specific SVG is meaningless to the native clients, so the server sends coordinates and
 * each client projects them for its own canvas.
 */
export default function ProblemMapCanvas({ clusters }: { clusters: ProblemCluster[] }) {
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const toggleSelectedCluster = (clusterId: string) => {
    setSelectedClusterId((previousSelectedClusterId) =>
      previousSelectedClusterId === clusterId ? null : clusterId,
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="relative w-full self-start rounded-2xl bg-[#00696E]/5 p-2 sm:p-4">
        <Image
          src="/dummy/world_map.svg"
          width={2000}
          height={857}
          alt="World map of reported problems"
          className="h-auto w-full"
        />
        {clusters.map((cluster) => {
          const isSelected = cluster.id === selectedClusterId;
          const opportunityBand = toOpportunityBand(cluster.opportunityScorePoints);
          const pinPosition = projectMicrodegreesToMapPercent({
            latitudeMicrodegrees: cluster.centroidLatitudeMicrodegrees,
            longitudeMicrodegrees: cluster.centroidLongitudeMicrodegrees,
          });

          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => toggleSelectedCluster(cluster.id)}
              aria-label={`${cluster.title} — ${cluster.locationLabel ?? "location not resolved"}`}
              aria-pressed={isSelected}
              style={{ left: `${pinPosition.leftPercent}%`, top: `${pinPosition.topPercent}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded-full bg-white ring-2 ${PIN_SIZE_CLASS[opportunityBand]} ${PIN_RING_CLASS[opportunityBand]} ${
                isSelected ? "z-10 ring-[3px] ring-offset-2" : ""
              }`}
            >
              <Image
                src={PIN_ICON_SRC_BY_ICON_KEY[cluster.category.pinIconKey]}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
      <ProblemClusterList
        clusters={clusters}
        selectedClusterId={selectedClusterId}
        onSelectCluster={toggleSelectedCluster}
      />
    </div>
  );
}
