// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. Every workshop route is `requireAuth` plus membership, so a server
// component MUST forward the session cookie through `@/lib/server-http`'s
// `callerRequestOptions()` or every call is a 401.

import { getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import { WorkshopSnapshotSchema, type WorkshopSnapshot } from "@/lib/rnd/workshop.schemas";

/**
 * The whole workshop in ONE request — board, files, recent chat and read state.
 *
 * The backend composes it from four concurrent service calls, which is why the page
 * does not fan out to `/workshop/board`, `/workshop/files` and `/workshop/chat`
 * separately: three round trips for a payload the server already assembles.
 *
 * Member-only at role `contributor`. A non-member gets **404, not 403** — lift the
 * result through `toMemberScopedListViewState`-style handling only after the project's
 * public detail read has succeeded, which is what makes "members only" a safe thing to
 * say here.
 */
export function getProjectWorkshop(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopSnapshot>> {
  return getJson(`/research-projects/${projectSlug}/workshop`, WorkshopSnapshotSchema, options);
}
