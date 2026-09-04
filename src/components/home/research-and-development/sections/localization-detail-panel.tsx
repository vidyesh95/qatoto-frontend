"use client";

// TRANSPORT: client-query — reads GET /import-commodities/:hsCode and writes
// POST /localization-assessments/:id/pathway through `@/hooks/rnd/import-intelligence`.

import Link from "next/link";
import { useState } from "react";

import {
  NARRATIVE_POLL_GIVE_UP_MS,
  useImportCommodityQuery,
  useRequestPathwayNarrativeMutation,
} from "@/hooks/rnd/import-intelligence";
import { formatIsoInstant } from "@/lib/rnd/format";
import {
  formatCapitalAgainstImports,
  formatCapitalBand,
  formatConfidenceBps,
  formatImportToExportRatio,
  formatTradeValueExact,
} from "@/lib/rnd/import-format";
import type { LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";

/**
 * What one product would take, opened by clicking its dot.
 *
 * ⚠️ TWO KINDS OF NUMBER LIVE HERE AND THE PANEL NEVER LETS THEM BLUR. The trade figures are
 * MEASURED — customs filings, ingested from Comtrade, and true whatever anybody thinks. The
 * capital band is a language model's GUESS, and the only model-supplied number anywhere on
 * this surface. They are in separate blocks, the guess carries its model, prompt version and
 * date, and the word "estimate" is in the heading rather than in a footnote.
 *
 * ⚠️ A 202 IS NOT A RESULT. Asking for a pathway queues a job; it does not produce one. The
 * panel renders "we are writing this" and polls, and it gives up out loud after a bounded
 * number of attempts — the job runs in a separate worker process, and a worker that is not
 * running is a state a reader has to be able to tell apart from a slow one.
 *
 * ⚠️ NOTHING HERE IS A QUOTE. No part of this platform will honour the capital figure, no
 * supplier has priced it, and the copy says so where a reader will actually read it.
 */

/**
 * ⚠️ NO `idle` VARIANT. A null assessment returns early above, so by the time this union is
 * built the query has been enabled and is at least `loading`. An unreachable variant is a
 * branch nothing exercises, and the `never` default below would stop catching a real gap.
 */
type PanelState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "writing"; readonly hasGivenUp: boolean }
  | { readonly status: "unavailable"; readonly reason: "failed" | "skipped_unconfigured" }
  | { readonly status: "ready"; readonly title: string; readonly bodyText: string }
  | { readonly status: "not_requested" };

function MeasuredFigures({ assessment }: { assessment: LocalizationAssessment }) {
  const ratio = formatImportToExportRatio(
    assessment.observedImportValueInCents,
    assessment.observedExportValueInCents,
  );

  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
      <div>
        <dt className="text-xs text-muted-foreground">Bought from abroad, per year</dt>
        <dd className="text-sm font-medium">
          {formatTradeValueExact(assessment.observedImportValueInCents, assessment.currency)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Already sold abroad, per year</dt>
        <dd className="text-sm font-medium">
          {/* Zero exports is a FINDING — nobody here makes this at scale — and reads as one
              rather than as a formatted $0, which looks like a rounding artefact. */}
          {BigInt(assessment.observedExportValueInCents) === BigInt(0)
            ? "None recorded"
            : formatTradeValueExact(assessment.observedExportValueInCents, assessment.currency)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Bought per unit sold</dt>
        <dd className="text-sm font-medium">{ratio ?? "Nothing exported"}</dd>
      </div>
    </dl>
  );
}

export default function LocalizationDetailPanel({
  assessment,
  reporterCountryCode,
}: {
  assessment: LocalizationAssessment | null;
  reporterCountryCode: string | undefined;
}) {
  const [giveUpAtMs, setGiveUpAtMs] = useState<number | null>(null);
  const detailQuery = useImportCommodityQuery(assessment?.hsCode, reporterCountryCode, giveUpAtMs);
  const pathwayMutation = useRequestPathwayNarrativeMutation(
    assessment?.hsCode,
    reporterCountryCode,
  );

  /**
   * Whether to stop calling it "still writing".
   *
   * ⚠️ DERIVED FROM `dataUpdatedAt`, NOT FROM `Date.now()`. The deadline is set in the click
   * handler — an event, where reading the clock is fine — and compared here against a
   * timestamp React Query already holds, so the render is pure and the hook's own stop
   * condition is the identical comparison. A `setTimeout` plus an effect would be a second
   * clock that could disagree with the first, and a `Date.now()` in render is a value that
   * changes without a re-render to show it.
   */
  const hasWaitedTooLong = giveUpAtMs !== null && detailQuery.dataUpdatedAt > giveUpAtMs;

  if (assessment === null) {
    return (
      <p className="rounded-2xl border border-dashed border-[#CAC4D0]/60 p-4 text-sm text-muted-foreground">
        Pick a dot to see what that product would take to make here.
      </p>
    );
  }

  const suggestion = detailQuery.data?.pathwaySuggestions[0];
  const narrativeStatus = detailQuery.data?.assessment?.narrativeStatus ?? "pending";

  const panelState: PanelState = (() => {
    if (detailQuery.isPending) return { status: "loading" };
    if (detailQuery.isError) {
      return { status: "error", message: "Could not load this product's detail." };
    }
    if (suggestion !== undefined) {
      return { status: "ready", title: suggestion.title, bodyText: suggestion.bodyText };
    }
    if (narrativeStatus === "failed" || narrativeStatus === "skipped_unconfigured") {
      return { status: "unavailable", reason: narrativeStatus };
    }
    if (pathwayMutation.isPending || pathwayMutation.isSuccess) {
      // The poll stops at the same deadline (`refetchInterval` in the hook), so past it
      // "still writing" would be a claim that something is happening when nothing is.
      return { status: "writing", hasGivenUp: hasWaitedTooLong };
    }
    return { status: "not_requested" };
  })();

  const capitalBand =
    suggestion === undefined
      ? null
      : formatCapitalBand(
          suggestion.estimatedCapitalMinInCents,
          suggestion.estimatedCapitalMaxInCents,
          assessment.currency,
        );
  const capitalAgainstImports =
    suggestion === undefined
      ? null
      : formatCapitalAgainstImports(
          suggestion.estimatedCapitalMaxInCents,
          assessment.observedImportValueInCents,
        );
  /**
   * An estimate worth more than several years of the entire national import bill for that
   * product is not a plant cost, whatever its basis says.
   *
   * Ten is a threshold, not a boundary — nothing here knows the true figure. It exists so the
   * copy can say "unreliable" out loud on the one case the batch run actually produced (a
   * $1.5T fab, 217x the market) rather than leaving a reader to notice.
   */
  const isCapitalImplausible =
    suggestion?.estimatedCapitalMaxInCents != null &&
    BigInt(suggestion.estimatedCapitalMaxInCents) >
      BigInt(assessment.observedImportValueInCents) * BigInt(10);

  return (
    <section className="space-y-4 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">HS {assessment.hsCode}</p>
        <h3 className="font-serif text-lg leading-snug">{assessment.commodityLabel}</h3>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Measured — customs filings
        </p>
        <MeasuredFigures assessment={assessment} />
      </div>

      <div className="space-y-2 border-t border-[#CAC4D0]/60 pt-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Capital to start — a model estimate, not a quote
        </p>

        {(() => {
          switch (panelState.status) {
            case "loading":
              return <p className="text-sm text-muted-foreground">Loading…</p>;

            case "error":
              return <p className="text-sm text-muted-foreground">{panelState.message}</p>;

            case "not_requested":
              return (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Nobody has asked for this one yet. Writing it calls a language model once and
                    caches the answer for everybody.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setGiveUpAtMs(Date.now() + NARRATIVE_POLL_GIVE_UP_MS);
                      pathwayMutation.mutate(assessment.id);
                    }}
                    className="rounded-full bg-[#00696E] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#00565A]"
                  >
                    Write the pathway
                  </button>
                  {pathwayMutation.isError ? (
                    <p className="text-sm text-muted-foreground">
                      {/* The backend's own sentence, not a generic one: a 401 and a 503 need
                          different things from the reader. */}
                      {pathwayMutation.error.message}
                    </p>
                  ) : null}
                </div>
              );

            case "writing":
              return panelState.hasGivenUp ? (
                <p className="text-sm text-muted-foreground">
                  {/* ⚠️ THIS MUST NOT NAME A CAUSE. Two different things look identical from
                      here: nobody consuming the queue, and a model provider returning 503 while
                      the job retries with backoff — the second is what actually happened the
                      first time this ran. Asserting the first would have sent a reader to
                      restart a worker that was already running. */}
                  Still nothing after a minute. The job is queued and will keep retrying on its own
                  — reopen this product later. Nothing was charged for the attempt.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Writing this now. It has been queued, not answered — there is no figure yet, and
                  this will fill in on its own.
                </p>
              );

            case "unavailable":
              return (
                <p className="text-sm text-muted-foreground">
                  {panelState.reason === "skipped_unconfigured"
                    ? "No model is configured on this deployment, so no pathway was written. The trade figures above are unaffected."
                    : "Writing this failed. The trade figures above are unaffected — they were measured, not generated."}
                </p>
              );

            case "ready":
              return (
                <div className="space-y-3">
                  {capitalBand === null ? (
                    <p className="text-sm text-muted-foreground">
                      {/* Declining is a legal answer the prompt asks for. It is NOT zero and NOT
                          cheap, and it must not render as a blank. */}
                      The model declined to estimate capital for this product. That is an absence,
                      not a low number.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-serif text-2xl">{capitalBand}</p>
                      {suggestion?.capitalBasisText === null ? null : (
                        <p className="text-sm text-muted-foreground">
                          {suggestion?.capitalBasisText}
                        </p>
                      )}
                      {capitalAgainstImports === null ? null : (
                        <p className="text-sm text-muted-foreground">
                          {/* ⚠️ THE ONE CHECK ON THE MODEL THAT USES MEASURED DATA. Nothing
                              here can tell whether a capital figure is right — that is why it
                              is a guess. But the annual import bill IS measured, and an
                              estimate many times larger than everything the country buys of
                              that product in a year is visibly wrong without any domain
                              knowledge. One batch run produced exactly that. */}
                          Upper end is{" "}
                          <span className="text-foreground">{capitalAgainstImports}</span> what this
                          country buys of it in a year.{" "}
                          {isCapitalImplausible
                            ? "That is far more than the whole market, so treat this estimate as unreliable."
                            : null}
                        </p>
                      )}
                    </div>
                  )}

                  {suggestion === undefined ? null : (
                    <p className="text-xs text-muted-foreground">
                      {/* No "Confidence" prefix — `formatConfidenceBps` already returns
                          "65% confidence" or "No confidence recorded", and prefixing it
                          rendered "Confidence 65% confidence". */}
                      {formatConfidenceBps(suggestion.confidenceBps)} · {suggestion.modelName} ·{" "}
                      {suggestion.promptVersion} · {formatIsoInstant(suggestion.asOf)}
                    </p>
                  )}

                  <div className="space-y-1 border-t border-[#CAC4D0]/60 pt-3">
                    <p className="text-sm font-medium">{panelState.title}</p>
                    {/* The steps and risks, as the generator joined them. Rendered per paragraph
                        rather than through a markdown parser — the writer is a model and this is
                        untrusted text, so it is displayed as text. */}
                    {panelState.bodyText.split("\n\n").map((paragraph) => (
                      <p key={paragraph.slice(0, 60)} className="text-sm text-muted-foreground">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              );

            default: {
              const exhaustiveCheck: never = panelState;
              return exhaustiveCheck;
            }
          }
        })()}
      </div>

      <p className="border-t border-[#CAC4D0]/60 pt-3 text-xs text-muted-foreground">
        No supplier has priced this and nothing on Qatoto will honour the figure. Treat it as a
        starting point for your own quotes.{" "}
        <Link
          href={`/research-and-development/import-intelligence/${assessment.hsCode}`}
          className="text-[#00696E] hover:underline"
        >
          Full trade history and substitutes →
        </Link>
      </p>
    </section>
  );
}
