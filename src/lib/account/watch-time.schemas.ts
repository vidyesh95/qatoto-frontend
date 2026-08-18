// TRANSPORT: props-only — a schema, no network of its own.
//
// Client contract for `GET /users/me/watch-time` (backend HOME_BACKEND_STRUCTURE.md §3.3a).
//
// `null` IS NOT ZERO ON THE TOTALS, and this is the field the whole panel is built around. The
// backend returns `null` — never `0` — for an account with no rows anywhere: zero would mean "we
// watched you watch nothing", which is a claim about the person rather than about the record.
// Anything rendering these must say "nothing recorded yet" (CLAUDE.md — never fabricate a value
// the server returned as null).
//
// `hourHistogram` CARRIES NO `.length(24)` ASSERTION. The backend generates all 24 buckets today,
// but a length refinement turns a backend that one day ships 23 into a panel that renders nothing
// at all — a contract break over a cosmetic difference. The renderer walks 0..23 and treats a
// missing index as absent, which degrades to a gap instead of a dead surface.
//
// WHAT IT CANNOT COUNT: signed-out watching. The beacon writes the hour counter only for a session
// carrying a viewer id, so every surface built on this has to say so — see `watch-time-panel.tsx`.

import { z } from "zod";

/** Integer seconds, or `null` when nothing has ever been recorded for this account. */
const WatchedSecondsSchema = z.number().int().nonnegative().nullable();

export const ViewerWatchTimeSchema = z
  .object({
    totals: z
      .object({
        today: WatchedSecondsSchema,
        thisWeek: WatchedSecondsSchema,
        thisMonth: WatchedSecondsSchema,
        thisYear: WatchedSecondsSchema,
      })
      .strip(),
    /** The last 30 local days, densified — a day with no watching is a real zero here. */
    dailySeries: z.array(
      z
        .object({
          date: z.string(),
          watchedSeconds: z.number().int().nonnegative(),
        })
        .strip(),
    ),
    /** 24 buckets in the viewer's own zone, index = hour, over the last N days. */
    hourHistogram: z.array(z.number().int().nonnegative()),
    /** So the copy can state the hour-detail window without hardcoding 90. */
    hourDetailRetentionDays: z.number().int().positive(),
  })
  .strip();

export type ViewerWatchTime = z.infer<typeof ViewerWatchTimeSchema>;
export type ViewerWatchTimeDay = ViewerWatchTime["dailySeries"][number];
