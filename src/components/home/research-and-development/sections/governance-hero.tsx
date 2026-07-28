// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Link from "next/link";

// Stage 05 hero for /research-and-development/governance. Public accountability
// across every project: /funding is the investor's view (rounds to back), this
// is everyone's view (what was committed, what is owed, how a disagreement is
// settled).
export default function GovernanceHero() {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <p className="text-xs tracking-widest text-white/80">STAGE 05 · FUNDING &amp; GOVERNANCE</p>
      <h1 className="mt-2 font-serif text-3xl md:text-5xl">
        Every rupee and every share, accounted for.
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-white/85 md:text-base">
        At the end of each month, Qatoto computes what every member is owed — cash and equity — and
        both sides sign off on the result. The numbers below are the public shape of that process:
        how many statements exist, how many a second admin countersigned, and how much has been
        committed to each project.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="#statement-walkthrough"
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Read a statement
        </Link>
        <Link
          href="/research-and-development/funding"
          className="cursor-pointer rounded-full border border-white/70 px-4 py-2 text-sm font-medium text-white"
        >
          See projects raising
        </Link>
      </div>
    </section>
  );
}
