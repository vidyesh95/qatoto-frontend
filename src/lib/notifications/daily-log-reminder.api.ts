// TRANSPORT: client-query — called from the account menu, the log composer and the email off page.
//
// Two routes are `requireAuth` and caller-scoped, so neither takes a user id. `/off` needs no
// session because it comes from an email: its signed token can only turn a reminder off.

import { z } from "zod";

import { getJson, sendJson, type ActionResponse } from "@/lib/http";

export const DailyLogReminderSchema = z.object({
  isEnabled: z.boolean(),
  timeZone: z.string().nullable(),
});
export type DailyLogReminder = z.infer<typeof DailyLogReminderSchema>;

const TurnedOffDailyLogReminderSchema = z.object({ isEnabled: z.literal(false) });

/** `GET /daily-log-reminders/me`. */
export function getDailyLogReminder(): Promise<ActionResponse<DailyLogReminder>> {
  return getJson("/daily-log-reminders/me", DailyLogReminderSchema);
}

/** `PUT /daily-log-reminders/me`. An omitted field keeps its stored value. */
export function updateDailyLogReminder(input: {
  readonly isEnabled?: boolean;
  readonly timeZone?: string;
}): Promise<ActionResponse<DailyLogReminder>> {
  return sendJson("/daily-log-reminders/me", "PUT", input, DailyLogReminderSchema);
}

/** `POST /daily-log-reminders/off`. */
export function turnOffDailyLogReminders(
  token: string,
): Promise<ActionResponse<{ isEnabled: false }>> {
  return sendJson("/daily-log-reminders/off", "POST", { token }, TurnedOffDailyLogReminderSchema);
}

/**
 * The zone this browser is in. It decides only when a reminder is sent, never a project's day,
 * which the backend owns because streaks and equity read it.
 */
export function readBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
