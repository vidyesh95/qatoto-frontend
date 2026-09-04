"use client";

// TRANSPORT: props-only — the assessments arrive from the server component. Client-side
// because a dot can be clicked and the selection has to live somewhere; it fetches nothing
// itself. The panel below it is the piece that talks to the network.

import { useCallback, useRef, useState } from "react";

import { ScatterFrame } from "@/components/charts/scatter-frame";
import { ScatterSeries, type ScatterPoint } from "@/components/charts/scatter-series";
import LocalizationDetailPanel from "@/components/home/research-and-development/sections/localization-detail-panel";
import { formatIsoInstant } from "@/lib/rnd/format";
import { formatImportToExportRatio, formatTradeValueCompact } from "@/lib/rnd/import-format";
import type { LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";

/**
 * The import-substitution picker: one dot per product, hover to read it, click for the
 * pathway and what it might cost to start.
 *
 * ⚠️ THE AXES ARE MONEY ON A LOG SCALE, AND THE PREVIOUS TWO DESIGNS FAILED BECAUSE THEY WERE
 * NOT. Plotting the two SCORE COMPONENTS put every product on a nine-by-nine grid — the top
 * 400 manufacturable commodities occupied EIGHTEEN distinct positions, so a per-product dot
 * was impossible and the chart first fanned points out on a spiral and then gave up and
 * aggregated into a density grid. Aggregating answered a question nobody asked: you cannot
 * hover a bin and learn what to build.
 *
 * The underlying money separates them completely. Annual imports run $225M to $14.5B and
 * exports $14M to $20B across the plotted set — three and a half orders of magnitude, which
 * is exactly what a log axis is for, and 50 products land on 50 distinct positions.
 *
 * ⚠️ THE PARITY DIAGONAL IS THE READING, NOT A QUADRANT. Four quadrants were dead weight here:
 * the top of a ranking is by construction all in one of them (every plotted product clears
 * both thresholds), so the four names divided nothing and their in-plot labels covered the
 * dots. `y = x` divides them for real — 33 of the top 50 sit BELOW it, meaning the country
 * buys more of that product than it sells. That gap is the whole thesis of this surface.
 *
 * ⚠️ NOTHING IS PLOTTED THAT NOBODY MANUFACTURES. The unfiltered ranking opens with petroleum,
 * jewellery, aircraft, diamonds and unwrought gold — the five largest import bills in the
 * country and not one of them a factory decision. The page asks the backend for
 * `manufacturedOnly`, server-side; see `market-research-page.tsx`.
 */

// ⚠️ THERE IS ONE GUIDE, NOT TWO. A `$100M of imports a year` line was drawn here and
// removed: every plotted product is in the top 50 of the ranking, and the ranking's own import
// rung is $100M, so the line landed exactly on the axis floor and separated nothing. It was
// the four quadrants' mistake in miniature — a threshold the plotted set cannot straddle is
// decoration, and a legend entry for it is worse, because it implies a division that is not
// there.

const CENTS_PER_DOLLAR = 100;

/**
 * How big a dot is.
 *
 * Six pixels of radius: twelve across, which is a comfortable click target and small enough
 * that fifty of them read as a distribution rather than as overlapping discs. Size encodes
 * NOTHING here — see `uniformRadiusPixels` in `scatter-scale.ts` for why that is stated
 * explicitly rather than achieved by a magnitude trick.
 */
const DOT_RADIUS_PIXELS = 6;

/**
 * Dollars, as a Number, for POSITIONING ONLY.
 *
 * ⚠️ THE ONLY PLACE ON THIS SURFACE THAT TURNS CENTS INTO A `Number`, and it is safe for one
 * reason: the result is fed to `Math.log10` and becomes a percentage. It is never displayed,
 * never summed and never compared for equality — every figure a reader sees goes through
 * `import-format.ts`, which is BigInt throughout. India's largest line is 1.4e13 cents, well
 * inside `MAX_SAFE_INTEGER`, and a float error in the fifteenth digit moves a dot by less
 * than a millionth of a pixel.
 */
function positionDollars(valueInCents: string): number {
  return Number(BigInt(valueInCents)) / CENTS_PER_DOLLAR;
}

function formatAxisDollars(dollars: number): string {
  if (dollars >= 1_000_000_000) return `$${String(dollars / 1_000_000_000)}B`;
  if (dollars >= 1_000_000) return `$${String(dollars / 1_000_000)}M`;
  if (dollars >= 1_000) return `$${String(dollars / 1_000)}K`;
  return `$${String(dollars)}`;
}

export default function OpportunityScatter({
  assessments,
  reporterCountryCode,
  scoredCommodityCount,
}: {
  assessments: readonly LocalizationAssessment[];
  reporterCountryCode: string | undefined;
  /**
   * How many commodities are scored in total, from the grid read.
   *
   * The chart plots the top 50 manufactured products; this is the denominator that stops that
   * reading as "there are 50 opportunities". It comes from a separate aggregate over the whole
   * population, so it is a fact rather than a page size.
   */
  scoredCommodityCount: number;
}) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = useCallback((point: ScatterPoint) => {
    setSelectedAssessmentId(point.key);
    // Scrolled AFTER the state lands, so the panel exists to scroll to. `requestAnimationFrame`
    // rather than a timeout: React has committed by the next frame and a timeout would be a
    // guess about how long that takes.
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const selectedAssessment =
    assessments.find((assessment) => assessment.id === selectedAssessmentId) ?? null;

  const importDollars = assessments.map((assessment) =>
    positionDollars(assessment.observedImportValueInCents),
  );
  const exportDollars = assessments.map((assessment) =>
    positionDollars(assessment.observedExportValueInCents),
  );
  // Zero is excluded from the MINIMUM rather than clamped into it: a product with no exports
  // has no place on a log axis, and letting it set the floor would drag the whole axis to $1.
  // `scatter-scale.ts` floors it and `scatter-series.tsx` draws it as a ring.
  const positiveExportDollars = exportDollars.filter((dollars) => dollars > 0);

  const points: ScatterPoint[] = assessments.map((assessment, assessmentIndex) => ({
    key: assessment.id,
    label: assessment.commodityLabel,
    x: importDollars[assessmentIndex] ?? 0,
    y: exportDollars[assessmentIndex] ?? 0,
    // Uniform dots. The one thing available to size by — the feasibility score — is exactly
    // the sum of the two coordinates today, so it would encode nothing the position does not,
    // and large circles are what made the previous version unreadable.
    magnitude: 1,
  }));

  const netImporterCount = assessments.filter(
    (assessment) =>
      BigInt(assessment.observedImportValueInCents) > BigInt(assessment.observedExportValueInCents),
  ).length;
  const asOf = assessments[0]?.asOf;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">What to make here</h2>
        <p className="text-sm text-muted-foreground">
          One dot is one manufactured product this country imports. Hover to see which; click for
          the pathway and what it might cost to start. Both axes are annual trade, on a log scale —
          each gridline is ten times the last — because the figures span three and a half orders of
          magnitude and a linear axis would stack all but the largest onto the origin.
          {asOf === undefined ? null : <> Computed {formatIsoInstant(asOf)}.</>}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground">
            {netImporterCount} of {assessments.length}
          </span>{" "}
          sit below the parity line — the country buys more of that product than it sells. That gap
          is the opportunity; the ones above it are already served by domestic makers. These are the
          top {assessments.length} manufactured products out of{" "}
          {scoredCommodityCount.toLocaleString("en-US")} scored.
        </p>
      </div>

      <ScatterFrame
        x={{
          kind: "log",
          rawMin: Math.min(...importDollars),
          rawMax: Math.max(...importDollars),
        }}
        y={{
          kind: "log",
          rawMin: positiveExportDollars.length === 0 ? 1 : Math.min(...positiveExportDollars),
          rawMax: Math.max(...exportDollars, 1),
        }}
        rawMaxMagnitude={1}
        uniformRadiusPixels={DOT_RADIUS_PIXELS}
        xAxisLabel="annual imports"
        yAxisLabel="annual exports"
        formatX={formatAxisDollars}
        formatY={formatAxisDollars}
        plotHeightClassName="h-96"
        caption={`${String(assessments.length)} manufactured products this country imports, by annual imports against annual exports.`}
        rowColumnLabel="Product"
        valueColumnLabels={["HS code", "Annual imports", "Annual exports", "Buys per unit sold"]}
        tableRows={assessments.map((assessment) => ({
          key: assessment.id,
          label: assessment.commodityLabel,
          cells: [
            assessment.hsCode,
            formatTradeValueCompact(assessment.observedImportValueInCents, assessment.currency),
            BigInt(assessment.observedExportValueInCents) === BigInt(0)
              ? "none recorded"
              : formatTradeValueCompact(assessment.observedExportValueInCents, assessment.currency),
            formatImportToExportRatio(
              assessment.observedImportValueInCents,
              assessment.observedExportValueInCents,
            ) ?? "nothing exported",
          ],
        }))}
        referenceGuides={[
          {
            key: "parity",
            kind: "parity",
            label: "buys as much as it sells — below this line is the gap",
            isPrimary: true,
          },
        ]}
        emptyMessage="Nothing has been scored for this country yet."
      >
        {(scale) => (
          <ScatterSeries
            scale={scale}
            points={points}
            colorClassName="bg-chart-2"
            selectedKey={selectedAssessmentId}
            onSelect={handleSelect}
            formatPoint={(point) => {
              const assessment = assessments.find((candidate) => candidate.id === point.key);
              if (assessment === undefined) return point.label;
              const ratio = formatImportToExportRatio(
                assessment.observedImportValueInCents,
                assessment.observedExportValueInCents,
              );
              return [
                assessment.commodityLabel,
                `HS ${assessment.hsCode}`,
                `buys ${formatTradeValueCompact(assessment.observedImportValueInCents, assessment.currency)}/yr`,
                ratio === null
                  ? "sells none"
                  : `sells ${formatTradeValueCompact(assessment.observedExportValueInCents, assessment.currency)}/yr · ${ratio} more bought than sold`,
              ].join(" · ");
            }}
          />
        )}
      </ScatterFrame>

      <div ref={detailRef}>
        <LocalizationDetailPanel
          assessment={selectedAssessment}
          reporterCountryCode={reporterCountryCode}
        />
      </div>
    </section>
  );
}
