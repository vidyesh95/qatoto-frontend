// TRANSPORT: props-only — a schema, no network of its own.
//
// The wire contract for closing an account (GDPR Art. 17).
//
// ONE SHAPE, BECAUSE THERE IS ONE ROUTE. The backend has no cancel endpoint and no
// "read my deletion request", and that is not an oversight to be worked around here:
// signing in is what cancels a scheduled deletion (`databaseHooks.session.create.before`
// in the backend's `src/lib/auth.ts`), so a signed-in caller is never mid-deletion and
// there is no state for a second schema to describe.

import { z } from "zod";

/**
 * What the server scheduled, in the server's words.
 *
 * `scheduledAnonymizationAt` IS THE ONLY DATE THE UI MAY PRINT. The panel also knows the
 * advertised window is 30 days, but a client that renders `now + 30 days` is displaying
 * its own arithmetic as if it were a commitment — and the two disagree the moment the
 * request is a few seconds old, a retry happened, or the constant changes.
 */
export const AccountDeletionRequestSchema = z
  .object({
    requestId: z.string(),
    requestedAt: z.string(),
    scheduledAnonymizationAt: z.string(),
    /** Echoed by the server so the copy and the schedule cannot drift apart. */
    gracePeriodDays: z.number().int().positive(),
  })
  .strip();

export type AccountDeletionRequest = z.infer<typeof AccountDeletionRequestSchema>;
