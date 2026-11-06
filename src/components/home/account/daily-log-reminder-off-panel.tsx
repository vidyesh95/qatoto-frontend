"use client";

import { useTurnOffDailyLogRemindersMutation } from "@/hooks/daily-log-reminder";

/**
 * Turns reminders off from an email link.
 *
 * THE BUTTON IS THE POINT. Mail scanners open every link in a message, so a page that acted on
 * arrival would switch people's reminders off without them ever seeing the email.
 */
export default function DailyLogReminderOffPanel({ token }: { readonly token: string | null }) {
  const turnOffMutation = useTurnOffDailyLogRemindersMutation();

  if (token === null) {
    return <p className="text-sm text-muted-foreground">This link is not valid.</p>;
  }

  switch (turnOffMutation.status) {
    case "success":
      return (
        <output className="block text-sm text-foreground">
          Daily log reminders are off. You can turn them back on from your account menu.
        </output>
      );
    case "idle":
    case "pending":
    case "error":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You will stop getting the evening reminder. Other Qatoto emails, like invitations, are
            not affected.
          </p>
          <button
            type="button"
            disabled={turnOffMutation.isPending}
            onClick={() => turnOffMutation.mutate(token)}
            className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground disabled:opacity-50"
          >
            {turnOffMutation.isPending ? "Turning off…" : "Turn off reminders"}
          </button>
          {turnOffMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              This link did not work. You can turn reminders off from your account menu.
            </p>
          )}
        </div>
      );
    default: {
      const exhaustiveCheck: never = turnOffMutation;
      return exhaustiveCheck;
    }
  }
}
