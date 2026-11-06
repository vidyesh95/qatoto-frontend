"use client";

import Image from "next/image";

import ToggleSwitch from "@/components/ui/toggle-switch";
import {
  useDailyLogReminderQuery,
  useSetDailyLogReminderMutation,
} from "@/hooks/daily-log-reminder";

const REMINDER_SWITCH_ID = "daily-log-reminder-switch";

/**
 * The switch for the evening reminder. It controls only that reminder: invitations, application
 * replies and pay statements are things that happened, and they are not switched off here.
 *
 * Nothing is optimistic. The switch shows what the server stored, so a refused write cannot leave
 * somebody believing they turned off a reminder that still arrives.
 */
export function DailyLogReminderPanel({ onBack }: { readonly onBack: () => void }) {
  const reminderQuery = useDailyLogReminderQuery();
  const setReminderMutation = useSetDailyLogReminderMutation();

  function renderReminderBody() {
    switch (reminderQuery.status) {
      case "pending":
        return <p className="px-4 text-sm text-muted-foreground">Loading…</p>;
      case "error":
        return (
          <p className="px-4 text-sm text-muted-foreground">
            Couldn&apos;t load this setting. Try again in a moment.
          </p>
        );
      case "success":
        return (
          <div className="flex items-center justify-between gap-4 px-4">
            <label htmlFor={REMINDER_SWITCH_ID} className="text-sm font-medium">
              Remind me to log
            </label>
            <ToggleSwitch
              id={REMINDER_SWITCH_ID}
              accessibleName="Remind me to log"
              isChecked={reminderQuery.data.isEnabled}
              onCheckedChange={(isEnabled) => setReminderMutation.mutate(isEnabled)}
            />
          </div>
        );
      default: {
        const exhaustiveCheck: never = reminderQuery;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-border bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Daily log reminders</h2>
      </header>
      <p className="px-4 py-4 text-sm text-muted-foreground">
        If you are on a project and have not logged by the evening, we remind you at about 7 pm your
        time. Only you see it, and it has no effect on your pay or equity.
      </p>
      {renderReminderBody()}
      {setReminderMutation.isError && (
        <p role="alert" className="px-4 pt-3 text-sm text-destructive">
          Couldn&apos;t save that. Try again.
        </p>
      )}
    </div>
  );
}
