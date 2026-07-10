import Image from "next/image";

import type { ImmortalProgramStat } from "@/types/research-and-development";

type ProjectImmortalHeroProps = {
  stats: ImmortalProgramStat[];
};

// Page-opening banner for the moonshot program. Carries the same deep-teal
// gradient identity as project-immortal-banner.tsx (the landing teaser that
// links here) so the two read as one thing.
export default function ProjectImmortalHero({ stats }: ProjectImmortalHeroProps) {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <Image
        src="/icons/diamond_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
        width={24}
        height={24}
        alt=""
      />
      <p className="mt-4 text-xs tracking-widest">MOONSHOT RESEARCH</p>
      <h1 className="mt-1 font-serif text-3xl md:text-5xl">PROJECT IMMORTAL</h1>
      <p className="mt-3 max-w-2xl text-sm text-white/80">
        Qatoto&apos;s open, long-horizon research program into extending healthy human life. Publish
        your findings, argue your ideas in the open, and pick up a branch nobody is working on —
        Qatoto aggregates every paper, marks where research overlaps, highlights what is missing,
        and compensates every contributor for the effort and money they put in.
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((programStat) => (
          // dt precedes dd per the HTML content model; flex-col-reverse puts the
          // value above the label visually without inverting the markup.
          <div key={programStat.id} className="flex flex-col-reverse">
            <dt className="mt-1 text-xs text-white/70">{programStat.statLabel}</dt>
            <dd className="font-serif text-2xl md:text-3xl">{programStat.statValue}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
