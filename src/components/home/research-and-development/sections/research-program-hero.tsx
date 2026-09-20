// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Image from "next/image";

import { formatEffortFromMinutes, formatIsoInstant } from "@/lib/rnd/format";
import type {
  ResearchProgramDetail,
  ResearchProgramStats,
} from "@/lib/rnd/research-programs.schemas";

type ResearchProgramHeroProps = {
  program: ResearchProgramDetail;
  /**
   * `null` when the nightly job has never run for this program — a real state, not an error.
   *
   * The tiles then say so instead of showing zeroes. Four zeroes read as "this program has
   * nobody and nothing", which is a different and false claim from "nobody has counted yet".
   */
  stats: ResearchProgramStats | null;
};

/**
 * Page-opening banner for a research program.
 *
 * Carries the same deep-teal gradient identity as `research-program-banner.tsx` (the landing
 * teaser that links here) so the two read as one thing.
 *
 * THE FOURTH TILE IS HOURS, NOT MONEY. The mock this replaces showed "$4.2M compensation pool
 * escrowed". Escrow left the backend entirely (§7 — nine routes 404) and no program-scoped money
 * rail exists, so there is no such figure to show. Hours logged is a number this system can
 * defend.
 */
export default function ResearchProgramHero({ program, stats }: ResearchProgramHeroProps) {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <Image
        src="/icons/diamond_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
        width={24}
        height={24}
        alt=""
      />
      <p className="mt-4 text-xs tracking-widest">OPEN RESEARCH PROGRAM</p>
      <h1 className="mt-1 font-serif text-3xl uppercase md:text-5xl">{program.title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-white/80">{program.tagline}</p>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70">
        {program.missionStatement}
      </p>

      {stats ? (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {/*
              LABEL FIRST, IN BOTH THE MARKUP AND THE VIEW. This used to be `flex-col-reverse`,
              which existed only to lift the value above its label — `docs/Design.md` §6's named
              anti-reference, "the hero metric with a big number and a small label". Dropping the
              inversion is the half that actually removes that shape; de-serifing alone would not.

              Counts arrive as integers and are formatted here — `toLocaleString` is where the
              thousands separator belongs, not the wire.
            */}
            <StatTile label="Contributors" value={stats.participantCount.toLocaleString()} />
            <StatTile label="Approved papers" value={stats.paperCount.toLocaleString()} />
            <StatTile label="Research branches" value={stats.branchCount.toLocaleString()} />
            <StatTile
              label="Effort logged"
              value={formatEffortFromMinutes(stats.totalEffortMinutes)}
            />
          </dl>
          <p className="mt-4 text-xs text-white/50">
            {/* Every snapshot carries its own `asOf`, so nothing here implies a live number. */}
            Counted {formatIsoInstant(stats.asOf)} · recomputed nightly
          </p>
        </>
      ) : (
        <p className="mt-8 text-sm text-white/60">
          Programme statistics have not been counted yet. They are computed nightly, and this
          program has not been through a run.
        </p>
      )}
    </section>
  );
}

/**
 * One counted fact on the gradient ground.
 *
 * The value is `text-sm font-medium tabular-nums` — byte-identical to the value in
 * `shared/hairline-definition-row.tsx`, so a fact reads the same here and on the light-ground
 * sibling rows. It deliberately does NOT copy that row's `text-[11px]` label: 11px would be a
 * third size in a file whose eyebrow and label are both `text-xs`, which is the Two-Size Rule
 * problem this tile was rewritten to remove.
 *
 * ⚠️ **THE LABEL IS `white/80`, NOT `white/70`, AND THAT IS MEASURED.** The `dl` spans the full
 * gradient, so the rightmost tile sits on `#00696E`, the lightest stop. Against it `white/70` is
 * 4.03:1 and fails AA for normal text; `white/80` is 4.76:1 and passes. It is also why the value
 * is safe at `text-sm`: full white is 6.47:1 there, so shrinking it out of WCAG's "large text"
 * bracket (3:1) into "normal" (4.5:1) crosses no threshold.
 */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-white/80">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
