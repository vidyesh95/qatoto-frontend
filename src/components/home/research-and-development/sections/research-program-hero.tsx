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
              dt precedes dd per the HTML content model; flex-col-reverse puts the value above
              the label visually without inverting the markup.

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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-xs text-white/70">{label}</dt>
      <dd className="font-serif text-2xl md:text-3xl">{value}</dd>
    </div>
  );
}
