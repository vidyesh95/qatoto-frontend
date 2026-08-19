// TRANSPORT: client-query — session-scoped, `POST /users/me/deletion-request`.
//
// BROWSER ONLY, and not merely by convention: this call destroys every session row for the
// caller, INCLUDING the one that sent it. There is no server-render in which that means
// anything, and `callerRequestOptions()` must never be pointed at it.
//
// ONE FUNCTION. No cancel, no read — see `account-deletion.schemas.ts` for why the backend
// has neither.

import { sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  AccountDeletionRequestSchema,
  type AccountDeletionRequest,
} from "@/lib/account/account-deletion.schemas";

/**
 * Deactivates the caller's account and schedules its erasure 30 days out.
 *
 * NO BODY. The subject is the session and the grace period is the server's; there is
 * nothing to send that the backend would not have to overrule. The type-to-confirm the
 * panel demands is friction for the human, never a check — the server would be wrong to
 * trust it and does not ask for it.
 *
 * ERRORS WORTH RENDERING RATHER THAN RETRYING:
 *   - `403` — a staff account. The message names who can close it; show that, not "try
 *     again", which is advice that cannot work.
 *   - `409` — already scheduled. The account is deactivated either way, so this is
 *     information, not a failure to recover from.
 */
export function requestAccountDeletion(
  options?: RequestOptions,
): Promise<ActionResponse<AccountDeletionRequest>> {
  return sendJson(
    "/users/me/deletion-request",
    "POST",
    undefined,
    AccountDeletionRequestSchema,
    options,
  );
}
