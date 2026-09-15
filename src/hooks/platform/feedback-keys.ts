"use client";

// TRANSPORT: client-query — the React Query key factory for site feedback.
//
// ONE FACTORY FOR BOTH AUDIENCES, and every key starts with the literal `"feedback"`. The
// failure this prevents is a mutation invalidating a key nobody registered: triaging a note
// changes the staff queue AND the submitter's own list, and only a factory both sides read from
// can make those two spellings agree.
//
// IT WAS PREDICTED RATHER THAN INVENTED HERE. `hooks/platform/feedback.ts` said, while the
// write was the only thing that existed, that "when the staff queue lands it will bring its own
// key factory rather than borrow one invented here in advance". This is that factory.
//
// SERVER FILTERS GO IN A KEY; CURSORS NEVER DO. The pages of one filtered list accumulate under
// one entry, so a page token in the key would make every page its own cache line and "load
// more" would refetch from the start.

import type { PlatformFeedbackStatus } from "@/lib/platform/feedback.schemas";

export const feedbackKeys = {
  all: ["feedback"] as const,

  /** The caller's own notes. NO USER ID — the session cookie decides who "mine" is. */
  mineRoot: () => ["feedback", "mine"] as const,
  mine: (status: PlatformFeedbackStatus | undefined) =>
    ["feedback", "mine", status ?? "all"] as const,

  queueRoot: () => ["feedback", "queue"] as const,
  queue: (status: PlatformFeedbackStatus | undefined) =>
    ["feedback", "queue", status ?? "all"] as const,
};
