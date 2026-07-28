// TRANSPORT: props-only — presentational server component. Fetches nothing; rows
// arrive as props from a parent that read GET …/daily-logs.
import DailyLogCard from "@/components/home/research-and-development/cards/daily-log-card";
import type { DailyLogView } from "@/lib/rnd/daily-logs.schemas";

/**
 * The Daily Logs tab's feed.
 *
 * THE MEMBER FILTER IS DELETED AND THE ISLAND IS GONE WITH IT. It filtered the fetched
 * page client-side, and `GET …/daily-logs` accepts `limit` and nothing else — no author
 * facet exists. Over a capped page that filter lies: a member whose logs fall past the
 * limit renders as "no logs from this member" when they have plenty. A filter the
 * server cannot apply is not a filter, and phase 1 already established that chips are
 * `<Link>`s the backend honours or they do not ship.
 *
 * Each row carries its own author name and avatar, so there is no roster lookup table
 * to thread through and a card never fabricates an author.
 */
export default function DailyLogsFeed({ logs }: { logs: DailyLogView[] }) {
  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <DailyLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}
