// TRANSPORT: server-fetch — a server component with seven client-query islands nested inside it.
// Reads GET /research-programs/:slug plus its stats, branches, papers, both post tracks,
// contributors and product opportunities. See docs/R_AND_D_STRUCTURE.md §19 for the transport map.
import { notFound } from "next/navigation";

import PaperModerationQueue from "@/components/home/research-and-development/sections/paper-moderation-queue";
import ProgramContributorTools from "@/components/home/research-and-development/sections/program-contributor-tools";
import ProgramOwnerTools from "@/components/home/research-and-development/sections/program-owner-tools";
import ResearchBranchMap from "@/components/home/research-and-development/sections/research-branch-map";
import ResearchProgramContributors from "@/components/home/research-and-development/sections/research-program-contributors";
import ResearchProgramDiscussion from "@/components/home/research-and-development/sections/research-program-discussion";
import ResearchProgramHero from "@/components/home/research-and-development/sections/research-program-hero";
import ResearchProgramProducts from "@/components/home/research-and-development/sections/research-program-products";
import ResearchProgramPapers from "@/components/home/research-and-development/sections/research-program-papers";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import {
  getResearchProgram,
  listProgramModerationQueue,
  getResearchProgramStats,
  listProgramBranches,
  listProgramContributors,
  listProgramOpportunities,
  listProgramPapers,
  listProgramPosts,
} from "@/lib/rnd/research-programs.api";
import {
  ResearchParticipantRoleSchema,
  type ResearchParticipantRole,
} from "@/lib/rnd/research-programs.schemas";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";

const PAPERS_PAGE_LIMIT = 20;
const POSTS_PAGE_LIMIT = 10;
const CONTRIBUTORS_PAGE_LIMIT = 24;

/**
 * A research program, top to bottom: what it is, the crowd's research map, what it can ship, the
 * two paper tracks, who is building it, and the open discussion.
 *
 * THE DETAIL READ COMES FIRST AND ALONE, because everything else needs the program to exist and
 * because its 404 is the one that decides the page. A `pending` or `rejected` program is 404 to
 * everyone but its creator and staff, so `notFound()` here leaks nothing about which slugs have
 * been submitted.
 *
 * THE REST FAN OUT CONCURRENTLY. Six reads, one round trip's worth of wall clock. Each is lifted
 * independently: a failed branch read must not blank the discussion, so every section renders
 * either its data or its own empty state, and the page as a whole survives one endpoint being
 * unhappy.
 *
 * READS ARE PUBLIC BUT THE SESSION STILL TRAVELS. A published program is readable signed out, and
 * `callerRequestOptions()` is what fills in `isClaimedByViewer`, `isReactedByViewer` and
 * `isUploadedByViewer` — per-viewer facts that come back false for an anonymous caller. Forwarding
 * the cookie is therefore not about authorization here; it is about the page being about you.
 *
 * WHAT IS NOT FABRICATED. `stats` is `null` when the nightly job has never run, and the hero says
 * so rather than showing zeroes. Every count on the page is a number the backend returned.
 */
export default async function ResearchProgramPage({
  programSlug,
  roleFilter,
}: {
  programSlug: string;
  /** From `?role=`, already narrowed by the route. Filters the roster IN SQL. */
  roleFilter?: string | undefined;
}) {
  const [requestOptions, isSignedIn] = await Promise.all([
    callerRequestOptions(),
    hasCallerSession(),
  ]);
  const programResult = await getResearchProgram(programSlug, requestOptions);

  if (!programResult.success) {
    if (programResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-6 lg:px-6">
        <RndErrorPanel message="Couldn't load this research programme." />
      </div>
    );
  }

  const program = programResult.data;

  // A `?role=` that is not a real role is dropped rather than 422'd: the backend's query schema is
  // `.strict()`, so passing it through would fail the whole roster read for a typo in a URL.
  const parsedRole =
    roleFilter === undefined ? null : ResearchParticipantRoleSchema.safeParse(roleFilter);
  const activeRole: ResearchParticipantRole | null =
    parsedRole !== null && parsedRole.success ? parsedRole.data : null;

  const [
    statsResult,
    branchesResult,
    papersResult,
    ideasResult,
    informalPostsResult,
    contributorsResult,
    opportunitiesResult,
    moderationQueueResult,
  ] = await Promise.all([
    getResearchProgramStats(programSlug, requestOptions),
    listProgramBranches(programSlug, requestOptions),
    listProgramPapers(programSlug, { limit: PAPERS_PAGE_LIMIT }, requestOptions),
    listProgramPosts(programSlug, { track: "idea", limit: POSTS_PAGE_LIMIT }, requestOptions),
    listProgramPosts(
      programSlug,
      { track: "informal_paper", limit: POSTS_PAGE_LIMIT },
      requestOptions,
    ),
    listProgramContributors(
      programSlug,
      {
        ...(activeRole === null ? {} : { role: activeRole }),
        limit: CONTRIBUTORS_PAGE_LIMIT,
      },
      requestOptions,
    ),
    listProgramOpportunities(programSlug, requestOptions),
    /**
     * THE STAFF PROBE, and it is a direct one.
     *
     * This route requires `moderate_content` and answers 403 to everyone else, so its SUCCESS is
     * the fact "this viewer is a moderator" — there is nothing to infer. An earlier version of
     * this page guessed from whether somebody else's queued paper was visible, which was both
     * indirect and wrong: a moderator on a program with an empty queue would never have been
     * offered the moderation surface at all.
     *
     * Signed out it is skipped entirely rather than fired to collect a 401.
     */
    isSignedIn
      ? listProgramModerationQueue(programSlug, { limit: 50 }, requestOptions)
      : Promise.resolve({ success: false as const, error: { code: "401", message: "" } }),
  ]);

  const isPublished = program.status === "published";
  // A signed-out reader must not be offered a control that cannot work. The backend refuses
  // regardless — this only decides what the page puts on screen.
  const canContribute = isPublished && isSignedIn;

  const canModerate = moderationQueueResult.success;
  // Queued papers are visible only to their uploader and to staff, so for a moderator this is the
  // real review queue rather than a guess at one.
  const queuedPapers =
    canModerate && papersResult.success
      ? papersResult.data.rows.filter((paper) => paper.moderationStatus === "queued")
      : [];

  const branches = branchesResult.success ? branchesResult.data : [];

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <ResearchProgramHero
        program={program}
        stats={statsResult.success ? statsResult.data : null}
      />

      {program.status === "pending" && (
        <div className="px-4 lg:px-6">
          {/*
            Only its creator and staff can see this at all, so it says what is actually happening
            rather than softening it — the program is invisible on the index and closed to
            contributions until a moderator publishes it.
          */}
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            This programme is awaiting review. It is not listed publicly and cannot take
            contributions yet — including from you.
          </p>
        </div>
      )}

      {program.status === "rejected" && program.reviewerNote && (
        <div className="px-4 lg:px-6">
          <div className="space-y-1 rounded-2xl bg-red-50 p-4 text-sm text-red-900">
            <p className="font-medium">This programme was not published.</p>
            <p>{program.reviewerNote}</p>
          </div>
        </div>
      )}

      {(program.isViewerCreator || canModerate) && (
        <section className="space-y-4">
          <SectionHeader title="Programme settings" />
          <ProgramOwnerTools
            programSlug={programSlug}
            program={program}
            branches={branches}
            opportunities={opportunitiesResult.success ? opportunitiesResult.data : []}
          />
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="Research branch map" />
        {branchesResult.success ? (
          <ResearchBranchMap
            programSlug={programSlug}
            branches={branchesResult.data}
            canClaimBranch={canContribute}
          />
        ) : (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the research branches." />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader title="Products this research can unlock" />
        {opportunitiesResult.success ? (
          <ResearchProgramProducts opportunities={opportunitiesResult.data} />
        ) : (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the product opportunities." />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader title="Formal research papers" />
        {papersResult.success ? (
          <ResearchProgramPapers
            programSlug={programSlug}
            papers={papersResult.data.rows}
            branches={branches}
            canUploadPaper={canContribute}
            canDownload={isSignedIn}
          />
        ) : (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the paper library." />
          </div>
        )}
      </section>

      {canModerate && (
        <section className="space-y-4">
          <SectionHeader title="Moderation queue" />
          <PaperModerationQueue programSlug={programSlug} queuedPapers={queuedPapers} />
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="Informal papers" />
        {informalPostsResult.success ? (
          <ResearchProgramDiscussion
            programSlug={programSlug}
            track="informal_paper"
            posts={informalPostsResult.data.rows}
            branches={branches}
            canPost={canContribute}
            canModerate={canModerate}
          />
        ) : (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the informal papers." />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader title="Contributors & compensation" />
        {contributorsResult.success ? (
          <ResearchProgramContributors
            programSlug={programSlug}
            contributors={contributorsResult.data.rows}
            activeRole={activeRole}
            canJoin={canContribute}
            isViewerParticipant={program.isViewerParticipant}
          />
        ) : (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the contributor roster." />
          </div>
        )}
      </section>

      {canContribute && (
        <section className="space-y-4">
          <SectionHeader title="Record your contribution" />
          <ProgramContributorTools
            programSlug={programSlug}
            branches={branches}
            isViewerParticipant={program.isViewerParticipant}
            canCreateBranch={canContribute}
          />
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="Netizen discussion" />
        {ideasResult.success ? (
          <ResearchProgramDiscussion
            programSlug={programSlug}
            track="idea"
            posts={ideasResult.data.rows}
            branches={branches}
            canPost={canContribute}
            canModerate={canModerate}
          />
        ) : (
          <div className="px-4 lg:px-6">
            <RndErrorPanel message="Couldn't load the discussion." />
          </div>
        )}
      </section>
    </div>
  );
}
