// TRANSPORT: client-query — session-scoped, reads `GET /users/me/watch-time`.
//
// WIRED. One read, one caller (`hooks/account/watch-time.ts`), and it is a `lib` + `hooks` pair
// rather than a `fetch` inside the panel for the same reason `linked-accounts.api.ts` is: the
// schema is the contract and it belongs next to the other account contracts, not inside a
// component that renders bars.
//
// THE TIME ZONE IS A DISPLAY PREFERENCE AND NOTHING ELSE. It decides where a day starts in the
// response; the backend validates it against the runtime's IANA table and consults it for no
// authorization or retention decision (CLAUDE.md — the client's claimed locale is not trusted).

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import { ViewerWatchTimeSchema, type ViewerWatchTime } from "@/lib/account/watch-time.schemas";

/**
 * The signed-in viewer's own watch time. `401` when nobody is signed in — that is a real answer.
 *
 * The query schema is `.strict()`, so an extra key here is a 422 rather than an ignored filter.
 */
export function getViewerWatchTime(
  timeZone: string,
  options?: RequestOptions,
): Promise<ActionResponse<ViewerWatchTime>> {
  return getJson(
    `/users/me/watch-time${buildQueryString({ timeZone })}`,
    ViewerWatchTimeSchema,
    options,
  );
}
