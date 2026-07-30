// TRANSPORT: server-fetch — the public index plus, for a signed-in visitor, their own submissions
// and (for a moderator) the review queue. The two latter lists are client-query islands.
import Link from "next/link";

import ProgramReviewQueue from "@/components/home/research-and-development/sections/program-review-queue";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import YourResearchPrograms from "@/components/home/research-and-development/sections/your-research-programs";
import { formatIsoInstant } from "@/lib/rnd/format";
import { listResearchPrograms } from "@/lib/rnd/research-programs.api";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";

const PROGRAMS_PAGE_LIMIT = 24;

/**
 * The research-programme index.
 *
 * THIS PAGE IS WHY THE DOMAIN IS GENERIC. Project Immortal used to be a hardcoded route with
 * hand-written data; it is now one row here, and anybody can propose the next one. The index is
 * what makes "and similar programmes" true rather than aspirational.
 *
 * PUBLISHED AND ARCHIVED ONLY, filtered in SQL by the backend. A `pending` programme is deliberately
 * absent — that is the whole review gate — and its creator finds it under "your submissions"
 * instead, where its real status is shown.
 */
export default async function ResearchProgramsIndexPage({
  searchText,
}: {
  searchText?: string | undefined;
}) {
  const [requestOptions, isSignedIn] = await Promise.all([
    callerRequestOptions(),
    hasCallerSession(),
  ]);

  const programsResult = await listResearchPrograms(
    {
      limit: PROGRAMS_PAGE_LIMIT,
      ...(searchText === undefined || searchText.trim() === "" ? {} : { q: searchText.trim() }),
    },
    requestOptions,
  );

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
        <p className="text-xs tracking-widest">OPEN RESEARCH</p>
        <h1 className="mt-1 font-serif text-3xl md:text-5xl">Research programmes</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80">
          Long-horizon, open research anybody can contribute to: propose a branch, publish into the
          paper library, argue in the open, and log the effort you put in. Programmes map where the
          gaps are and where groups are duplicating work.
        </p>
        <Link
          href="/research-and-development/programs/new"
          className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#00393C] transition-colors hover:bg-white/90"
        >
          Propose a programme
        </Link>
      </section>

      {/* A search box that submits — the filter is applied by the backend, not over a page. */}
      <form action="/research-and-development/programs" className="px-4 lg:px-6">
        <label className="flex max-w-xl items-center gap-2">
          <span className="sr-only">Search research programmes</span>
          <input
            type="search"
            name="q"
            defaultValue={searchText ?? ""}
            placeholder="Search programmes"
            className="w-full rounded-full border border-[#CAC4D0]/60 px-4 py-2 text-sm"
          />
          <button
            type="submit"
            className="shrink-0 cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C]"
          >
            Search
          </button>
        </label>
      </form>

      <section className="space-y-4">
        <SectionHeader title={searchText ? `Results for “${searchText}”` : "All programmes"} />
        {!programsResult.success ? (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the research programmes." />
          </div>
        ) : programsResult.data.rows.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground lg:px-6">
            {searchText
              ? "No programmes match that search."
              : "No programmes have been published yet."}
          </p>
        ) : (
          <ul className="grid gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-3">
            {programsResult.data.rows.map((program) => (
              <li key={program.programId}>
                <Link
                  href={`/research-and-development/programs/${program.slug}`}
                  className="flex h-full flex-col gap-2 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4 transition-colors hover:border-[#00696E]"
                >
                  <p className="font-serif text-lg">{program.title}</p>
                  <p className="flex-1 text-sm text-muted-foreground">{program.tagline}</p>
                  <p className="text-xs text-muted-foreground">
                    {program.branchCount} branches · {program.participantCount} contributors
                  </p>
                  {program.publishedAt && (
                    <p className="text-xs text-muted-foreground">
                      Published {formatIsoInstant(program.publishedAt)}
                    </p>
                  )}
                  {program.status === "archived" && (
                    <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[10px]">
                      Archived
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/*
        Both of these are client-query islands rather than server reads, and deliberately: they are
        per-viewer, one of them 403s for most people, and neither should be able to fail the public
        index above it.
      */}
      {isSignedIn && (
        <>
          <section className="space-y-4">
            <SectionHeader title="Your submissions" />
            <YourResearchPrograms />
          </section>

          <section className="space-y-4">
            <SectionHeader title="Awaiting review" />
            <ProgramReviewQueue />
          </section>
        </>
      )}
    </div>
  );
}
