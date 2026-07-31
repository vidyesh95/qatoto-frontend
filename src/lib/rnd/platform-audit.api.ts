// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`.
//
// STAFF-ONLY, AND ITS REFUSAL IS LOAD-BEARING. This route requires `moderate_content` and
// answers `403` to everyone else, so its SUCCESS is the fact "this viewer is staff" — the
// same direct probe `research-program-page.tsx` uses for the paper moderation surface.
// There is no capability-introspection endpoint to ask instead: `platformRole` is
// deliberately kept off the session, because a staff flag a client can see is a flag a
// client will eventually be trusted about.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import { PlatformAuditPageSchema, type PlatformAuditPage } from "@/lib/rnd/platform-audit.schemas";

/**
 * The platform decision log, newest page first by keyset.
 *
 * `fromSequence` is echoed back from a previous page's `nextSequence` — never constructed
 * client-side. `limit` is capped at 200 server-side.
 */
export function listPlatformAuditTrail(
  filter: {
    readonly eventKind?: string;
    readonly fromSequence?: number;
    readonly limit?: number;
  } = {},
  options?: RequestOptions,
): Promise<ActionResponse<PlatformAuditPage>> {
  return getJson(
    `/admin/audit-trail${buildQueryString({ ...filter })}`,
    PlatformAuditPageSchema,
    options,
  );
}
