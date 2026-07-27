import Link from "next/link";

// Stage 03 hero for /research-and-development/team-building. Role-first entry
// to equity for skills: this page browses ROLES, /talent browses PEOPLE, so the
// second CTA sends anyone who would rather be found than apply.
export default function TeamBuildingHero() {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <p className="text-xs tracking-widest text-white/80">STAGE 03 · TEAM BUILDING</p>
      <h1 className="mt-2 font-serif text-3xl md:text-5xl">Trade your skills for a stake.</h1>
      <p className="mt-4 max-w-2xl text-sm text-white/85 md:text-base">
        Every open role across every Qatoto project, in one place. Projects post what they need; you
        bring the skill and earn a share of what you help build — measured in verified work, not
        promises.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="#open-roles-grid"
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Browse open roles
        </Link>
        <Link
          href="/research-and-development/talent"
          className="cursor-pointer rounded-full border border-white/70 px-4 py-2 text-sm font-medium text-white"
        >
          Get found instead
        </Link>
      </div>
    </section>
  );
}
