// TRANSPORT: props-only — presentational. Fetches nothing.

/**
 * What was left out of the ranking above, and why.
 *
 * WHY A SURFACE SHOULD SAY THIS AT ALL. A ranking that shows only what it kept invites the
 * reader to assume it considered everything — and the two exclusions here are both large and
 * both deliberate. Stating them is what makes the ranking above trustworthy rather than
 * merely confident.
 *
 * The counts are DERIVED FROM WHAT THE PAGE ALREADY FETCHED, not from a second read. The
 * catalogue total and the ranked total both come back in `pagination.total` on reads the page
 * makes anyway, so the difference between them is free and exact.
 */
export default function RuledOutPanel({
  catalogueTotal,
  rankedTotal,
  hasDemandRun,
}: {
  catalogueTotal: number;
  rankedTotal: number;
  /** False when no demand snapshot has been computed — a different absence from an empty one. */
  readonly hasDemandRun: boolean;
}) {
  const excludedForNoImports = Math.max(0, catalogueTotal - rankedTotal);

  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">Ruled out, and why</h2>
        <p className="text-sm text-muted-foreground">
          A ranking is only as honest as its exclusions.
        </p>
      </div>

      <ul className="space-y-3 text-sm">
        {excludedForNoImports === 0 ? null : (
          <li className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium tabular-nums">
              {excludedForNoImports.toLocaleString("en-US")}
            </span>
            <span className="text-muted-foreground">
              commodities are in the catalogue but not in the ranking — the country records no
              imports of them. Scoring a commodity nobody buys would publish a feasibility number
              with no market behind it, so they are excluded before ranking rather than sorted to
              the bottom.
            </span>
          </li>
        )}

        <li className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-muted-foreground">
            {hasDemandRun ? (
              <>
                Demand cells with no scoring run are absent from the leaderboard rather than shown
                as zero. A zero would be a finding about the world; the absence is a fact about the
                job.
              </>
            ) : (
              <>
                No demand snapshot has been computed yet, so nothing on the reported-problems side
                is ranked. That is the job not having run — not an absence of demand.
              </>
            )}
          </span>
        </li>

        <li className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-muted-foreground">
            Tariffs, duty rates and landed cost are not modelled at all. A duty rate is
            jurisdictional and dated, and a landed cost needs a per-supplier price this platform
            deliberately does not hold — so no figure here is a cost of doing the thing.
          </span>
        </li>
      </ul>
    </section>
  );
}
