"use client";

// TRANSPORT: client-query — React Query over `@/lib/notifications/api`.
//
// THE BADGE READS `/notifications/unread-count` AND NOTHING ELSE. `GET /notifications` returns an
// `unreadCount` sibling too, and using it would be the obvious saving — one request instead of
// two. It is wrong: that count is the whole unread total, but the page it rides on is the FIRST
// page, so any client that renders the badge from the list is correct only until someone has more
// than one page of notifications and the panel is closed. The dedicated route exists because it
// has its own partial index on `read_at IS NULL`; it is the cheap read, not the extra one.
//
// THE LIST IS NOT INVALIDATED ON MARK-READ, only the count. React Query refetches EVERY loaded
// page of an infinite query on invalidation, so marking read while a reader is three pages deep
// would re-fetch all three and reset them. `readAt` is the only field that changed and the reader
// is looking at the rows as it changes.
//
// THE LIST IS DROPPED FROM THE CACHE WHEN THE PANEL CLOSES, which is what makes the line above
// safe. `useKeysetList` runs `staleTime: Infinity` + `refetchOnMount: false` — correct for a
// server-seeded page that must not discard accumulated pages, and WRONG for a dropdown, where it
// would mean a second open renders the rows from the first one and silently omits everything that
// arrived in between. `useDiscardNotificationListOnUnmount` closes that: every open is a cold
// mount against an empty cache, so it fetches page one, and the stale pages go with it.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationsReadThrough,
} from "@/lib/notifications/api";
import type { NotificationRow } from "@/lib/notifications/schemas";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => ["notifications", "list"] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};

/**
 * The badge count.
 *
 * Returns the `ActionResponse` rather than unwrapping it — the `cart-nav-button.tsx` pattern. A
 * `401` is a value here, not an exception: the caller renders no badge and moves on, which is the
 * same thing it does while the query is pending.
 *
 * `isEnabled` IS THE SIGNED-OUT GATE, and it is a parameter rather than a "just don't render the
 * badge" rule because the bell's accessible name carries the count — so the trigger itself needs
 * the value, and a component boundary cannot be the gate the way it is for the panel below. With
 * `false` React Query issues no request at all, which is the point: a signed-out visitor must not
 * earn a 401 on every page of three route groups.
 */
export function useUnreadNotificationCountQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => getUnreadNotificationCount(),
    enabled: isEnabled,
    staleTime: 60_000,
  });
}

/**
 * The inbox itself, accumulated page by page.
 *
 * MOUNT THIS WITH THE PANEL, NOT WITH THE BELL. `useKeysetList` has no `enabled` switch — it
 * fetches page one on mount — so gating is done by only rendering the component that calls it.
 * That is the same reason `CartNavButton` is a component rather than a hook call inside `Navbar`.
 *
 * `initialPage: null` because there is no server page to seed from: the bell is a dropdown, not a
 * route. Never pass an empty page to mean this — see the banner at the top of `keyset-list.ts`.
 */
export function useNotificationListQuery(): KeysetListResult<NotificationRow> {
  return useKeysetList<NotificationRow>({
    queryKey: notificationKeys.list(),
    initialPage: null,
    fetchPage: (token) =>
      // The cursor is opaque and server-issued; it is never constructed or compared here. The
      // `typeof` guard is how a caller narrows `KeysetToken` to the kind its own read uses.
      listNotifications({ cursor: typeof token === "string" ? token : undefined }).then((result) =>
        toCursorKeysetPage(
          result.success
            ? {
                success: true,
                // The rename from the wire's `notifications` to the hook's `rows` happens once,
                // here, at the point where the domain name stops mattering.
                data: { rows: result.data.notifications, nextCursor: result.data.nextCursor },
              }
            : result,
        ),
      ),
  });
}

/**
 * Discards the accumulated pages when the panel unmounts.
 *
 * `removeQueries` rather than `invalidateQueries`: invalidating a MOUNTED infinite query refetches
 * every page it holds, and invalidating an unmounted one leaves the stale pages sitting in the
 * cache for the next mount to render before the refetch lands. Removing it leaves nothing to
 * render stale, and the next mount does the one fetch it was going to do anyway.
 */
export function useDiscardNotificationListOnUnmount(): void {
  const queryClient = useQueryClient();

  useEffect(
    () => () => {
      queryClient.removeQueries({ queryKey: notificationKeys.list() });
    },
    [queryClient],
  );
}

/**
 * Marks everything through one notification read.
 *
 * NOT OPTIMISTIC. The badge clears when the server says it cleared — an optimistic zero on a
 * request that then 404s leaves a reader believing they have seen something they have not.
 *
 * A failed call is left as a value on the result. There is nothing useful to say to a reader who
 * opened a dropdown, and the badge staying up is the honest outcome.
 */
export function useMarkNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (throughNotificationId: string) =>
      markNotificationsReadThrough(throughNotificationId),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
