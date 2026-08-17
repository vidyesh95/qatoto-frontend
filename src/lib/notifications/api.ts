// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. All three routes are `requireAuth` and CALLER-SCOPED IN SQL: there is no
// `?userId=`, no `/notifications/:userId` and no moderator view, because an inbox is the one
// surface where "whose is it" has exactly one answer. Nothing here takes a user id, and nothing
// should ever be added that does.
//
// THE SHAPES ARE READ FROM THE CONTROLLER, not the service. That is the house rule the store
// surface paid eleven bugs to write down — several routes DO pass a service value through
// verbatim, which is exactly what makes the assumption feel safe.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  MarkNotificationsReadResultSchema,
  NotificationPageSchema,
  UnreadNotificationCountSchema,
  type ListNotificationsFilter,
  type MarkNotificationsReadResult,
  type NotificationPage,
  type UnreadNotificationCount,
} from "@/lib/notifications/schemas";

/**
 * `GET /notifications` — keyset-paginated, newest first.
 *
 * `getJson` rather than `getCursorSiblingList`: the token is a sibling of `notifications` INSIDE
 * `data`, not a sibling of `data` on the envelope root.
 */
export function listNotifications(
  filter: ListNotificationsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<NotificationPage>> {
  return getJson(
    `/notifications${buildQueryString({ ...filter })}`,
    NotificationPageSchema,
    options,
  );
}

/** `GET /notifications/unread-count` — the badge, and the only authority for it. */
export function getUnreadNotificationCount(
  options?: RequestOptions,
): Promise<ActionResponse<UnreadNotificationCount>> {
  return getJson("/notifications/unread-count", UnreadNotificationCountSchema, options);
}

/**
 * `POST /notifications/read` — marks everything through one notification read.
 *
 * THROUGH AN ID, NEVER A LIST OF IDS. A reader who has scrolled past a row has seen everything
 * above it, and a list of ids both grows with the backlog and races anything that arrived while
 * the request was in flight.
 *
 * `404 NOTIFICATION_NOT_FOUND` covers someone else's id too — the lookup is caller-scoped, so
 * another person's notification is indistinguishable from one that never existed.
 */
export function markNotificationsReadThrough(
  throughNotificationId: string,
  options?: RequestOptions,
): Promise<ActionResponse<MarkNotificationsReadResult>> {
  return sendJson(
    "/notifications/read",
    "POST",
    { throughNotificationId },
    MarkNotificationsReadResultSchema,
    options,
  );
}
