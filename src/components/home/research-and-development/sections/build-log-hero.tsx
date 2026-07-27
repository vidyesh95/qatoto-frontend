import Link from "next/link";

// Stage 04 hero for /research-and-development/build-log. States up front what
// verification does and does not decide, because the feed below is the most
// visible place someone could mistake a flag for a pay cut.
export default function BuildLogHero() {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <p className="text-xs tracking-widest text-white/80">STAGE 04 · BUILD &amp; DAILY LOGS</p>
      <h1 className="mt-2 font-serif text-3xl md:text-5xl">Effort becomes proof.</h1>
      <p className="mt-4 max-w-2xl text-sm text-white/85 md:text-base">
        Every working day, each contributor files one log: what they did, what it produced, and what
        got in the way. An AI pass reads the log and tags it — progress, velocity, blockers,
        suggestions — and verification checks the claim against what the work left behind.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-white/70">
        Verification decides how much <span className="font-medium text-white">equity</span> an hour
        mints. It never decides whether you get paid: a flagged claim annotates a line and changes
        no cash figure.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="#global-daily-log-feed"
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Read the feed
        </Link>
        <Link
          href="/research-and-development/governance"
          className="cursor-pointer rounded-full border border-white/70 px-4 py-2 text-sm font-medium text-white"
        >
          How it turns into pay
        </Link>
      </div>
    </section>
  );
}
