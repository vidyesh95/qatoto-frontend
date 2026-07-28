// TRANSPORT: props-only — presentational server component. Fetches nothing; the logs
// arrive as a view state from a parent that read GET …/daily-logs.
import DailyLogsFeed from "@/components/home/research-and-development/sections/daily-logs-feed";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import type { DailyLogView } from "@/lib/rnd/daily-logs.schemas";
import type { MemberScopedListViewState } from "@/lib/rnd/view-state";

/**
 * Daily Logs tab framing around the feed.
 *
 * Logs are PRIVATE TO A PROJECT'S MEMBERS and the backend enforces it at role
 * `contributor`, answering 404 rather than 403. Since the visitor already resolved this
 * project through its public detail read, naming membership as the reason is safe here
 * and only here.
 *
 * The Proof-of-Effort link is removed while that route still renders mock data keyed by
 * mock slugs — a real slug reaching it is a 404. It returns with phase 4.
 */
export default function DailyLogsTab({
  dailyLogsState,
}: {
  dailyLogsState: MemberScopedListViewState<DailyLogView>;
}) {
  function renderFeed() {
    switch (dailyLogsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load this project's daily logs." />;
      case "restricted":
        return dailyLogsState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's daily logs." />
        ) : (
          <RndMembersOnlyPanel message="Daily logs are visible to this project's team." />
        );
      case "empty":
        return <RndStatusPanel message="Nobody has logged a day on this project yet." />;
      case "ready":
        return <DailyLogsFeed logs={dailyLogsState.rows} />;
      default: {
        const exhaustiveCheck: never = dailyLogsState;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="text-xs text-muted-foreground">
        Verification is computed by Qatoto from the log and its linked evidence. A state other than
        &ldquo;verified&rdquo; is about the check, not about the person.
      </p>
      <div className="max-w-2xl">{renderFeed()}</div>
    </div>
  );
}
