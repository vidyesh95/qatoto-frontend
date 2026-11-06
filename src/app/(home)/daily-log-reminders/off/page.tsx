import type { Metadata } from "next";
import { Suspense } from "react";

import DailyLogReminderOffPanel from "@/components/home/account/daily-log-reminder-off-panel";
import type { RawSearchParams } from "@/lib/filter-href";
import { readSingleParam } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// A signed token sits in this address, so it must not be indexed or passed on as a referrer.
export const metadata: Metadata = {
  title: "Daily log reminders",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function DailyLogReminderOffBody({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = readSingleParam(resolvedSearchParams, "token") ?? null;
  return <DailyLogReminderOffPanel token={token} />;
}

export default function DailyLogReminderOffPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <div className="mx-auto max-w-md space-y-3 px-4 py-10">
      <h1 className="text-xl font-medium text-foreground">Turn off daily log reminders?</h1>
      <Suspense fallback={null}>
        <DailyLogReminderOffBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
