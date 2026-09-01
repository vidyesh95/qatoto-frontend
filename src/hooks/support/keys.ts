"use client";

// TRANSPORT: client-query — the React Query key factory for support cases.
//
// ONE FACTORY FOR BOTH AUDIENCES, and every key starts with the literal `"support"`. The
// failure this prevents is a mutation invalidating a key nobody registered: a staff reply
// changes the queue AND that case's detail, and only a factory both sides read from can make
// those two spellings agree.
//
// SERVER FILTERS GO IN A KEY; CURSORS NEVER DO. The pages of one filtered list accumulate
// under one entry, so a page token in the key would make every page its own cache line and
// "load more" would refetch from the start.

import type { SupportCaseCategory, SupportCaseState } from "@/lib/support/schemas";

export const supportKeys = {
  all: ["support"] as const,

  /** The caller's own cases. NO USER ID — the session cookie decides who "me" is. */
  myCasesRoot: () => ["support", "my-cases"] as const,
  myCases: (state: SupportCaseState | undefined) =>
    ["support", "my-cases", state ?? "all"] as const,

  /** One case as its OPENER sees it. */
  caseDetail: (caseId: string) => ["support", "case", caseId] as const,

  queueRoot: () => ["support", "queue"] as const,
  queue: (filter: { readonly state?: SupportCaseState; readonly category?: SupportCaseCategory }) =>
    ["support", "queue", filter.state ?? "all", filter.category ?? "all"] as const,

  /**
   * One case as STAFF see it — a different key from `caseDetail`, deliberately.
   *
   * The two projections are not the same object: the staff one names the person who wrote in
   * and the member's own never does. Sharing a key would let one overwrite the other and put
   * an opener's name into a member-facing cache entry.
   */
  queueCaseDetail: (caseId: string) => ["support", "queue", "case", caseId] as const,
};
