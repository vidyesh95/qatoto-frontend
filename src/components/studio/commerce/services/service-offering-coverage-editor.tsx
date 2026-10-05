// TRANSPORT: client-query — reads GET and writes PUT /commerce/service-offerings/:offeringId/coverage.
"use client";

// WHERE ONE SERVICE OFFERING WORKS: ITS COVERAGE LANES.
//
// A lane is an origin and a destination, each a country (blank = any) with an optional region
// label, plus a location identifier and two capability flags. The public directory filters on these
// countries, and the freight estimate on a product page matches a buyer's destination against them,
// so a lane is how a buyer delivering to Kenya finds a forwarder that works there.
//
// ⚠️ **THE SAVE REPLACES THE WHOLE LIST.** `PUT …/coverage` takes every lane the offering should
// have; a lane missing from the body is deleted. So the editor is seeded from the server's own read
// and always sends the full list on screen, never a diff, and it does not render until that read
// has answered — an editor that opened empty would delete every stored lane on its first save.
//
// READ-ONLY OUTSIDE `draft` AND `pending_review`. The route refuses the other three states, and the
// server says which applies (`isEditable`), so the editor shows the lanes and the reason instead of
// a Save whose only outcome is an error.

import { useState } from "react";

import {
  useOwnedOfferingCoverageQuery,
  useSetOfferingCoverageMutation,
} from "@/hooks/store/providers";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { COUNTRY_OPTIONS, countryName } from "@/lib/countries";
import type {
  OwnedOfferingCoverage,
  PublicCoverage,
  ServiceCoverageInput,
} from "@/lib/store/providers.schemas";

/** The backend's per-lane text limit and list limit (`CoverageSchema`, `SetCoverageSchema`). */
const COVERAGE_TEXT_MAXIMUM_LENGTH = 120;
const COVERAGE_LANE_MAXIMUM_COUNT = 50;

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40";

/** One lane as the form holds it. A blank string is "any" / "not stated", never a value. */
interface CoverageLaneDraft {
  readonly draftId: number;
  readonly originCountryCode: string;
  readonly destinationCountryCode: string;
  readonly originRegionLabel: string;
  readonly destinationRegionLabel: string;
  readonly locationIdentifier: string;
  readonly supportsHazardousGoods: boolean;
  readonly supportsConsolidation: boolean;
}

type CoverageEditorViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly coverage: OwnedOfferingCoverage };

export default function ServiceOfferingCoverageEditor({ offeringId }: { offeringId: string }) {
  const coverageQuery = useOwnedOfferingCoverageQuery(offeringId, true);

  const viewState: CoverageEditorViewState = (() => {
    if (coverageQuery.isPending) return { status: "loading" };
    const result = coverageQuery.data;
    if (coverageQuery.isError || result === undefined) {
      return { status: "error", message: "Couldn't load this listing's coverage." };
    }
    if (!result.success) return { status: "error", message: result.error.message };
    return { status: "ready", coverage: result.data };
  })();

  switch (viewState.status) {
    case "loading":
      return <p className="mt-3 text-xs text-muted-foreground">Loading coverage…</p>;
    case "error":
      return <p className="mt-3 text-xs leading-4 text-destructive">{viewState.message}</p>;
    case "ready":
      // Seeded ONCE from the server's list. After a save the form already holds exactly what was
      // sent, which is what the PUT stored; reopening the editor reads the list again.
      return <CoverageLaneForm offeringId={offeringId} coverage={viewState.coverage} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function toLaneDraft(lane: PublicCoverage, draftId: number): CoverageLaneDraft {
  return {
    draftId,
    originCountryCode: lane.originCountryCode ?? "",
    destinationCountryCode: lane.destinationCountryCode ?? "",
    originRegionLabel: lane.originRegionLabel ?? "",
    destinationRegionLabel: lane.destinationRegionLabel ?? "",
    locationIdentifier: lane.locationIdentifier ?? "",
    supportsHazardousGoods: lane.supportsHazardousGoods,
    supportsConsolidation: lane.supportsConsolidation,
  };
}

function emptyLaneDraft(draftId: number): CoverageLaneDraft {
  return {
    draftId,
    originCountryCode: "",
    destinationCountryCode: "",
    originRegionLabel: "",
    destinationRegionLabel: "",
    locationIdentifier: "",
    supportsHazardousGoods: false,
    supportsConsolidation: false,
  };
}

/** A blank field is OMITTED, which the backend stores as NULL: "any country", "no label". */
function toCoverageInput(lane: CoverageLaneDraft): ServiceCoverageInput {
  const originRegionLabel = lane.originRegionLabel.trim();
  const destinationRegionLabel = lane.destinationRegionLabel.trim();
  const locationIdentifier = lane.locationIdentifier.trim();
  return {
    ...(lane.originCountryCode === "" ? {} : { originCountryCode: lane.originCountryCode }),
    ...(lane.destinationCountryCode === ""
      ? {}
      : { destinationCountryCode: lane.destinationCountryCode }),
    ...(originRegionLabel === "" ? {} : { originRegionLabel }),
    ...(destinationRegionLabel === "" ? {} : { destinationRegionLabel }),
    ...(locationIdentifier === "" ? {} : { locationIdentifier }),
    supportsHazardousGoods: lane.supportsHazardousGoods,
    supportsConsolidation: lane.supportsConsolidation,
  };
}

function describeLaneCountry(countryCode: string): string {
  return countryCode === "" ? "Any country" : countryName(countryCode);
}

function CoverageLaneForm({
  offeringId,
  coverage,
}: {
  offeringId: string;
  coverage: OwnedOfferingCoverage;
}) {
  const [laneDrafts, setLaneDrafts] = useState<readonly CoverageLaneDraft[]>(() =>
    coverage.coverages.map((lane, index) => toLaneDraft(lane, index)),
  );
  const [nextDraftId, setNextDraftId] = useState(coverage.coverages.length);
  const setCoverage = useSetOfferingCoverageMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  if (!coverage.isEditable) {
    return (
      <div className="mt-3 space-y-2 rounded-xl border border-border px-3 py-3">
        <p className="text-xs leading-4 text-muted-foreground">
          Coverage can be changed only while a listing is a draft or waiting for review.
        </p>
        <ReadOnlyLaneList lanes={coverage.coverages} />
      </div>
    );
  }

  function updateLane(draftId: number, change: Partial<Omit<CoverageLaneDraft, "draftId">>) {
    setLaneDrafts((currentLanes) =>
      currentLanes.map((lane) => (lane.draftId === draftId ? { ...lane, ...change } : lane)),
    );
    // A different list is a different request: a key reused across two bodies is a 409.
    resetIdempotencyKey();
  }

  function handleAddLaneClick() {
    setLaneDrafts((currentLanes) => [...currentLanes, emptyLaneDraft(nextDraftId)]);
    setNextDraftId((draftId) => draftId + 1);
    resetIdempotencyKey();
  }

  function handleRemoveLaneClick(draftId: number) {
    setLaneDrafts((currentLanes) => currentLanes.filter((lane) => lane.draftId !== draftId));
    resetIdempotencyKey();
  }

  function handleSaveClick() {
    if (setCoverage.isPending) return;
    setCoverage.mutate(
      {
        offeringId,
        coverages: laneDrafts.map(toCoverageInput),
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.success) resetIdempotencyKey();
        },
      },
    );
  }

  const hasReachedLaneLimit = laneDrafts.length >= COVERAGE_LANE_MAXIMUM_COUNT;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border px-3 py-3">
      <p className="text-xs leading-4 text-muted-foreground">
        Where this service works. Leave a country blank to mean any country: a buyer filtering the
        directory by any country will find that lane. Saving replaces the whole list, so a lane you
        remove here is removed from the listing.
      </p>

      {laneDrafts.length === 0 && (
        <p className="text-xs leading-4 text-foreground">
          No lanes yet. Without one, this listing does not appear when buyers filter by country.
        </p>
      )}

      {laneDrafts.map((lane, laneIndex) => (
        <fieldset key={lane.draftId} className="space-y-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-medium text-foreground">Lane {laneIndex + 1}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <CountrySelect
              label="From"
              value={lane.originCountryCode}
              onChange={(countryCode) =>
                updateLane(lane.draftId, { originCountryCode: countryCode })
              }
            />
            <CountrySelect
              label="To"
              value={lane.destinationCountryCode}
              onChange={(countryCode) =>
                updateLane(lane.draftId, { destinationCountryCode: countryCode })
              }
            />
            <label className="block text-xs font-medium text-muted-foreground">
              Origin region (optional)
              <input
                type="text"
                value={lane.originRegionLabel}
                maxLength={COVERAGE_TEXT_MAXIMUM_LENGTH}
                onChange={(event) =>
                  updateLane(lane.draftId, { originRegionLabel: event.target.value })
                }
                className={FIELD_CLASS}
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Destination region (optional)
              <input
                type="text"
                value={lane.destinationRegionLabel}
                maxLength={COVERAGE_TEXT_MAXIMUM_LENGTH}
                onChange={(event) =>
                  updateLane(lane.draftId, { destinationRegionLabel: event.target.value })
                }
                className={FIELD_CLASS}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-muted-foreground">
            Location identifier, such as a port or airport code (optional)
            <input
              type="text"
              value={lane.locationIdentifier}
              maxLength={COVERAGE_TEXT_MAXIMUM_LENGTH}
              onChange={(event) =>
                updateLane(lane.draftId, { locationIdentifier: event.target.value })
              }
              className={FIELD_CLASS}
            />
          </label>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={lane.supportsHazardousGoods}
                onChange={(event) =>
                  updateLane(lane.draftId, { supportsHazardousGoods: event.target.checked })
                }
              />
              Handles hazardous goods
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={lane.supportsConsolidation}
                onChange={(event) =>
                  updateLane(lane.draftId, { supportsConsolidation: event.target.checked })
                }
              />
              Consolidates shipments
            </label>
            <button
              type="button"
              onClick={() => handleRemoveLaneClick(lane.draftId)}
              className="ml-auto cursor-pointer text-xs font-medium text-foreground underline"
            >
              Remove lane
            </button>
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddLaneClick}
          disabled={hasReachedLaneLimit}
          className={QUIET_BUTTON_CLASS}
        >
          Add a lane
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={setCoverage.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {setCoverage.isPending ? "Saving…" : "Save coverage"}
        </button>
        {hasReachedLaneLimit && (
          <span className="text-xs text-muted-foreground">
            {COVERAGE_LANE_MAXIMUM_COUNT} lanes is the most one listing can carry.
          </span>
        )}
      </div>

      {setCoverage.data?.success === false && (
        <p className="text-xs leading-4 text-destructive">{setCoverage.data.error.message}</p>
      )}
      {setCoverage.isError && (
        <p className="text-xs leading-4 text-destructive">Coverage was not saved. Try again.</p>
      )}
      {setCoverage.data?.success === true && (
        <p className="text-xs leading-4 text-muted-foreground">Coverage saved.</p>
      )}
    </div>
  );
}

/**
 * A country `<select>` with "Any country" first. A stored code that the browse list does not carry
 * is still offered, so opening and saving a lane never silently turns it into "any".
 */
function CountrySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (countryCode: string) => void;
}) {
  const isValueListed = value === "" || COUNTRY_OPTIONS.some((country) => country.code === value);
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CLASS}
      >
        <option value="">Any country</option>
        {!isValueListed && <option value={value}>{value}</option>}
        {COUNTRY_OPTIONS.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyLaneList({ lanes }: { lanes: readonly PublicCoverage[] }) {
  if (lanes.length === 0) {
    return <p className="text-xs leading-4 text-foreground">No lanes.</p>;
  }
  return (
    <ul className="space-y-1">
      {lanes.map((lane, laneIndex) => (
        <li key={laneIndex} className="text-xs leading-4 text-foreground">
          {describeLaneCountry(lane.originCountryCode ?? "")}
          {lane.originRegionLabel === null ? "" : ` (${lane.originRegionLabel})`} →{" "}
          {describeLaneCountry(lane.destinationCountryCode ?? "")}
          {lane.destinationRegionLabel === null ? "" : ` (${lane.destinationRegionLabel})`}
          {lane.locationIdentifier === null ? "" : ` · ${lane.locationIdentifier}`}
          {lane.supportsHazardousGoods ? " · hazardous goods" : ""}
          {lane.supportsConsolidation ? " · consolidation" : ""}
        </li>
      ))}
    </ul>
  );
}
