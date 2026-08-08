// TRANSPORT: props-only — renders events it is handed, no network.
//
// A vertical list of things that happened, newest last.
//
// IT RENDERS BACKEND EVENTS AND NOTHING ELSE. It does not infer a step from a state, it does not fill in
// a "created" event nobody sent, and it does not mark a future step as pending — because a timeline that
// invents its own rungs is asserting that a thing happened. Order events, shipment events, engagement
// transitions and quote revisions all come with their own append-only history; this renders that history
// and stops.
//
// `isTerminal` styles the last thing that CAN happen, not the last thing that DID. A cancelled shipment's
// terminal event is its cancellation; an in-transit one has no terminal event yet and correctly shows
// none — leaving the reader with an open list, which is the truth.
//
// Semantic tokens because `src/components/commerce/**` renders on both the buyer and studio surfaces.

import { formatIsoInstantLabel } from "@/lib/store/format";

export interface RecordTimelineEntry {
  readonly id: string;
  /** ISO string from the wire. Formatted here, never parsed into a Date at the boundary. */
  readonly occurredAtIso: string;
  readonly title: string;
  readonly detail: string | null;
  readonly isTerminal: boolean;
}

export default function RecordTimeline({
  entries,
  emptyMessage,
}: {
  entries: readonly RecordTimelineEntry[];
  /** What to say when nothing has happened yet. Required, because "nothing yet" and "we lost the history" read the same otherwise. */
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <p className="text-xs leading-4 text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry, entryIndex) => {
        const isLastRendered = entryIndex === entries.length - 1;
        return (
          <li key={entry.id} className="flex gap-3">
            {/* The rail: a filled dot for a terminal event, hollow otherwise, and the connecting line
                stops at the last rendered row so the list does not appear to continue into nothing. */}
            <div className="flex flex-col items-center pt-1">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  entry.isTerminal ? "bg-foreground" : "border border-muted-foreground"
                }`}
              />
              {!isLastRendered && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm leading-5 text-foreground">{entry.title}</p>
              {entry.detail !== null && (
                <p className="text-xs leading-4 text-muted-foreground">{entry.detail}</p>
              )}
              {/* The raw instant, not "3 days ago". A commercial record is cited later, and a relative
                  time cannot be. `relative-time.tsx` exists for feeds, where recency is the point. */}
              <p className="text-[11px] leading-4 text-muted-foreground">
                {formatIsoInstantLabel(entry.occurredAtIso)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
