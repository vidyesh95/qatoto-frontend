// TRANSPORT: client-query — session-scoped, reads `GET /users/me/linked-accounts`.
//
// WIRED. The one read the account surface shares: the Settings list and the "Your account" detail
// panel both need it for the "Connected" chips, the Password row needs it to decide whether the
// visitor is SETTING a password or CHANGING one, and each provider panel needs the address that
// provider is linked as.
//
// It is the only `/users/me/*` read with more than one caller, which is why it is the only one
// hoisted into a `lib` + `hooks` pair. The writes stay inside their panels: each is a single
// button's worth of work, several go through the Better Auth SDK rather than our own transport,
// and a wrapper with one caller is unverified code (CLAUDE.md).

import { getJson, type ActionResponse } from "@/lib/http";
import { LinkedAccountListSchema, type LinkedAccount } from "@/lib/account/linked-accounts.schemas";

/** Every provider row on the signed-in user. 401 when nobody is signed in — that is a real answer. */
export function listLinkedAccounts(): Promise<ActionResponse<LinkedAccount[]>> {
  return getJson("/users/me/linked-accounts", LinkedAccountListSchema);
}
