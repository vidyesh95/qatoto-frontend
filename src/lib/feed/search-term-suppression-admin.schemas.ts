// TRANSPORT: props-only — schemas only.
//
// STANDING SEARCH-TERM SUPPRESSIONS, AS THE STAFF LIST READS THEM. Staff-only: nothing under
// `src/components/home` or `src/components/studio` imports this file. The member-facing "Hide"
// control posts through `@/lib/feed/api` and never reads the list.

import { z } from "zod";

export const SuppressedSearchTermSchema = z.object({
  term: z.string(),
  reason: z.string(),
  suppressedAt: z.iso.datetime(),
  /** Null once the moderator who suppressed it has been anonymized; the suppression stands. */
  suppressedBy: z.object({ userId: z.string(), name: z.string() }).nullable(),
});

export type SuppressedSearchTerm = z.infer<typeof SuppressedSearchTermSchema>;

export const LiftedSearchTermSuppressionSchema = z.object({ term: z.string() });
