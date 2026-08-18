"use client";

// TRANSPORT: client-query — React Query over `GET /users/me/watch-time`.

import { useQuery } from "@tanstack/react-query";

import { accountKeys } from "@/hooks/account/keys";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { getViewerWatchTime } from "@/lib/account/watch-time.api";
import { unwrap } from "@/lib/http";

/** The zone this device is in, or `"UTC"` in an environment that cannot say. */
export function resolveDeviceTimeZone(): string {
  const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return resolvedZone.length > 0 ? resolvedZone : "UTC";
}

/**
 * The viewer's own watch time, cut in this device's zone.
 *
 * IT WAITS FOR HYDRATION BEFORE IT FIRES, and that is not a perf tweak. The zone comes from
 * `Intl.DateTimeFormat().resolvedOptions()`, which answers "UTC" on the server and something else
 * in the browser — firing before hydration would either bake the server's zone into the query key
 * or render a value the streamed HTML does not contain, which is exactly what `useIsHydrated`
 * exists to prevent. The cost is one render showing the pending state.
 *
 * `retry: false` — a 401 here is an answer about the session, not a flake.
 */
export function useWatchTimeQuery() {
  const isHydrated = useIsHydrated();
  const timeZone = isHydrated ? resolveDeviceTimeZone() : "UTC";

  return useQuery({
    queryKey: accountKeys.watchTime(timeZone),
    queryFn: async () => unwrap(await getViewerWatchTime(timeZone)),
    enabled: isHydrated,
    retry: false,
  });
}
