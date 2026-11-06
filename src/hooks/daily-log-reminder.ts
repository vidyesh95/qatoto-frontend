"use client";

// TRANSPORT: client-query — React Query over `@/lib/notifications/daily-log-reminder.api`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrap } from "@/lib/http";
import {
  getDailyLogReminder,
  readBrowserTimeZone,
  turnOffDailyLogReminders,
  updateDailyLogReminder,
} from "@/lib/notifications/daily-log-reminder.api";

const DAILY_LOG_REMINDER_QUERY_KEY = ["daily-log-reminder"] as const;

export function useDailyLogReminderQuery() {
  return useQuery({
    queryKey: DAILY_LOG_REMINDER_QUERY_KEY,
    queryFn: async () => unwrap(await getDailyLogReminder()),
  });
}

/** The switch sends the browser's zone too, so turning reminders on also sets when they arrive. */
export function useSetDailyLogReminderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isEnabled: boolean) =>
      unwrap(await updateDailyLogReminder({ isEnabled, timeZone: readBrowserTimeZone() })),
    onSuccess: (updatedReminder) => {
      queryClient.setQueryData(DAILY_LOG_REMINDER_QUERY_KEY, updatedReminder);
    },
  });
}

/** For the page an email's off link opens. It needs no session, only the signed token. */
export function useTurnOffDailyLogRemindersMutation() {
  return useMutation({
    mutationFn: async (token: string) => unwrap(await turnOffDailyLogReminders(token)),
  });
}
