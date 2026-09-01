// TRANSPORT: server-fetch — server component. Reads GET /research-projects,
// GET /discovery/problem-clusters, GET /discovery/market-insights and GET /open-roles
// via @/lib/rnd/*.api, with the session cookie forwarded by callerRequestOptions().
// All four are public (attachOptionalUser). No React Query here.
import Link from "next/link";

import MarketInsightsRail from "@/components/home/research-and-development/rails/market-insights-rail";
import OpenRolesRail from "@/components/home/research-and-development/rails/open-roles-rail";
import ProjectsRail from "@/components/home/research-and-development/rails/projects-rail";
import LifecycleRolesStrip from "@/components/home/research-and-development/sections/lifecycle-roles-strip";
import PipelineHero from "@/components/home/research-and-development/sections/pipeline-hero";
import PipelineStagesStrip from "@/components/home/research-and-development/sections/pipeline-stages-strip";
import ProblemMapPreview from "@/components/home/research-and-development/sections/problem-map-preview";
import ResearchProgramBanner from "@/components/home/research-and-development/sections/research-program-banner";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import { listOpenRoles } from "@/lib/rnd/catalog.api";
import { listMarketInsights, listProblemClusters } from "@/lib/rnd/discovery.api";
import { listResearchProjects } from "@/lib/rnd/projects.api";
import { toListViewState, type ListViewState } from "@/lib/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const FEATURED_PROJECTS_LIMIT = 12;
const TOP_GAPS_LIMIT = 4;
const FEATURED_INSIGHTS_LIMIT = 5;
const FEATURED_OPEN_ROLES_LIMIT = 12;

/**
 * R&D landing page body — the pipeline story top to bottom (§4 of
 * R_AND_D_STRUCTURE.md): hero, stage strip, lifecycle roles, featured projects,
 * problem-map teaser, market insights, open roles, moonshot banner, bottom CTA.
 *
 * FOUR CONCURRENT READS, one per rail. They share no data, so `Promise.all` keeps the
 * page's time to first byte at the slowest single read rather than the sum of four.
 * Each rail owns its own view state: one dead endpoint dims one rail and leaves the
 * rest of the pipeline story intact.
 *
 * The server does the ranking. `?sort=opportunity` on the cluster read is what
 * "top reported gaps" means — the old code pulled every mock report and sorted client
 * side, which cannot work against a paginated feed: sorting one fetched page ranks
 * that page, not the data.
 */
export default async function ResearchAndDevelopmentPage() {
  const requestOptions = await callerRequestOptions();

  const [projectsResult, topGapsResult, insightsResult, openRolesResult] = await Promise.all([
    listResearchProjects({ limit: FEATURED_PROJECTS_LIMIT }, requestOptions),
    listProblemClusters({ sort: "opportunity", limit: TOP_GAPS_LIMIT }, requestOptions),
    listMarketInsights({ limit: FEATURED_INSIGHTS_LIMIT }, requestOptions),
    listOpenRoles({ limit: FEATURED_OPEN_ROLES_LIMIT }, requestOptions),
  ]);

  const projectsState = toListViewState(projectsResult);
  const topGapsState = toListViewState(topGapsResult);
  const insightsState = toListViewState(insightsResult);
  const openRolesState = toListViewState(openRolesResult);

  return (
    <div className="space-y-10 pt-4 pb-4 lg:space-y-14 lg:pt-6 lg:pb-6">
      <PipelineHero />
      <PipelineStagesStrip />
      <LifecycleRolesStrip />

      {projectsState.status === "ready" ? (
        <ProjectsRail projects={projectsState.rows} />
      ) : (
        <RailFallback
          anchorId="featured-projects"
          title="Featured projects"
          state={projectsState}
          emptyMessage="No published projects yet."
          emptyAction={
            <EmptyRailActionLink href="/research-and-development/new" label="Post your idea" />
          }
          errorMessage="Couldn't load featured projects."
        />
      )}

      {topGapsState.status === "ready" ? (
        <ProblemMapPreview clusters={topGapsState.rows} />
      ) : (
        <RailFallback
          title="Top reported gaps"
          state={topGapsState}
          emptyMessage="No problems have been clustered yet."
          emptyAction={
            <EmptyRailActionLink
              href="/research-and-development/problem-map"
              label="Open problem map"
            />
          }
          errorMessage="Couldn't load the problem map."
        />
      )}

      {insightsState.status === "ready" ? (
        <MarketInsightsRail insights={insightsState.rows} />
      ) : (
        <RailFallback
          title="Market insights"
          state={insightsState}
          emptyMessage="No market insights published yet."
          emptyAction={
            <EmptyRailActionLink
              href="/research-and-development/knowledge-hub"
              label="Open knowledge hub"
            />
          }
          errorMessage="Couldn't load market insights."
        />
      )}

      {openRolesState.status === "ready" ? (
        <OpenRolesRail roles={openRolesState.rows} />
      ) : (
        <RailFallback
          anchorId="open-roles"
          title="Join a team"
          state={openRolesState}
          emptyMessage="No open roles right now."
          emptyAction={
            <EmptyRailActionLink
              href="/research-and-development/projects"
              label="Browse projects"
            />
          }
          errorMessage="Couldn't load open roles."
        />
      )}

      <ResearchProgramBanner />
      <section className="mx-4 rounded-2xl bg-[#00696E]/5 p-6 text-center md:p-8 lg:mx-6">
        <h2 className="font-serif text-2xl md:text-3xl">Have an idea the world needs?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Post it and Qatoto lines up the demand data, teammates, and backers to build it.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            href="/research-and-development/new"
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Post your idea
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * The empty / error stand-in for one rail, keeping its heading and its anchor so the
 * stage strip's deep links still land somewhere even when a read failed.
 *
 * Takes the non-`ready` states only — a `ready` rail renders its real component — and
 * still switches exhaustively, so `ready` reaching here is a compile error rather than
 * a blank section.
 */
function RailFallback({
  anchorId,
  title,
  state,
  emptyMessage,
  emptyAction,
  errorMessage,
}: {
  anchorId?: string;
  title: string;
  state: Exclude<ListViewState<unknown>, { status: "ready" }>;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  errorMessage: string;
}) {
  return (
    <section id={anchorId} className="scroll-mt-20 space-y-1">
      <SectionHeader title={title} />
      <div className="px-4 lg:px-6">{renderFallbackBody()}</div>
    </section>
  );

  function renderFallbackBody() {
    switch (state.status) {
      case "error":
        return <RndErrorPanel message={errorMessage} />;
      case "empty":
        return <RndStatusPanel message={emptyMessage} action={emptyAction} />;
      default: {
        const exhaustiveCheck: never = state;
        return exhaustiveCheck;
      }
    }
  }
}

// The pill an empty rail offers as its next step — an empty section is an
// invitation to act, not a dead end. Error branches deliberately get no pill:
// a failed read is an outage report, and a cheerful CTA under it would
// misreport the platform's state.
function EmptyRailActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-block cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
    >
      {label}
    </Link>
  );
}
