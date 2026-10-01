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
  RESEARCH_POST_SORTS,
  ResearchParticipantRoleSchema,
  type ResearchParticipantRole,
  type ResearchPostSort,
} from "@/lib/rnd/research-programs.schemas";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";

const PAPERS_PAGE_LIMIT = 20;
const POSTS_PAGE_LIMIT = 10;

/** What each discussion order answers, in the reader's words rather than the enum's. */
const RESEARCH_POST_SORT_LABELS: Record<ResearchPostSort, string> = {
  newest: "Newest",
  trending: "Trending",
};

function readResearchPostSort(rawSort: string | undefined): ResearchPostSort {
  return RESEARCH_POST_SORTS.find((sort) => sort === rawSort) ?? "newest";
}
const CONTRIBUTORS_PAGE_LIMIT = 24;

type ProgramBranchesResult = Awaited<ReturnType<typeof listProgramBranches>>;
type ProgramPapersResult = Awaited<ReturnType<typeof listProgramPapers>>;
type ProgramOpportunitiesResult = Awaited<ReturnType<typeof listProgramOpportunities>>;
type ProgramContributorsResult = Awaited<ReturnType<typeof listProgramContributors>>;
type ProgramPostsResult = Awaited<ReturnType<typeof listProgramPosts>>;
type BranchItem = Extract<ProgramBranchesResult, { success: true }>["data"][number];
type ProgramItem = Extract<
  Awaited<ReturnType<typeof getResearchProgram>>,
  { success: true }
>["data"];

function resolveActiveRole(roleFilter?: string): ResearchParticipantRole | null {
  if (roleFilter === undefined) return null;
  const parsedRole = ResearchParticipantRoleSchema.safeParse(roleFilter);
  return parsedRole.success ? parsedRole.data : null;
}

function buildDiscussionSortChips(
  currentSearchParams: RawSearchParams,
  sortKey: "ideasSort" | "papersSort",
  selectedSort: ResearchPostSort,
) {
  return RESEARCH_POST_SORTS.map((sort) => ({
    label: RESEARCH_POST_SORT_LABELS[sort],
    href: buildFilterHref(currentSearchParams, {
      [sortKey]: sort === "newest" ? undefined : sort,
    }),
    isSelected: sort === selectedSort,
  }));
}

function ResearchProgramStatusBanners({
  status,
  reviewerNote,
}: {
  status: string;
  reviewerNote: string | null;
}) {
  if (status === "pending") {
    return (
      <div className="px-4 lg:px-6">
        <p className="rounded-2xl bg-warning-container p-4 text-sm text-warning-container-foreground">
          This programme is awaiting review. It is not listed publicly and cannot take contributions
          yet — including from you.
        </p>
      </div>
    );
  }

  if (status === "rejected" && reviewerNote) {
    return (
      <div className="px-4 lg:px-6">
        <div className="space-y-1 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">This programme was not published.</p>
          <p>{reviewerNote}</p>
        </div>
      </div>
    );
  }

  return null;
}

function ResearchProgramBranchMapSection({
  programSlug,
  branchesResult,
  canClaimBranch,
}: {
  programSlug: string;
  branchesResult: ProgramBranchesResult;
  canClaimBranch: boolean;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Research branch map" />
      {branchesResult.success ? (
        <ResearchBranchMap
          programSlug={programSlug}
          branches={branchesResult.data}
          canClaimBranch={canClaimBranch}
        />
      ) : (
        <div className="px-4 lg:px-6">
          <RndErrorPanel message="Couldn't load the research branches." />
        </div>
      )}
    </section>
  );
}

function ResearchProgramProductsSection({
  opportunitiesResult,
}: {
  opportunitiesResult: ProgramOpportunitiesResult;
}) {
  return (
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
  );
}

function ResearchProgramPapersSection({
  programSlug,
  papersResult,
  branches,
  canUploadPaper,
  canDownload,
}: {
  programSlug: string;
  papersResult: ProgramPapersResult;
  branches: BranchItem[];
  canUploadPaper: boolean;
  canDownload: boolean;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Formal research papers" />
      {papersResult.success ? (
        <ResearchProgramPapers
          programSlug={programSlug}
          papers={papersResult.data.rows}
          branches={branches}
          canUploadPaper={canUploadPaper}
          canDownload={canDownload}
        />
      ) : (
        <div className="px-4 lg:px-6">
          <RndErrorPanel message="Couldn't load the paper library." />
        </div>
      )}
    </section>
  );
}

function ResearchProgramContributorsSection({
  programSlug,
  contributorsResult,
  activeRole,
  canJoin,
  isViewerParticipant,
}: {
  programSlug: string;
  contributorsResult: ProgramContributorsResult;
  activeRole: ResearchParticipantRole | null;
  canJoin: boolean;
  isViewerParticipant: boolean;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Contributors & compensation" />
      {contributorsResult.success ? (
        <ResearchProgramContributors
          programSlug={programSlug}
          contributors={contributorsResult.data.rows}
          activeRole={activeRole}
          canJoin={canJoin}
          isViewerParticipant={isViewerParticipant}
        />
      ) : (
        <div className="px-4 lg:px-6">
          <RndErrorPanel message="Couldn't load the contributor roster." />
        </div>
      )}
    </section>
  );
}

function ResearchProgramDiscussionSection({
  title,
  programSlug,
  track,
  sort,
  sortChips,
  postsResult,
  branches,
  canPost,
  canModerate,
  errorMessage,
}: {
  title: string;
  programSlug: string;
  track: "idea" | "informal_paper";
  sort: ResearchPostSort;
  sortChips: { label: string; href: string; isSelected: boolean }[];
  postsResult: ProgramPostsResult;
  branches: BranchItem[];
  canPost: boolean;
  canModerate: boolean;
  errorMessage: string;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader title={title} />
      {postsResult.success ? (
        <ResearchProgramDiscussion
          programSlug={programSlug}
          track={track}
          sort={sort}
          sortChips={sortChips}
          initialPage={postsResult.data}
          branches={branches}
          canPost={canPost}
          canModerate={canModerate}
        />
      ) : (
        <div className="px-4 lg:px-6">
          <RndErrorPanel message={errorMessage} />
        </div>
      )}
    </section>
  );
}

function ProgramOwnerToolsSection({
  programSlug,
  program,
  canModerate,
  branches,
  opportunities,
}: {
  programSlug: string;
  program: ProgramItem;
  canModerate: boolean;
  branches: BranchItem[];
  opportunities: Extract<ProgramOpportunitiesResult, { success: true }>["data"];
}) {
  if (!program.isViewerCreator && !canModerate) return null;
  return (
    <section className="space-y-4">
      <SectionHeader title="Programme settings" />
      <ProgramOwnerTools
        programSlug={programSlug}
        program={program}
        branches={branches}
        opportunities={opportunities}
      />
    </section>
  );
}

function ProgramModerationQueueSection({
  programSlug,
  canModerate,
  queuedPapers,
}: {
  programSlug: string;
  canModerate: boolean;
  queuedPapers: Extract<ProgramPapersResult, { success: true }>["data"]["rows"];
}) {
  if (!canModerate) return null;
  return (
    <section className="space-y-4">
      <SectionHeader title="Moderation queue" />
      <PaperModerationQueue programSlug={programSlug} queuedPapers={queuedPapers} />
    </section>
  );
}

function ProgramContributorToolsSection({
  programSlug,
  branches,
  isViewerParticipant,
  canContribute,
}: {
  programSlug: string;
  branches: BranchItem[];
  isViewerParticipant: boolean;
  canContribute: boolean;
}) {
  if (!canContribute) return null;
  return (
    <section className="space-y-4">
      <SectionHeader title="Record your contribution" />
      <ProgramContributorTools
        programSlug={programSlug}
        branches={branches}
        isViewerParticipant={isViewerParticipant}
        canCreateBranch={canContribute}
      />
    </section>
  );
}

function resolveProgramViewerState(
  roleFilter: string | undefined,
  ideasSortParam: string | undefined,
  papersSortParam: string | undefined,
) {
  const activeRole = resolveActiveRole(roleFilter);
  const ideasSort = readResearchPostSort(ideasSortParam);
  const papersSort = readResearchPostSort(papersSortParam);

  const currentSearchParams: RawSearchParams = {
    role: activeRole ?? undefined,
    ideasSort: ideasSort === "newest" ? undefined : ideasSort,
    papersSort: papersSort === "newest" ? undefined : papersSort,
  };

  const ideasSortChips = buildDiscussionSortChips(currentSearchParams, "ideasSort", ideasSort);
  const papersSortChips = buildDiscussionSortChips(currentSearchParams, "papersSort", papersSort);

  return { activeRole, ideasSort, papersSort, ideasSortChips, papersSortChips };
}

async function loadProgramOverviewData(
  programSlug: string,
  requestOptions: Awaited<ReturnType<typeof callerRequestOptions>>,
  isSignedIn: boolean,
  activeRole: ResearchParticipantRole | null,
  ideasSort: ResearchPostSort,
  papersSort: ResearchPostSort,
) {
  const moderationQueuePromise = isSignedIn
    ? listProgramModerationQueue(programSlug, { limit: 50 }, requestOptions)
    : Promise.resolve({ success: false as const, error: { code: "401", message: "" } });

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
    listProgramPosts(
      programSlug,
      { track: "idea", sort: ideasSort, limit: POSTS_PAGE_LIMIT },
      requestOptions,
    ),
    listProgramPosts(
      programSlug,
      { track: "informal_paper", sort: papersSort, limit: POSTS_PAGE_LIMIT },
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
    moderationQueuePromise,
  ]);

  const canModerate = moderationQueueResult.success;
  const queuedPapers =
    canModerate && papersResult.success
      ? papersResult.data.rows.filter((paper) => paper.moderationStatus === "queued")
      : [];
  const branches = branchesResult.success ? branchesResult.data : [];
  const stats = statsResult.success ? statsResult.data : null;
  const opportunities = opportunitiesResult.success ? opportunitiesResult.data : [];

  return {
    canModerate,
    queuedPapers,
    branches,
    stats,
    opportunities,
    branchesResult,
    papersResult,
    ideasResult,
    informalPostsResult,
    contributorsResult,
    opportunitiesResult,
  };
}

/**
 * A research program, top to bottom: what it is, the crowd's research map, what it can ship, the
 * two paper tracks, who is building it, and the open discussion.
 */
export default async function ResearchProgramPage({
  programSlug,
  roleFilter,
  ideasSortParam,
  papersSortParam,
}: {
  programSlug: string;
  /** From `?role=`, already narrowed by the route. Filters the roster IN SQL. */
  roleFilter?: string | undefined;
  /** From `?ideasSort=` / `?papersSort=` — one order per discussion section, validated below. */
  ideasSortParam?: string | undefined;
  papersSortParam?: string | undefined;
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
  const { activeRole, ideasSort, papersSort, ideasSortChips, papersSortChips } =
    resolveProgramViewerState(roleFilter, ideasSortParam, papersSortParam);

  const data = await loadProgramOverviewData(
    programSlug,
    requestOptions,
    isSignedIn,
    activeRole,
    ideasSort,
    papersSort,
  );

  const canContribute = program.status === "published" && isSignedIn;

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <ResearchProgramHero program={program} stats={data.stats} />

      <ResearchProgramStatusBanners status={program.status} reviewerNote={program.reviewerNote} />

      <ProgramOwnerToolsSection
        programSlug={programSlug}
        program={program}
        canModerate={data.canModerate}
        branches={data.branches}
        opportunities={data.opportunities}
      />

      <ResearchProgramBranchMapSection
        programSlug={programSlug}
        branchesResult={data.branchesResult}
        canClaimBranch={canContribute}
      />

      <ResearchProgramProductsSection opportunitiesResult={data.opportunitiesResult} />

      <ResearchProgramPapersSection
        programSlug={programSlug}
        papersResult={data.papersResult}
        branches={data.branches}
        canUploadPaper={canContribute}
        canDownload={isSignedIn}
      />

      <ProgramModerationQueueSection
        programSlug={programSlug}
        canModerate={data.canModerate}
        queuedPapers={data.queuedPapers}
      />

      <ResearchProgramDiscussionSection
        title="Informal papers"
        programSlug={programSlug}
        track="informal_paper"
        sort={papersSort}
        sortChips={papersSortChips}
        postsResult={data.informalPostsResult}
        branches={data.branches}
        canPost={canContribute}
        canModerate={data.canModerate}
        errorMessage="Couldn't load the informal papers."
      />

      <ResearchProgramContributorsSection
        programSlug={programSlug}
        contributorsResult={data.contributorsResult}
        activeRole={activeRole}
        canJoin={canContribute}
        isViewerParticipant={program.isViewerParticipant}
      />

      <ProgramContributorToolsSection
        programSlug={programSlug}
        branches={data.branches}
        isViewerParticipant={program.isViewerParticipant}
        canContribute={canContribute}
      />

      <ResearchProgramDiscussionSection
        title="Netizen discussion"
        programSlug={programSlug}
        track="idea"
        sort={ideasSort}
        sortChips={ideasSortChips}
        postsResult={data.ideasResult}
        branches={data.branches}
        canPost={canContribute}
        canModerate={data.canModerate}
        errorMessage="Couldn't load the discussion."
      />
    </div>
  );
}
