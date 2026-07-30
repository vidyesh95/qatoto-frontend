// TRANSPORT: props-only — presentational server component. Fetches nothing; the flagship
// programme's slug is a stable, unwritable identity so it is safe as a constant.
import Image from "next/image";
import Link from "next/link";

/**
 * The flagship programme's slug.
 *
 * A HARDCODED SLUG, and defensible: a slug is server-derived and unwritable after creation
 * (§ wire casing), so `project-immortal` cannot move. Reading the index here to find "the
 * flagship" would need a notion of flagship that the backend does not have — and inventing one
 * would be a data model built to serve a banner.
 */
const FLAGSHIP_PROGRAM_SLUG = "project-immortal";

/**
 * Full-width banner on the R&D landing page, linking to the flagship research programme.
 *
 * Deliberately distinct styling (deep teal gradient) from the rest of the landing so a programme
 * reads as its own thing rather than another project card — and it matches
 * `research-program-hero.tsx`, which is the page it leads to, so the two read as one.
 *
 * TWO LINKS NOW, because programmes are a plural surface: the flagship, and the index where
 * anybody can find the others or propose one. That second link is what makes the generic domain
 * discoverable at all — the sidebar deliberately stays at five R&D items and does not carry it.
 */
export default function ResearchProgramBanner() {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <Image
        src="/icons/diamond_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
        width={24}
        height={24}
        alt=""
      />
      <p className="mt-4 text-xs tracking-widest">OPEN RESEARCH PROGRAMME</p>
      <h2 className="mt-1 font-serif text-2xl md:text-4xl">PROJECT IMMORTAL</h2>
      <p className="mt-3 max-w-xl text-sm text-white/80">
        Qatoto&apos;s open, long-horizon research programme into extending healthy human life.
        Anybody can claim a branch, publish a paper, or argue an idea.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/research-and-development/programs/${FLAGSHIP_PROGRAM_SLUG}`}
          className="inline-block cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Explore Project Immortal
        </Link>
        <Link
          href="/research-and-development/programs"
          className="inline-block cursor-pointer rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          All research programmes
        </Link>
      </div>
    </section>
  );
}
