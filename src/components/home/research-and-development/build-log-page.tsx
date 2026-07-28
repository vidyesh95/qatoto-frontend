// TRANSPORT: server-fetch — server component. Reads GET /daily-logs (requireAuth,
// member-scoped, keyset) and GET /daily-logs/streak-leaderboard (public), forwarding
// the session cookie through callerRequestOptions(). See §19 for the transport map.
import Link from "next/link";

import BuildLogHero from "@/components/home/research-and-development/sections/build-log-hero";
import GlobalDailyLogFeed from "@/components/home/research-and-development/sections/global-daily-log-feed";
import LogLegend from "@/components/home/research-and-development/sections/log-legend";
import LogStreakLeaderboard from "@/components/home/research-and-development/sections/log-streak-leaderboard";
import RndStatusPanel, {
  RndErrorPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { listDailyLogFeed, listDailyLogStreakLeaderboard } from "@/lib/rnd/daily-logs.api";
import { rowsOrEmpty, toCursorListViewState } from "@/lib/rnd/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const DAILY_LOG_FEED_PAGE_LIMIT = 30;

/**
 * Stage 04 — Build & Daily Logs. The Daily Update Protocol across every project the
 * caller belongs to at once; the per-project Daily Logs tab still answers "where is
 * this one project", and neither is deleted.
 *
 * THE FEED IS MEMBER-SCOPED BY DESIGN, and the page is built around that rather than
 * around it. `GET /daily-logs` is `requireAuth` and its WHERE clause is
 * `projectId IN (caller's active memberships)`, derived in SQL — there is no
 * `?projectIds=` and sending one is a 422. So a signed-out visitor gets the hero, the
 * legend and the PUBLIC leaderboard with an empty feed and a sign-in prompt, never a
 * fabricated one. Logs are somebody's work record; a public feed of them would
 * contradict the privacy boundary the per-project routes already enforce.
 *
 * Two reads, two view states, deliberately: the leaderboard is public and survives the
 * feed's 401 intact.
 */
export default async function BuildLogPage() {
  const requestOptions = await callerRequestOptions();

  const [feedResult, leaderboardResult] = await Promise.all([
    listDailyLogFeed({ limit: DAILY_LOG_FEED_PAGE_LIMIT }, requestOptions),
    listDailyLogStreakLeaderboard(requestOptions),
  ]);

  // The envelope names its array `logs`, so this page is what tells the view-state
  // helper where the rows are — see `toCursorListViewState`.
  const feedState = toCursorListViewState(feedResult, (page) => ({
    rows: page.logs,
    nextCursor: page.nextCursor,
  }));
  // Secondary to the feed, but its own section: losing it costs the table, not the page.
  const streakStandings = rowsOrEmpty(leaderboardResult);

  function renderFeed() {
    switch (feedState.status) {
      case "error":
        return (
          <div className="px-4 lg:px-6">
            {feedState.isSignInRequired ? (
              <RndSignInRequiredPanel message="Daily logs are private to a project's team. Sign in to read the logs of projects you belong to — the explainer, the legend and the streak leaderboard stay public." />
            ) : (
              <RndErrorPanel message="Couldn't load the daily-log feed." />
            )}
          </div>
        );
      case "empty":
        return (
          <div className="px-4 lg:px-6">
            <RndStatusPanel message="No logs yet on the projects you belong to." />
          </div>
        );
      case "ready":
        return <GlobalDailyLogFeed logs={feedState.rows} />;
      default: {
        const exhaustiveCheck: never = feedState;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <BuildLogHero />
      <LogLegend />
      {renderFeed()}
      <LogStreakLeaderboard standings={streakStandings} />
      <section className="mx-4 rounded-2xl bg-[#00696E]/5 p-6 text-center md:p-8 lg:mx-6">
        <h2 className="text-xl font-semibold md:text-2xl">See how a log becomes a slice</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every verified minute mints slices at a locked rate, and the slices decide the cap table.
          The whole ledger is open on each project.
        </p>
        <div className="mt-4 flex justify-center">
          {/* Was a hardcoded deep link to a mock slug, into a route that is still mock.
              Points at the project list until the Proof-of-Effort surface is wired. */}
          <Link
            href="/research-and-development"
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Browse the projects
          </Link>
        </div>
      </section>
    </div>
  );
}
