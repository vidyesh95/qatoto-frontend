// TRANSPORT: client-query — `/assistant/admin/cloud-access`, behind `grant_ai_assistant_cloud`.
//
// THE STAFF HALF OF PREMIUM AI, in its own file so a member surface cannot import an admin route
// by autocomplete (the `admin-feedback.api.ts` split). Every route refuses a caller without the
// capability below with a 403 that names it.
//
// PREMIUM AI IS STAFF-GRANTED, NOT BOUGHT. There is no billing in this codebase; an admin turns it
// on per account here, and the account's assistant may then answer through Google Gemini on
// Qatoto's key. Everyone else uses the on-device model in their own browser, or has no chat.

import {
  buildQueryString,
  getCursorSiblingList,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CloudAccessGrantSchema,
  GrantCloudAccessResultSchema,
  RevokeCloudAccessResultSchema,
  type CloudAccessGrant,
} from "@/lib/assistant/cloud-access-admin.schemas";

/** The capability that opens this page, in ONE place (the backend owns the vocabulary). */
export const CLOUD_ACCESS_ADMIN_CAPABILITY = "grant_ai_assistant_cloud";

/** `GET /assistant/admin/cloud-access` — active grants, newest first. */
export function listCloudAccessGrants(
  cursor: string | null,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: CloudAccessGrant[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    `/assistant/admin/cloud-access${buildQueryString({ cursor: cursor ?? undefined })}`,
    CloudAccessGrantSchema,
    options,
  );
}

/** `POST /assistant/admin/cloud-access` — grant by exact email. 404 unknown, 409 already active. */
export function grantCloudAccess(
  input: { readonly email: string; readonly note: string | null },
  options?: RequestOptions,
): Promise<ActionResponse<{ userId: string; grantedAt: string }>> {
  return sendJson(
    "/assistant/admin/cloud-access",
    "POST",
    input,
    GrantCloudAccessResultSchema,
    options,
  );
}

/** `POST /assistant/admin/cloud-access/:userId/revocation` — the row stays as history. */
export function revokeCloudAccess(
  userId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ revokedAt: string }>> {
  return sendJson(
    `/assistant/admin/cloud-access/${encodeURIComponent(userId)}/revocation`,
    "POST",
    undefined,
    RevokeCloudAccessResultSchema,
    options,
  );
}
